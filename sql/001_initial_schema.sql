-- CRS Compass — initial schema
-- Run in the Supabase SQL Editor once per environment.

-- =====================================================================
-- draws — every Express Entry round since 2015
-- =====================================================================
create table if not exists public.draws (
  round_number         text        primary key,   -- text, not int: IRCC uses suffixes ("91a","91b") for multi-round days
  draw_date            date        not null,
  round_type           text        not null
                                    check (round_type in ('general','program_specific','category_based')),
  program              text        check (program in ('CEC','FSW','FST','PNP')),
  category             text,                                  -- e.g. 'French language', 'Healthcare', 'Transport'
  invitations_issued   integer     not null check (invitations_issued >= 0),
  cutoff_score         integer     not null check (cutoff_score between 0 and 1200),
  tie_break_timestamp  timestamptz,
  source_url           text,
  fetched_at           timestamptz not null default now(),
  raw_payload          jsonb       not null
);

create index if not exists draws_draw_date_idx     on public.draws (draw_date desc);
create index if not exists draws_round_type_idx    on public.draws (round_type);
create index if not exists draws_program_idx       on public.draws (program);
create index if not exists draws_category_idx      on public.draws (category);

comment on table  public.draws is 'One row per Express Entry round of invitations. round_number is IRCC''s sequential identifier; text because IRCC uses suffixes like "91a"/"91b" for multi-round days.';
comment on column public.draws.raw_payload is 'Verbatim payload from IRCC for the parent snapshot. Preserved so parsing bugs can be fixed without re-fetching.';

-- =====================================================================
-- pool_snapshots — candidate distribution by CRS band (as of a date)
-- =====================================================================
create table if not exists public.pool_snapshots (
  as_of_date       date    not null,
  band_low         integer not null check (band_low  between 0 and 1200),
  band_high        integer not null check (band_high between 0 and 1200),
  candidate_count  integer not null check (candidate_count >= 0),
  primary key (as_of_date, band_low)
);

create index if not exists pool_snapshots_as_of_idx on public.pool_snapshots (as_of_date desc);

comment on table public.pool_snapshots is 'How many candidates sit in each CRS band as of a given date. Sourced from IRCC alongside the draws feed.';

-- =====================================================================
-- ingest_runs — audit trail for the daily job
-- =====================================================================
create table if not exists public.ingest_runs (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text        not null
                              check (status in ('ok','shape_mismatch','http_error','db_error','skipped_unchanged')),
  draws_seen      integer,
  draws_upserted  integer,
  pool_rows_seen  integer,
  payload_sha256  text,
  notes           text
);

create index if not exists ingest_runs_started_at_idx on public.ingest_runs (started_at desc);

comment on table public.ingest_runs is 'One row per ingester execution. Powers the app''s "last updated" badge and the failure alert.';
