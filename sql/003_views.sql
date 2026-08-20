-- CRS Compass — views + helper functions the UI reads from
-- Run after 001 and 002.

-- =====================================================================
-- v_latest_draw — the single most recent draw for the hero card
-- =====================================================================
create or replace view public.v_latest_draw as
  select *
  from public.draws
  order by draw_date desc, round_number desc
  limit 1;

comment on view public.v_latest_draw is 'Most recent draw. Read by the landing page hero card.';

-- =====================================================================
-- v_data_freshness — safe surface of the latest ingest run that actually
-- checked IRCC. The base table has no anon SELECT policy; this view exposes
-- only the fields the UI needs (no notes, no ids) and only the most recent
-- qualifying row.
--
-- 'ok' and 'skipped_unchanged' both count: 'skipped_unchanged' means the
-- ingester fetched IRCC, hashed the payload, and found it identical to the
-- last successful run — a real, successful check that correctly chose not
-- to write (draws only change every couple of weeks, so most days look like
-- this). Excluding it made the "Data checked" badge understate freshness on
-- every day without a new draw. Genuine failures (shape_mismatch/http_error/
-- db_error) are still excluded, so a broken pipeline still reads as stale.
-- =====================================================================
create or replace view public.v_data_freshness
with (security_invoker = true) as
  select finished_at as last_updated
  from public.ingest_runs
  where status in ('ok', 'skipped_unchanged')
  order by started_at desc
  limit 1;

comment on view public.v_data_freshness is 'Timestamp of the most recent ingest run that successfully checked IRCC (ok or skipped_unchanged), for the "last updated" badge. Not the same as "when did the data last change."';

-- Views inherit RLS from their base tables under security_invoker; the
-- ingest_runs table has RLS on but no SELECT policy for anon, so this view
-- won't return rows to the anon key. Grant anon direct SELECT on the view
-- through a separate policy path:
grant select on public.v_data_freshness to anon, authenticated;

-- Workaround: a security-definer function is simpler than juggling view RLS.
-- Same status filter as v_data_freshness above, and for the same reason —
-- this is what SiteHeader's "Data checked" badge actually calls.
create or replace function public.get_last_updated()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select finished_at
  from public.ingest_runs
  where status in ('ok', 'skipped_unchanged')
  order by started_at desc
  limit 1;
$$;

grant execute on function public.get_last_updated() to anon, authenticated;

comment on function public.get_last_updated() is 'Returns the timestamp of the most recent ingest run that successfully checked IRCC (status ok or skipped_unchanged) — i.e. "did we check recently," not "did the data change." Safe for anon: exposes only a single timestamp, nothing else about the ingest_runs table.';

-- =====================================================================
-- fn_relevant_draws — the "Would I have been invited?" query
-- =====================================================================
-- Given a score and the set of round types / programs / categories a profile
-- is actually eligible for, return matching historical rounds with a
-- would_have_cleared flag.
--
-- The client is expected to pass ONLY relevant round contexts. In particular,
-- PNP rounds must not be passed unless the user actually holds a provincial
-- nomination (its 600-point bonus makes those cutoffs meaningless otherwise).
create or replace function public.fn_relevant_draws(
  p_score       integer,
  p_round_types text[] default null,   -- null = no filter
  p_programs    text[] default null,
  p_categories  text[] default null,
  p_since       date   default null    -- null = all history
)
returns table (
  round_number         text,
  draw_date            date,
  round_type           text,
  program              text,
  category             text,
  invitations_issued   integer,
  cutoff_score         integer,
  tie_break_timestamp  timestamptz,
  source_url           text,
  would_have_cleared   boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    d.round_number,
    d.draw_date,
    d.round_type,
    d.program,
    d.category,
    d.invitations_issued,
    d.cutoff_score,
    d.tie_break_timestamp,
    d.source_url,
    (p_score >= d.cutoff_score) as would_have_cleared
  from public.draws d
  where (p_round_types is null or d.round_type = any (p_round_types))
    and (p_programs    is null or d.program    = any (p_programs)
                              or (d.program    is null and 'ANY_GENERAL' = any (p_programs)))
    and (p_categories  is null or d.category   = any (p_categories)
                              or (d.category   is null and 'ANY_NONCATEGORY' = any (p_categories)))
    and (p_since       is null or d.draw_date >= p_since)
  order by d.draw_date desc, d.round_number desc;
$$;

grant execute on function public.fn_relevant_draws(integer, text[], text[], text[], date) to anon, authenticated;

comment on function public.fn_relevant_draws(integer, text[], text[], text[], date) is
  'Returns historical rounds filtered to those relevant to a profile, with a would_have_cleared flag. Caller is responsible for supplying only round contexts the profile qualifies for.';
