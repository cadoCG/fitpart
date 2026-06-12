-- fit_feedback-Loop (Briefing 8 + Phase 2): Jeder Download erzeugt ein `parts`-
-- Protokoll; ~48 h später fragt die App (und n8n per Mail) "Hat's gepasst?".
-- Aggregiert entsteht daraus der Datensatz "welche Toleranz funktioniert real
-- auf welchem Drucker/Material" – der strategische Moat.
--
-- Zugriffsmodell:
--   - INSERT beim Download: anon (user_id NULL) und authenticated (eigene id),
--     wie part_requests.
--   - Feedback läuft NIE über Direkt-UPDATE, sondern über die SECURITY-
--     DEFINER-Funktion submit_fit_feedback(token, …). Der feedback_token ist
--     eine unguessbare Capability – damit funktioniert der Mail-Link auch ohne
--     Login und ohne dass anon UPDATE-Rechte auf der Tabelle braucht.
--   - Die 48-h-Mail-Kandidaten liest n8n über die View feedback_due
--     (ausschliesslich service_role; enthält E-Mail aus auth.users).
--
-- Eiserne Regel 5 (CLAUDE.md): RLS auf der Tabelle, Least-Privilege-Grants.

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  archetype text not null check (char_length(archetype) <= 40),
  params jsonb not null,
  -- Snapshot des angewandten Toleranz-Profils (Offsets) – DAS Lernsignal,
  -- zusammen mit dem späteren Verdict.
  tolerance_profile jsonb,
  printer_profile_id uuid references public.printer_profiles (id) on delete set null,
  format text not null check (format in ('stl', '3mf', 'step')),
  status text not null default 'generated'
    check (status in ('generated', 'fits', 'too_tight', 'too_loose', 'not_printed')),
  -- {verdict, offset_hint_mm?, comment?, submitted_at}
  fit_feedback jsonb,
  -- Capability für den anonymen Feedback-Link (/feedback/<token>).
  feedback_token uuid not null unique default gen_random_uuid(),
  -- Von n8n gesetzt, sobald die 48-h-Mail raus ist (kein Doppelversand).
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.parts is
  'Generierte Teile (ein Eintrag pro Download) + fit_feedback-Lernsignal.';
comment on column public.parts.fit_feedback is
  '{verdict: fits|too_tight|too_loose|not_printed, offset_hint_mm?, comment?, submitted_at}';

-- "Meine Teile" eines Users, neueste zuerst.
create index parts_user_created on public.parts (user_id, created_at desc);
-- Fällige Feedback-Kandidaten (View unten) – partial, bleibt klein.
create index parts_feedback_due
  on public.parts (created_at)
  where status = 'generated' and reminder_sent_at is null;

alter table public.parts enable row level security;

-- Angemeldete sehen ihre eigenen Teile (künftige "Meine Teile"-Ansicht).
create policy "Eigene Teile lesen"
  on public.parts for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Least Privilege: kein direktes INSERT/UPDATE/DELETE über die Data API.
-- Anlegen läuft über record_part() (returnt id+token, was ein direktes
-- INSERT…RETURNING für anon mangels SELECT-Recht nicht könnte), Feedback über
-- submit_fit_feedback().
revoke all on table public.parts from anon;
revoke all on table public.parts from authenticated;

grant select on table public.parts to authenticated;

-- Download protokollieren. user_id kommt aus auth.uid() – anon ⇒ NULL.
create or replace function public.record_part(
  p_archetype text,
  p_params jsonb,
  p_tolerance jsonb,
  p_format text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_token uuid;
begin
  if p_format not in ('stl', '3mf', 'step') then
    raise exception 'Ungültiges Format: %', p_format;
  end if;
  if p_archetype is null or char_length(p_archetype) not between 1 and 40 then
    raise exception 'Ungültiger Archetyp';
  end if;
  if p_params is null or pg_column_size(p_params) > 8192 then
    raise exception 'Ungültige Params';
  end if;

  insert into public.parts (user_id, archetype, params, tolerance_profile, format)
  values ((select auth.uid()), p_archetype, p_params, p_tolerance, p_format)
  returning id, feedback_token into v_id, v_token;

  return jsonb_build_object('id', v_id, 'feedback_token', v_token);
end;
$$;

revoke all on function public.record_part(text, jsonb, jsonb, text) from public;
grant execute on function public.record_part(text, jsonb, jsonb, text)
  to anon, authenticated;

-- Teil-Infos für die Feedback-Seite (per Token, ohne Login). Gibt bewusst nur
-- das Nötigste zurück – keine Params, kein user_id.
create or replace function public.get_part_for_feedback(p_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'archetype', archetype,
    'created_at', created_at,
    'has_feedback', fit_feedback is not null
  )
  from public.parts
  where feedback_token = p_token;
$$;

-- "Hat's gepasst?"-Antwort speichern. Erneutes Absenden überschreibt (der User
-- darf seine Meinung nach einem zweiten Druck korrigieren).
create or replace function public.submit_fit_feedback(
  p_token uuid,
  p_verdict text,
  p_offset_hint_mm numeric default null,
  p_comment text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  if p_verdict not in ('fits', 'too_tight', 'too_loose', 'not_printed') then
    raise exception 'Ungültiges Verdict: %', p_verdict;
  end if;
  if p_offset_hint_mm is not null and abs(p_offset_hint_mm) > 2 then
    raise exception 'offset_hint_mm ausserhalb ±2 mm';
  end if;
  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'Kommentar zu lang';
  end if;

  update public.parts
  set
    fit_feedback = jsonb_strip_nulls(jsonb_build_object(
      'verdict', p_verdict,
      'offset_hint_mm', p_offset_hint_mm,
      'comment', p_comment,
      'submitted_at', now()
    )),
    status = p_verdict,
    updated_at = now()
  where feedback_token = p_token;

  get diagnostics v_found = row_count;
  return v_found;
end;
$$;

revoke all on function public.get_part_for_feedback(uuid) from public;
revoke all on function public.submit_fit_feedback(uuid, text, numeric, text) from public;
grant execute on function public.get_part_for_feedback(uuid) to anon, authenticated;
grant execute on function public.submit_fit_feedback(uuid, text, numeric, text)
  to anon, authenticated;

-- n8n-Quelle für die 48-h-Mail: angemeldete User, Teil generiert, noch kein
-- Feedback, noch keine Mail. n8n setzt nach Versand reminder_sent_at (mit
-- service_role direkt auf der Tabelle). View liest auth.users → strikt nur
-- service_role.
create view public.feedback_due
with (security_invoker = off) as
select
  p.id,
  p.feedback_token,
  p.archetype,
  p.created_at,
  u.email
from public.parts p
join auth.users u on u.id = p.user_id
where p.status = 'generated'
  and p.fit_feedback is null
  and p.reminder_sent_at is null
  and p.created_at < now() - interval '48 hours';

comment on view public.feedback_due is
  'Fällige "Hat''s gepasst?"-Mails für n8n (nur service_role).';

revoke all on public.feedback_due from public;
revoke all on public.feedback_due from anon;
revoke all on public.feedback_due from authenticated;
grant select on public.feedback_due to service_role;
