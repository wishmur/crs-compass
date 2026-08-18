# CRS Compass — Lovable build brief

Paste this into the Lovable "create project" prompt. Once the project exists,
connect it to the `crs-signal` GitHub repo via Lovable's GitHub sync so all
code lives in one place with the ingester and SQL migrations.

---

## What we're building

**CRS Compass** — a personalized Express Entry tracker. It answers one question
for people navigating Canadian permanent residence: *"Where do I stand?"*

The site does three things:

1. Shows the most recent Express Entry rounds (draws).
2. Shows the full history of every round since 2015, filterable.
3. Lets a user enter a CRS score and see which historical rounds — filtered
   to the ones that actually apply to them — they would have cleared.

**No CRS calculator in v1.** Users enter a score they already know; the
calculator lands in v2.

**No accounts.** The user's score + relevance selections persist in the
browser's `localStorage`.

This is a portfolio project, not a startup — success is a real, usable product
in front of real users, instrumented so we can learn from what they do.

## Stack

- **Vite + React + TypeScript** (Lovable default).
- **Tailwind + shadcn/ui** for styling. Prefer shadcn primitives (Card, Table,
  Tabs, Badge, Button, Input, Toggle, Select) over custom components.
- **Recharts** for the history chart.
- **@supabase/supabase-js** for data.
- **posthog-js** for analytics + surveys.

Env vars (Vite requires `VITE_` prefix for anything the browser reads):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_POSTHOG_KEY
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

## Supabase — data available in v1

The ingester (already written, in `scripts/ingest/`) populates two tables and
a helper function. The app is **read-only** — it never writes to Supabase.

**Table `draws`** — every Express Entry round since 2015.
Columns you'll use:

| column               | type                    | notes |
|----------------------|-------------------------|-------|
| `round_number`       | `text` (PK)             | usually digits like `"434"`; can include letter suffix (`"91b"`) |
| `draw_date`          | `date`                  | ISO YYYY-MM-DD |
| `round_type`         | `'general' \| 'program_specific' \| 'category_based'` | drives chart series and filters |
| `program`            | `'CEC' \| 'FSW' \| 'FST' \| 'PNP' \| null` | non-null only when `round_type='program_specific'` |
| `category`           | `text \| null`          | e.g. `"French language"`, `"Healthcare"`, `"Transport"`, `"STEM"`, `"Trades"`, `"Agriculture"`, `"Education"`, `"Senior managers"`, `"Physicians"`, `"Military"` |
| `invitations_issued` | `integer`               |  |
| `cutoff_score`       | `integer` (0–1200)      |  |
| `tie_break_timestamp`| `timestamptz \| null`   | for candidates exactly at the cutoff |
| `source_url`         | `text \| null`          | link to the official IRCC announcement |

**Table `pool_snapshots`** — how many candidates sit in each CRS band, as of
the most recent capture. Rows: `(as_of_date, band_low, band_high, candidate_count)`.
(V1 only *shows* the latest date somewhere subtle — no pool-position feature yet.)

**Function `get_last_updated() → timestamptz`** — call for the "last updated"
badge:

```ts
const { data } = await supabase.rpc('get_last_updated')
// data is an ISO timestamp string
```

**Function `fn_relevant_draws(p_score, p_round_types, p_programs, p_categories, p_since)`**
— for "Would I have been invited?". Pass the user's score and the round
contexts they're actually eligible for. Returns matching rows with a
`would_have_cleared` boolean:

```ts
const { data } = await supabase.rpc('fn_relevant_draws', {
  p_score: 486,
  p_round_types: ['program_specific', 'category_based'],
  p_programs: ['CEC'],                     // only if they qualify for CEC
  p_categories: ['French language'],       // categories they meet the criteria for
  p_since: '2024-01-01',
})
```

Pass `null` for a parameter to disable that filter.

**The relevance is the whole point of the feature.** The UI is responsible for
NOT passing round contexts the user doesn't qualify for. In particular:
**never pass `program: 'PNP'`** unless the user says they hold a provincial
nomination — PNP cutoffs include a 600-point bonus that everyone in that
round carries, so those cutoffs are meaningless for anyone without a
nomination.

## Pages

### 1. `/` — Landing / Latest draw

- **Hero card:** the most recent draw.
  - Round type label (e.g. "Category-based · French language" or "Program-specific · CEC") in a **prominent badge**, sized *as visually large as the cutoff number*. Never show a cutoff without its round-type context. This is a hard rule.
  - Date, invitations issued, cutoff score, tie-break timestamp (if any), link to the official IRCC announcement.
- Below the hero, a compact "recent rounds" list — the last 5–7 rounds.
- "Last updated" badge sourced from `get_last_updated()`, subtle, footer-adjacent.
- Below the fold: a plain-language paragraph explaining what Express Entry is (2–3 sentences), linking to the About page.

### 2. `/history` — Full history

- Table of every draw. Columns: date, round type, program, category, invitations, cutoff, source link.
- Filters (all combinable): year, round_type, program, category. Multi-select.
- Sortable by any numeric/date column.
- Default sort: date desc.
- Above the table, an inline chart (Recharts LineChart) with **one line per round type or category family** — never a single merged line.
  - Legend is interactive: clicking a series hides it. Default view: last 3 years, all series visible.
  - Y axis is CRS cutoff. X axis is draw_date.
  - **Do not** put PNP on the same chart as anything else — its scale (700–800) crushes everything else visually. Give PNP its own toggle and, when toggled on, either use a dual y-axis or render as a separate small chart below.

