-- CRS Compass — Row Level Security
-- Public site, no accounts in v1. Anon key gets SELECT only. Writes require the
-- service-role key, which lives only in GitHub Secrets.

alter table public.draws           enable row level security;
alter table public.pool_snapshots  enable row level security;
alter table public.ingest_runs     enable row level security;

-- --- draws: public read
drop policy if exists "draws are readable by anyone" on public.draws;
create policy "draws are readable by anyone"
  on public.draws for select
  to anon, authenticated
  using (true);

-- --- pool_snapshots: public read
drop policy if exists "pool_snapshots are readable by anyone" on public.pool_snapshots;
create policy "pool_snapshots are readable by anyone"
  on public.pool_snapshots for select
  to anon, authenticated
  using (true);

-- --- ingest_runs: public read of the *latest* row only, via a view (see 003).
-- No direct policy: RLS is enabled with no SELECT policy, so anon cannot read
-- the table directly. The v_data_freshness view is exposed instead.

-- =====================================================================
-- Postgres-level grants
--
-- RLS is layered on top of standard Postgres table privileges. Supabase's
-- built-in service_role bypasses RLS, but it still needs table-level grants
-- to touch a table at all — and those are not implicit for tables created
-- from the SQL editor. Grant them explicitly so the ingester (running with
-- the service_role key) can read and write.
--
-- anon + authenticated only need read on the two public data tables; the
-- RLS policies above further gate what rows they can see.
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select                          on public.draws          to anon, authenticated;
grant select                          on public.pool_snapshots to anon, authenticated;

grant select, insert, update, delete  on public.draws          to service_role;
grant select, insert, update, delete  on public.pool_snapshots to service_role;
grant select, insert, update, delete  on public.ingest_runs    to service_role;

-- ingest_runs uses a bigserial primary key → grant sequence usage too.
grant usage, select on all sequences in schema public to service_role;
