-- Least Privilege: Das Projekt vergibt via Default-Privileges volle
-- Auto-Grants (inkl. TRUNCATE) an anon/authenticated. RLS blockt anon zwar
-- (Policies sind `to authenticated`), aber Defense in depth: anon braucht
-- auf printer_profiles gar nichts, authenticated nur die vier DML-Rechte.
-- (Vorgänger 20260611190044 wurde versehentlich leer gepusht.)

revoke all on table public.printer_profiles from anon;
revoke all on table public.printer_profiles from authenticated;

grant select, insert, update, delete on table public.printer_profiles
  to authenticated;
