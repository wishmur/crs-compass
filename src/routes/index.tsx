import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge } from "@/components/RoundBadge";
import { ScoreScale } from "@/components/ScoreScale";
import { formatDate } from "@/components/DrawMeta";
import { FilterChip } from "@/components/FilterChip";
import { RecentRelevantDraws } from "@/components/RecentRelevantDraws";
import { PersonalScoreSection } from "@/components/PersonalScoreSection";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { useCrsProfile, isRelevantDraw } from "@/lib/useCrsProfile";
import { useScore } from "@/lib/useScore";
import { CATEGORIES, type Program } from "@/data/round-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRS Compass — Latest Express Entry draw and cutoff" },
      {
        name: "description",
        content:
          "A personalized Express Entry tracker for Canada: check your CRS score against recent rounds, with cutoffs always shown in round-type context.",
      },
      { property: "og:title", content: "CRS Compass — Latest Express Entry draw" },
      {
        property: "og:description",
        content:
          "Track the latest Express Entry rounds, cutoff scores and round types — always with the context that makes them meaningful.",
      },
    ],
  }),
  component: Index,
});

// Program chip definitions. `value: null` is the "General only" clear-all
// action; every other entry is a specific program that can toggle on/off
// alongside its siblings.
const PROGRAM_CHIPS: { value: Program | null; label: string }[] = [
  { value: null, label: "General only" },
  { value: "CEC", label: "CEC" },
  { value: "FSW", label: "FSW" },
  { value: "FST", label: "FST" },
  { value: "PNP", label: "PNP (I hold a nomination)" },
];

function HeroKicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase"
      style={{ color: "rgba(246,241,232,0.6)" }}
    >
      {children}
    </p>
  );
}

