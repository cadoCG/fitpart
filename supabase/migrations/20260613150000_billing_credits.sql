-- Billing Phase A: Pay-per-Part-Guthaben (Briefing 4, docs/billing-plan.md).
-- Modell: Konto-Pflicht zum Download, 3 Gratis-Credits bei Konto-Erstellung
-- (lebenslang), danach 1 Credit = 1 Teil freischalten. Re-Download eines
-- freigeschalteten Teils ist gratis (Identität = user + archetype + params_hash).
--
-- Gutschriften (Welcome/Kauf) und Abbuchungen laufen NIE über direkte Writes,
-- sondern über SECURITY-DEFINER-RPCs – anon/authenticated dürfen die Tabellen
-- nicht direkt schreiben. add_purchased_credits ist service_role-only (Webhook).
--
-- Eiserne Regel 5 (CLAUDE.md): RLS überall, Least-Privilege-Grants.

-- 1:1 zu auth.users. plan bleibt für Phase C (maker/pro) reserviert.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  welcome_granted boolean not null default false,
  plan text not null default 'payg' check (plan in ('payg', 'maker', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Nutzer-Guthaben (Credits) + Plan. Writes nur via SECURITY-DEFINER-RPCs.';

-- Append-only-Ledger: Audit + Idempotenz (Käufe über stripe_session_id).
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,                  -- +3 welcome, +N purchase, -1 spend
  reason text not null
    check (reason in ('welcome', 'purchase', 'spend', 'refund', 'admin')),
  part_id uuid references public.parts (id) on delete set null,
  stripe_session_id text unique,           -- Idempotenz-Anker für Käufe
  created_at timestamptz not null default now()
);

create index credit_transactions_user on public.credit_transactions (user_id, created_at desc);

-- Teil-Identität fürs Freischalten: stabiler Hash über archetype + Nennparameter
-- (vom Client kanonisiert übergeben). Erlaubt "schon freigeschaltet → gratis".
alter table public.parts add column params_hash text;
alter table public.parts add column unlocked_at timestamptz;

-- Ein freischaltbares Teil je (User, Archetyp, Params) – verhindert Doppelzeilen
-- bei Doppelklick (Race) und doppelte Abbuchung.
create unique index parts_user_identity
  on public.parts (user_id, archetype, params_hash)
  where user_id is not null and params_hash is not null;

alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;

-- Eigentümer liest eigenes Guthaben / eigene Ledger-Zeilen. Keine Direkt-Writes.
create policy "Eigenes Profil lesen"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Eigene Transaktionen lesen"
  on public.credit_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.credit_transactions from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.credit_transactions to authenticated;

-- Profil sicherstellen + einmalig 3 Welcome-Credits. Idempotent über
-- welcome_granted. Wird lazy aus get_billing_state/unlock_part_for aufgerufen.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'auth_required';
  end if;

  insert into public.profiles (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  -- Welcome-Gutschrift atomar genau einmal.
  update public.profiles
  set credits = credits + 3, welcome_granted = true, updated_at = now()
  where user_id = v_user and welcome_granted = false;

  if found then
    insert into public.credit_transactions (user_id, delta, reason)
    values (v_user, 3, 'welcome');
  end if;
end;
$$;

-- Guthaben + Anzahl freigeschalteter Teile.
create or replace function public.get_billing_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_credits integer;
  v_unlocked integer;
begin
  if v_user is null then
    return jsonb_build_object('authenticated', false);
  end if;
  perform public.ensure_profile();
  select credits into v_credits from public.profiles where user_id = v_user;
  select count(*) into v_unlocked
    from public.parts where user_id = v_user and unlocked_at is not null;
  return jsonb_build_object(
    'authenticated', true, 'credits', v_credits, 'unlocked_parts', v_unlocked
  );
end;
$$;

-- Teil freischalten (oder bereits frei). Legt die parts-Zeile an, falls neu –
-- dient zugleich als fit_feedback-Eintrag (gibt feedback_token zurück).
create or replace function public.unlock_part_for(
  p_archetype text,
  p_params jsonb,
  p_tolerance jsonb,
  p_format text,
  p_params_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_part_id uuid;
  v_unlocked timestamptz;
  v_token uuid;
  v_credits integer;
begin
  if v_user is null then
    return jsonb_build_object('allowed', false, 'reason', 'auth_required');
  end if;
  if p_format not in ('stl', '3mf', 'step') then
    raise exception 'Ungültiges Format: %', p_format;
  end if;
  if p_archetype is null or char_length(p_archetype) not between 1 and 40 then
    raise exception 'Ungültiger Archetyp';
  end if;
  if p_params is null or pg_column_size(p_params) > 8192 then
    raise exception 'Ungültige Params';
  end if;
  if p_params_hash is null or char_length(p_params_hash) not between 8 and 128 then
    raise exception 'Ungültiger params_hash';
  end if;

  perform public.ensure_profile();

  -- Bestehendes Teil dieser Identität suchen (oder anlegen).
  select id, unlocked_at, feedback_token
    into v_part_id, v_unlocked, v_token
  from public.parts
  where user_id = v_user and archetype = p_archetype and params_hash = p_params_hash
  limit 1;

  if v_part_id is null then
    insert into public.parts (user_id, archetype, params, tolerance_profile, format, params_hash)
    values (v_user, p_archetype, p_params, p_tolerance, p_format, p_params_hash)
    on conflict (user_id, archetype, params_hash) do update set updated_at = now()
    returning id, unlocked_at, feedback_token into v_part_id, v_unlocked, v_token;
  end if;

  -- Schon freigeschaltet → gratis.
  if v_unlocked is not null then
    select credits into v_credits from public.profiles where user_id = v_user;
    return jsonb_build_object(
      'allowed', true, 'reason', 'already',
      'credits', v_credits, 'feedback_token', v_token
    );
  end if;

  -- Guthaben prüfen + abbuchen (atomar, Zeile gesperrt).
  select credits into v_credits from public.profiles where user_id = v_user for update;
  if v_credits <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'no_credits', 'credits', 0);
  end if;

  update public.profiles set credits = credits - 1, updated_at = now()
    where user_id = v_user;
  update public.parts set unlocked_at = now(), format = p_format, updated_at = now()
    where id = v_part_id;
  insert into public.credit_transactions (user_id, delta, reason, part_id)
    values (v_user, -1, 'spend', v_part_id);

  return jsonb_build_object(
    'allowed', true, 'reason', 'unlocked',
    'credits', v_credits - 1, 'feedback_token', v_token
  );
end;
$$;

-- Kauf gutschreiben (idempotent über stripe_session_id). Nur Webhook/service_role.
create or replace function public.add_purchased_credits(
  p_user_id uuid,
  p_session_id text,
  p_qty integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credits integer;
begin
  if p_qty <= 0 or p_qty > 1000 then
    raise exception 'Ungültige Menge';
  end if;

  -- Idempotenz: bei bereits verbuchter Session nichts tun.
  insert into public.credit_transactions (user_id, delta, reason, stripe_session_id)
  values (p_user_id, p_qty, 'purchase', p_session_id)
  on conflict (stripe_session_id) do nothing;

  if not found then
    select credits into v_credits from public.profiles where user_id = p_user_id;
    return jsonb_build_object('applied', false, 'credits', coalesce(v_credits, 0));
  end if;

  insert into public.profiles (user_id, credits, welcome_granted)
  values (p_user_id, p_qty, true)
  on conflict (user_id) do update
    set credits = public.profiles.credits + p_qty, updated_at = now()
  returning credits into v_credits;

  return jsonb_build_object('applied', true, 'credits', v_credits);
end;
$$;

revoke all on function public.ensure_profile() from public;
revoke all on function public.get_billing_state() from public;
revoke all on function public.unlock_part_for(text, jsonb, jsonb, text, text) from public;
revoke all on function public.add_purchased_credits(uuid, text, integer) from public;

grant execute on function public.get_billing_state() to authenticated;
grant execute on function public.unlock_part_for(text, jsonb, jsonb, text, text) to authenticated;
-- ensure_profile nur intern (von den obigen Definer-Funktionen aufgerufen).
-- add_purchased_credits: nur service_role (Stripe-Webhook).
grant execute on function public.add_purchased_credits(uuid, text, integer) to service_role;
