# scripts/ingest

Daily job that fetches the IRCC Express Entry JSON, validates it, and upserts
into Supabase. Runs on a GitHub Actions cron
(`.github/workflows/ingest.yml`).

Python for consistency with the Watchlist project — no Node install required.

## Layout

```
scripts/ingest/
├── requirements.txt        # pinned deps
├── ingest/
│   ├── schema.py           # Pydantic models for the raw IRCC payload
│   ├── normalize.py        # raw -> typed Draw rows + PoolSnapshot
│   ├── fetch.py            # HTTP w/ browser-ish UA + retries
│   ├── upsert.py           # Supabase writes + ingest_runs audit
│   └── run.py              # entrypoint  (python -m ingest.run)
├── tests/
│   └── test_normalize.py
└── fixtures/
    └── ee_rounds.sample.json    # snapshot for unit tests
```

## Local setup

```bash
cd scripts/ingest
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
# fetch + parse only, no DB writes — safe on any machine
python -m ingest.run --dry-run

# unit tests against the snapshot
pytest -q
```

For real ingest, copy `.env.example` at the repo root to `.env.local` and
export `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Then:

```bash
python -m ingest.run
```

In production this runs from GitHub Actions with those values in secrets.

## Behavior

- Fetches with a browser User-Agent + `Referer` (canada.ca sits behind Akamai
  and rejects unadorned requests).
- Retries up to 3 times with exponential backoff.
- Validates shape with Pydantic. On shape drift, exits non-zero and records
  a `shape_mismatch` run so the GitHub Action opens an issue.
- Hashes the raw response and skips upserts entirely if it matches the last
  successful run (`skipped_unchanged`).
- Writes an `ingest_runs` audit row on every attempt.
  The app reads the most recent `ok` row via `get_last_updated()` for the
  "last updated" badge.

## When IRCC breaks the feed

The endpoint is undocumented; the government can change field names or move
it without notice. When that happens:

1. The workflow fails and opens a GitHub issue.
2. The site keeps serving the last-known-good data (the failure never touches
   the `draws` table).
3. Update `ingest/schema.py` and `ingest/normalize.py`. Refresh
   `fixtures/ee_rounds.sample.json` against a fresh capture and re-run
   `pytest`.
