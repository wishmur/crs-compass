# CRS Compass

A personalized Express Entry tracker. Ingests the IRCC daily draw feed, stores
it in Supabase, and shows a Lovable-built UI where a user can see the latest
draw, browse full history, and check whether their CRS score would have
cleared past rounds relevant to them.

Working name — revisit before public launch. See [LOVABLE-PROMPT.md](./LOVABLE-PROMPT.md)
for the product brief.

## Architecture

```
IRCC (undocumented JSON) ──daily──▶ GitHub Actions ingester (Python)
                                        │
                                        ▼
                              Supabase Postgres
                              ├── draws  (every round since 2015)
                              ├── pool_snapshots
                              └── ingest_runs (audit + freshness)
                                        │
                                        ▼
                              Lovable app (Vite + React + Tailwind + shadcn/ui)
                              ├── reads via supabase-js (anon key)
                              ├── PostHog analytics + surveys
                              └── localStorage for the user's score/eligibility
```

Two rules the codebase enforces:

1. **Never fetch IRCC on a user page load.** Reads come from Supabase.
2. **Every displayed cutoff carries its round type/program/category label.** No
   bare numbers, no charts that merge PNP with anything else.

## Repository layout

```
crs-compass/
├── README.md              (this file — the setup runbook)
├── LOVABLE-PROMPT.md      (paste into Lovable to scaffold the UI)
├── sql/                   (Supabase migrations, run in order)
├── scripts/ingest/        (Python ingester — self-contained, own deps)
├── .github/workflows/     (ingest cron)
├── .env.example
├── .gitignore
└── src/                   (Lovable will populate this)
```

## Setup — first time

You (a human, not Claude Code) do these once.

### 1. Supabase

Use the unused free Supabase project. Rename to `crs-compass` if the dashboard
lets you.

In the Supabase SQL editor, run these files in order:

```
sql/001_initial_schema.sql
sql/002_rls_policies.sql
sql/003_views.sql
```

Grab the API keys from **Project Settings → API**:

- `Project URL`               → will become `SUPABASE_URL` and `VITE_SUPABASE_URL`
- `Project API keys → anon`   → will become `VITE_SUPABASE_ANON_KEY`
- `Project API keys → service_role` → will become `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in the browser)

### 2. GitHub

Create a **public** repo named `crs-compass` under your account, then push
this folder:

```bash
git remote add origin git@github.com:<your-user>/crs-compass.git
git push -u origin main
```

Add these under **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret                       | Value |
|------------------------------|-------|
| `SUPABASE_URL`               | project URL |
| `SUPABASE_SERVICE_ROLE_KEY`  | service_role key |

The ingest workflow will start running on the daily cron the next morning.
To fire it immediately once: **Actions tab → `ingest` → Run workflow**.

### 3. PostHog

Create a project at [posthog.com](https://posthog.com/) (free tier).

Grab the **Project API key** (starts with `phc_`).

Under **Product → Surveys**, create a "Was this useful?" survey targeting
`#wihbi-survey-slot`, triggered by the `wihbi_result_viewed` event.

### 4. Lovable

Create a new Lovable project. Under project settings, connect it to the
`crs-compass` GitHub repo via Lovable's GitHub sync. Paste the contents of
[LOVABLE-PROMPT.md](./LOVABLE-PROMPT.md) into the initial project message.

Add these environment variables in Lovable's project settings:

| Env var                  | Value |
|--------------------------|-------|
| `VITE_SUPABASE_URL`      | project URL |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `VITE_POSTHOG_KEY`       | posthog project key |
| `VITE_POSTHOG_HOST`      | `https://us.i.posthog.com` (or `https://eu.i.posthog.com`) |

### 5. Verify

- **Ingest ran:** Actions tab shows a green "ingest" run. Supabase `draws`
  table has 400+ rows. `select get_last_updated();` returns a recent
  timestamp.
- **Site loads:** the Lovable preview URL renders the latest-draw hero card
  with an actual round from IRCC (not "no data").
- **A random draw matches IRCC:** pick a row from `draws`, compare the
  cutoff/date/category against the official IRCC results page. They must
  match exactly.

## Working on the ingester locally

```bash
cd scripts/ingest
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# no DB writes — parse the live IRCC feed and print
python -m ingest.run --dry-run

# tests against the captured snapshot
pytest -q
```

See [scripts/ingest/README.md](./scripts/ingest/README.md) for details.

## When the IRCC feed breaks

The endpoint is undocumented; the government can change it without notice.
When that happens:

1. The `ingest` workflow fails and opens a GitHub issue.
2. The site keeps serving the last-known-good data (a failed ingest never
   touches `draws`), and the "last updated" badge stays honest about the age.
3. Update `scripts/ingest/ingest/schema.py` and `normalize.py`, refresh
   `scripts/ingest/fixtures/ee_rounds.sample.json` against a fresh capture,
   re-run `pytest`.

## Disclaimer

CRS Compass is an information product, not immigration advice. Data comes from
Immigration, Refugees and Citizenship Canada (IRCC) and may be delayed or
incomplete. Nobody, including this site, can predict future cutoffs. Always
verify against the official Canadian government resources before acting.
