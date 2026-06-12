-- Durable Rate-Limit/Quota für /api/analyze (Schutz der Claude-API-Kosten).
-- Das In-Memory-Limit der Route ist auf Vercel pro Serverless-Instanz → löchrig
-- und über mehrere IPs/Cold-Starts umgehbar. Diese Tabelle + RPC liefern einen
-- echten, instanzübergreifenden Tagesdeckel (global) plus ein per-IP-Limit,
-- atomar. Die IP wird nur GEHASHT gespeichert (Pseudonymisierung).
--
-- Eiserne Regel 5 (CLAUDE.md): RLS an, keine Direkt-Grants. Zugriff
-- ausschliesslich über die SECURITY-DEFINER-Funktion; anon/authenticated
-- dürfen nur diese ausführen, nie die Tabelle direkt lesen/schreiben.

create table public.analyze_usage (
  day date not null,
  bucket text not null, -- 'global' oder 'ip:<sha256-hash>'
  count integer not null default 0,
  primary key (day, bucket)
);

comment on table public.analyze_usage is
  'Fixed-Window-Tageszähler für /api/analyze (global + per gehashter IP).';

alter table public.analyze_usage enable row level security;
-- Bewusst KEINE Policies: damit ist jeder Direktzugriff über die Data API
-- gesperrt; der Zugriff läuft nur über check_analyze_quota() (definer).

revoke all on table public.analyze_usage from anon;
revoke all on table public.analyze_usage from authenticated;

-- Atomar global + per-IP hochzählen und gegen die Limits prüfen. Gibt JSON mit
-- allowed + aktuellen Zählern zurück. Fixed Window pro UTC-Tag.
create or replace function public.check_analyze_quota(
  p_ip_hash text,
  p_ip_limit integer,
  p_global_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_ip_count integer;
  v_global_count integer;
begin
  insert into public.analyze_usage (day, bucket, count)
    values (v_day, 'global', 1)
    on conflict (day, bucket)
      do update set count = public.analyze_usage.count + 1
    returning count into v_global_count;

  insert into public.analyze_usage (day, bucket, count)
    values (v_day, 'ip:' || p_ip_hash, 1)
    on conflict (day, bucket)
      do update set count = public.analyze_usage.count + 1
    returning count into v_ip_count;

  return jsonb_build_object(
    'allowed', v_ip_count <= p_ip_limit and v_global_count <= p_global_limit,
    'ip_count', v_ip_count,
    'global_count', v_global_count,
    'ip_limit', p_ip_limit,
    'global_limit', p_global_limit
  );
end;
$$;

revoke all on function public.check_analyze_quota(text, integer, integer) from public;
grant execute on function public.check_analyze_quota(text, integer, integer)
  to anon, authenticated;