### 3. `/would-i-have-made-it` — WIHBI (the hero personalization feature)

Three-step form on one page:

**Step 1 — Score.** Number input, 0–1200. Persist to `localStorage` under
`crsSignal.score`. If a value is already there, prefill it.

**Step 2 — What actually applies to you?** Grouped checkboxes. Persist under
`crsSignal.eligibility` as a JSON object.

- **Programs** (single-select or none):
  - "I'm inside Canada working full-time" → CEC
  - "I'm a Federal Skilled Worker candidate" → FSW
  - "I'm a Federal Skilled Trades candidate" → FST
  - "I hold a provincial nomination" → PNP (explicit warning next to it about the 600-point bonus)
- **Category-based rounds** (multi-select):
  - checkbox per category family (French language, Healthcare, STEM, Trades, Transport, Agriculture, Education, Senior managers, Physicians, Military) — with a subtle "?" tooltip that says "You should only check this if you meet IRCC's specific criteria for that category — see the official list."
- **General rounds** — auto-included (everyone is eligible when they run), so don't ask.
- Add a helper link out to `canada.ca/…/rounds-invitations/category-based-selection.html` for the official criteria.

**Step 3 — Result.** Call `fn_relevant_draws` and render:

- **Summary line:** "You would have cleared **N of M** relevant rounds since {since_date}." (Default `since` = 2 years ago.)
- **Bar of the last 12 relevant rounds**, each shown as a small pill colored green (cleared) or red (didn't clear), with a tooltip showing date + cutoff.
- **Honest zero-callout:** if there are zero cleared rounds in the last 6 months across their selections, show a factual message: *"No relevant rounds have been within your reach in the last 6 months. In {current_year}, most invitations went to {top-2 category families they didn't check}."* Compute the "top two" from the actual data.
- Every cutoff shown carries its round-type/category label. **No bare cutoff numbers anywhere.**
- Below the result: a PostHog survey component asking "Was this useful? Yes/No + a free-text field."

### 4. `/about` — What this is and isn't

Plain, human copy covering:
- What Express Entry is (2–3 paragraphs, no jargon).
- Why cutoffs mean different things across round types (the PNP trap, explained).
- **The province question:** "There is no such thing as a cutoff *for Ontario* (or any province) in federal Express Entry. The pool is national. Provinces only enter the picture through their separate Provincial Nominee Programs, which are out of scope for this site."
- **Nobody can predict the next cutoff** — including us — because the cutoff is determined *after* IRCC decides how many people to invite.
- **Disclaimer:** "This site is not immigration advice. Data comes from IRCC and may be delayed or incomplete. Always verify with the official Canadian government resources before making decisions."
- Credits + links to source: IRCC's official rounds page, this repo on GitHub.

## Global UI rules

- **Every displayed cutoff carries its round-type / program / category label.** Non-negotiable — this is what stops the product from misleading users.
- **Footer on every page:** "Data: IRCC · Last updated: {ts} · Not immigration advice."
- **Mobile-first.** The history table becomes a stacked card list under `md`.
- **Empty & loading states:** skeleton loaders, not spinners. "Data not available yet — the daily refresh runs at ~9am ET" fallback text if `get_last_updated()` returns null.
- **Accessibility:** semantic table markup, keyboard-navigable filters, sufficient contrast.
- Color: neutral palette (slate/stone). One accent color for interactive elements. Round-type badges get distinct colors, but muted:
  - General: neutral gray
  - CEC: blue
  - FSW / FST: teal
  - PNP: purple (distinct — this is the "watch out" class)
  - Category-based: warm (amber / orange), varying subtly by family

## Analytics events (PostHog)

Fire these — event names live in `src/lib/analytics.ts` as constants:

- `landing_viewed`
- `history_viewed`
- `history_filter_used` (props: `{ filter: 'year' | 'round_type' | 'program' | 'category', value }`)
- `chart_series_toggled` (props: `{ series, visible: boolean }`)
- `wihbi_started`
- `wihbi_score_entered` (props: `{ score }`) — debounced
- `wihbi_eligibility_changed` (props: `{ programs, categories }`)
- `wihbi_result_viewed` (props: `{ cleared, total, since }`)
- `official_source_clicked` (props: `{ from: 'latest' | 'history' | 'wihbi', round_number }`)
- `about_viewed`
- Standard PostHog `$pageview` on route change; `$identify` never called (anonymous only).

Also install PostHog surveys — configure a survey in the PostHog project that
targets `#wihbi-survey-slot` and gets shown once per user after `wihbi_result_viewed`.

## Repo conventions to respect

- Do not touch `scripts/`, `sql/`, or `.github/` — those are owned by the
  ingester and don't need Lovable's changes.
- Env vars: read via `import.meta.env.VITE_...`. Never hardcode Supabase or
  PostHog keys.
- Keep `src/lib/supabase.ts` as the single Supabase client instance.
- Keep the round-type / category display metadata (colors, labels, ordering)
  in **one** file: `src/data/round-types.ts`. Every component imports from it.
