-- Teil-Anfragen ("kein passender Treffer") – Warteliste & Nachfrage-Signal für
-- neue Archetypen (ADR-002). Wenn die Vision-Analyse unsicher ist
-- (archetype_confidence < ARCHETYPE_CONFIDENCE_THRESHOLD), beschreibt der User
-- das gewünschte Teil hier, statt in eine falsche Vorlage gezwungen zu werden.
-- Das liefert gleichzeitig die datengetriebene Roadmap.
--
-- Anonyme Einsendungen sind erwünscht (Erstnutzer sind oft nicht angemeldet),
-- daher user_id nullable + INSERT-Policy auch für anon. Lesen darf nur der
-- Eigentümer seine eigenen Zeilen; die Roadmap-Auswertung läuft über
-- service_role (Supabase-Dashboard), nicht über die Data API.
--
-- Eiserne Regel 5 (CLAUDE.md): RLS + explizite GRANTs, Least Privilege.

create table public.part_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null
    check (char_length(description) between 1 and 2000),
  -- Bester (zu unsicherer) Treffer der Analyse – rein informativ. KEIN FK/Enum,
  -- damit neue/unbekannte Typnamen die Einsendung nie blockieren.
  suggested_archetype text
    check (suggested_archetype is null or char_length(suggested_archetype) <= 40),
  confidence numeric(4, 3)
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  -- Optionale Kontaktmöglichkeit (Benachrichtigung bei Release), v. a. für anon.
  email text check (email is null or char_length(email) <= 200),
  -- Pfad im privaten Storage-Bucket 'part-requests' (nur bei Foto-Opt-in gesetzt).
  photo_path text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'planned', 'released', 'declined')),
  created_at timestamptz not null default now()
);

comment on table public.part_requests is
  'Nachfrage-Signal für fehlende Archetypen (datengetriebene Roadmap, ADR-002).';

-- Roadmap-Auswertung: nach Status + Eingang gruppieren.
create index part_requests_status_created
  on public.part_requests (status, created_at desc);

alter table public.part_requests enable row level security;

-- Anonyme dürfen anlegen, aber nur ohne Konto-Zuordnung (user_id NULL).
create policy "Anonyme Anfrage anlegen"
  on public.part_requests for insert
  to anon
  with check (user_id is null);

-- Angemeldete legen unter ihrer eigenen user_id an …
create policy "Eigene Anfrage anlegen"
  on public.part_requests for insert
  to authenticated
  with check (user_id is null or (select auth.uid()) = user_id);

-- … und sehen den Status ihrer eigenen Anfragen.
create policy "Eigene Anfragen lesen"
  on public.part_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Least Privilege: volle Auto-Grants zurücknehmen, dann gezielt vergeben.
revoke all on table public.part_requests from anon;
revoke all on table public.part_requests from authenticated;

grant insert on table public.part_requests to anon;
grant select, insert on table public.part_requests to authenticated;

-- Privater Bucket für Opt-in-Fotos. Nur Upload (INSERT) für anon/authenticated;
-- gelesen wird ausschliesslich serverseitig (service_role/Dashboard) – kein
-- öffentlicher Zugriff. Storage.objects hat RLS bereits aktiv + Default-Grants.
insert into storage.buckets (id, name, public)
values ('part-requests', 'part-requests', false)
on conflict (id) do nothing;

create policy "Teil-Anfrage-Foto hochladen"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'part-requests');
