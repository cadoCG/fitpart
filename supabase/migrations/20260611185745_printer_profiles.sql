-- Drucker-Profile (Kalibrier-Offsets pro Drucker + Material), ersetzt
-- localStorage. Spiegelt ToleranceProfile (packages/shared/src/tolerance.ts).
-- Eiserne Regel 5 (CLAUDE.md): RLS + explizite GRANTs (seit April 2026 werden
-- neue Tabellen nicht mehr automatisch für die Data API freigegeben).

create table public.printer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Mein Drucker',
  nozzle_mm numeric(4, 2) not null default 0.4 check (nozzle_mm > 0),
  hole_offset_mm numeric(5, 3) not null default 0,
  shaft_offset_mm numeric(5, 3) not null default 0,
  slot_offset_mm numeric(5, 3) not null default 0,
  calibrated boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.printer_profiles is
  'Toleranz-Profile aus dem Kalibrier-Coupon, eines pro Drucker+Material.';

-- Höchstens ein aktives Profil pro User.
create unique index printer_profiles_one_active
  on public.printer_profiles (user_id)
  where is_active;

-- updated_at automatisch pflegen (SECURITY INVOKER, kein RLS-Bypass).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger printer_profiles_updated_at
  before update on public.printer_profiles
  for each row
  execute function public.set_updated_at();

-- RLS: nur eigene Profile, alle vier Operationen explizit.
alter table public.printer_profiles enable row level security;

create policy "Eigene Profile lesen"
  on public.printer_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Eigene Profile anlegen"
  on public.printer_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Eigene Profile ändern"
  on public.printer_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Eigene Profile löschen"
  on public.printer_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Explizite Grants (Breaking Change 2026); anon bekommt bewusst nichts.
grant select, insert, update, delete on table public.printer_profiles
  to authenticated;