// Action pill shared across the three actions under the result panel.
function ActionPill({
  children,
  onClick,
  to,
  ariaExpanded,
  muted = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  ariaExpanded?: boolean;
  muted?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";
  const active =
    "border-[color-mix(in_srgb,var(--brand)_28%,transparent)] text-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]";
  const dim =
    "border-[var(--rule)] text-muted-foreground hover:text-foreground";
  const cls = `${base} ${muted ? dim : active}`;

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-expanded={ariaExpanded} className={cls}>
      {children}
    </button>
  );
}

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const { raw, setRaw, score } = useScore();
  const { elig, setElig, resetElig, hasEligibility } = useCrsProfile();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    capture(EVENTS.LANDING_VIEWED);
  }, []);

  const latestRelevant = data?.find((d) => isRelevantDraw(d, elig));
  const latestFallback = data?.[0];
  const latest = latestRelevant ?? latestFallback;
  const isRelevantLatest = latestRelevant !== undefined && latestRelevant === latest;

  const generalOnlySelected = elig.programs.length === 0;
  const allCategoriesSelected = elig.categories.length === 0;

  const toggleProgram = (value: Program | null) => {
    if (value === null) {
      // "General only" is the clear-all action for the program dimension.
      setElig((e) => ({ ...e, programs: [] }));
      return;
    }
    setElig((e) => ({
      ...e,
      programs: e.programs.includes(value)
        ? e.programs.filter((p) => p !== value)
        : [...e.programs, value],
    }));
  };

  const toggleCategory = (name: string) =>
    setElig((e) => ({
      ...e,
      categories: e.categories.includes(name)
        ? e.categories.filter((c) => c !== name)
        : [...e.categories, name],
    }));

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero — inputs only. */}
      <section
        className="rounded-[calc(var(--radius)*1.5)] px-6 py-8 sm:px-10 sm:py-10"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1
            className="display max-w-[16ch] text-[2.25rem] leading-[1.05] font-semibold sm:text-[2.75rem]"
            style={{ color: "var(--paper)" }}
          >
            See where your score lands.
          </h1>
          <button
            type="button"
            onClick={resetElig}
            disabled={!hasEligibility}
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ color: "var(--accent-soft)" }}
            aria-label="Reset eligibility to General only + All categories"
          >
            <RotateCcw aria-hidden className="h-3 w-3" />
            Reset
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          {/* CRS score input */}
          <div className="md:col-span-3">
            <HeroKicker>CRS score</HeroKicker>
            <label htmlFor="crs-score" className="sr-only">
              Enter your CRS score
            </label>
            <div
              className="mt-3 rounded-[var(--radius)] border px-4 py-2 transition-colors focus-within:border-[var(--accent-soft)]"
              style={{
                borderColor: "rgba(246,241,232,0.28)",
                backgroundColor: "rgba(246,241,232,0.05)",
              }}
            >
              <input
                id="crs-score"
                inputMode="numeric"
                autoComplete="off"
                placeholder="—"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="figure w-full bg-transparent text-[2rem] leading-tight outline-none sm:text-[2.25rem]"
                style={{ color: "var(--accent-soft)" }}
              />
            </div>
          </div>

          {/* Program eligibility chips (multi-select; General only = clear all) */}
          <div className="md:col-span-4">
            <HeroKicker>Program eligibility</HeroKicker>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROGRAM_CHIPS.map((p) => (
                <FilterChip
                  key={p.label}
                  label={p.label}
                  selected={
                    p.value === null ? generalOnlySelected : elig.programs.includes(p.value)
                  }
                  onClick={() => toggleProgram(p.value)}
                  tone="dark"
                />
              ))}
            </div>
          </div>

          {/* Category eligibility chips (multi-select; All categories = clear all) */}
          <div className="md:col-span-5">
            <HeroKicker>Category eligibility</HeroKicker>
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip
                label="All categories"
                selected={allCategoriesSelected}
                onClick={() => setElig((e) => ({ ...e, categories: [] }))}
                tone="dark"
              />
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  selected={elig.categories.includes(c)}
                  onClick={() => toggleCategory(c)}
                  tone="dark"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Result panel — the answer produced by the hero's inputs. */}
      <section
        className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8"
        style={{
          backgroundColor: "var(--brand-soft)",
          borderColor: "color-mix(in srgb, var(--brand) 12%, transparent)",
        }}
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">
            Data not available yet — the daily refresh runs at ~9am ET.
          </p>
        ) : (
          <>
            {/* Absolute-latest signal — surfaces when the user's filter
                excludes a more recent draw than the one they're looking at.
                Prevents someone in "General only" from thinking the site is
                stale when IRCC actually just ran a CEC round today. */}
            {latestFallback && latestFallback !== latest && (
              <div className="mb-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[color-mix(in_srgb,var(--brand)_15%,transparent)] pb-4 text-xs text-muted-foreground">
                <span className="uppercase tracking-[0.14em]">
                  Most recent IRCC round overall:
                </span>
                <span className="tabular-nums text-ink">
                  {formatDate(latestFallback.draw_date)} · {latestFallback.cutoff_score}
                </span>
                <RoundBadge draw={latestFallback} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Cutoff */}
              <div>
                <p className="kicker">
                  {isRelevantLatest && hasEligibility
                    ? "Latest relevant cutoff"
                    : "Latest cutoff in this view"}
                </p>
                <div className="figure mt-2 text-[2.75rem] leading-none text-ink sm:text-[3.25rem]">
                  {latest.cutoff_score}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RoundBadge draw={latest} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDate(latest.draw_date)}
                </p>
              </div>

              {/* User score */}
              <div>
                <p className="kicker">Your score</p>
                <div
                  className="figure mt-2 text-[2.75rem] leading-none sm:text-[3.25rem]"
                  style={{
                    color: score != null ? "var(--brand)" : "var(--muted-foreground)",
                  }}
                >
                  {score ?? "—"}
                </div>
                <div className="mt-3">
                  <ScoreScale cutoffDraw={latest} score={score} tone="light" />
                </div>
                {score != null && (
                  <p className="mt-3 text-sm font-medium">
                    {(() => {
                      const diff = score - latest.cutoff_score;
                      if (diff > 0)
                        return (
                          <span style={{ color: "var(--brand)" }}>+{diff} above cutoff</span>
                        );
                      if (diff < 0)
                        return (
                          <span style={{ color: "var(--accent)" }}>{diff} below cutoff</span>
                        );
                      return (
                        <span className="text-muted-foreground">
                          Matched cutoff · tie-break applies
                        </span>
                      );
                    })()}
                  </p>
                )}
              </div>
            </div>

            {elig.programs.includes("PNP") && (
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-ink">PNP:</strong> cutoffs include the automatic
                600-point nomination bonus. Only meaningful if you actually hold a nomination.
              </p>
            )}

            {/* Actions — three consistent pill controls. */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[color-mix(in_srgb,var(--brand)_18%,transparent)] pt-5">
              <ActionPill onClick={() => setShowMore((s) => !s)} ariaExpanded={showMore}>
                {showMore ? "Hide details" : "More details"}
              </ActionPill>
              <ActionPill to="/history">View full history</ActionPill>
              <ActionPill to="/plan" muted>
                Plan your score
                <span
                  aria-label="Coming soon"
                  className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Coming soon
                </span>
              </ActionPill>
            </div>

            {showMore && (
              <div className="mt-5 text-sm leading-relaxed text-muted-foreground">
                <ul className="space-y-2">
                  <li>
                    <strong className="text-ink">General rounds</strong> are always included in
                    the view.
                  </li>
                  <li>
                    <strong className="text-ink">General only</strong> excludes program-specific
                    rounds — no PNP, CEC, FSW, or FST until you pick one.
                  </li>
                  <li>
                    <strong className="text-ink">All categories</strong> passes every
                    category-based round. Selecting specific categories narrows to those.
                  </li>
                  <li>
                    Comparison states are <strong className="text-ink">above</strong>,{" "}
                    <strong className="text-ink">matched</strong> (tie-break applies), and{" "}
                    <strong className="text-ink">below</strong>. Historical outcomes only —
                    cutoffs are not predictions.
                  </li>
                  <li>
                    Data comes directly from IRCC and refreshes daily. See the footer for the
                    last refresh timestamp.
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* Everything below stays unchanged — same filter state. */}
      <RecentRelevantDraws elig={elig} hasEligibility={hasEligibility} />
      <PersonalScoreSection score={score} elig={elig} />
    </div>
  );
}
