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
import { CATEGORIES, type Program } from "@/data/round-types";

const SCORE_KEY = "crsSignal.score";

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

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const [raw, setRaw] = useState("");
  const { elig, setElig, resetElig, hasEligibility } = useCrsProfile();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    capture(EVENTS.LANDING_VIEWED);
    try {
      const stored = window.localStorage.getItem(SCORE_KEY);
      if (stored) setRaw(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (raw) window.localStorage.setItem(SCORE_KEY, raw);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [raw]);

  const parsed = Number.parseInt(raw, 10);
  const score = Number.isFinite(parsed) && parsed > 0 && parsed <= 1200 ? parsed : null;

  const latestRelevant = data?.find((d) => isRelevantDraw(d, elig));
  const latestFallback = data?.[0];
  const latest = latestRelevant ?? latestFallback;
  const isRelevantLatest = latestRelevant !== undefined && latestRelevant === latest;

  const allCategoriesSelected = elig.categories.length === 0;
  const canReset = hasEligibility;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero — inputs only. No result metrics, no explanatory copy. */}
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
            disabled={!canReset}
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
                onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="figure w-full bg-transparent text-[2rem] leading-tight outline-none sm:text-[2.25rem]"
                style={{ color: "var(--accent-soft)" }}
              />
            </div>
          </div>

          {/* Program eligibility chips */}
          <div className="md:col-span-4">
            <HeroKicker>Program eligibility</HeroKicker>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROGRAM_CHIPS.map((p) => (
                <FilterChip
                  key={p.label}
                  label={p.label}
                  selected={elig.program === p.value}
                  onClick={() => setElig((e) => ({ ...e, program: p.value }))}
                  tone="dark"
                />
              ))}
            </div>
          </div>

          {/* Category eligibility chips */}
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
                  onClick={() =>
                    setElig((e) => ({
                      ...e,
                      categories: e.categories.includes(c)
                        ? e.categories.filter((x) => x !== c)
                        : [...e.categories, c],
                    }))
                  }
                  tone="dark"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Result panel — pale-green tint sits right under the hero. Shows the
          answer produced by the hero's inputs; nothing more. */}
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
                          <span style={{ color: "var(--accent)" }}>
                            {diff} below cutoff
                          </span>
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

            {/* PNP note — surfaces only when the user has opted into PNP.
                Kept minimal and inline here (out of the hero) per the
                "no explanatory copy in the hero" rule. */}
            {elig.program === "PNP" && (
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-ink">PNP:</strong> cutoffs include the automatic
                600-point nomination bonus. Only meaningful if you actually hold a nomination.
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color-mix(in_srgb,var(--brand)_18%,transparent)] pt-5 text-sm">
              <button
                type="button"
                onClick={() => setShowMore((s) => !s)}
                className="font-medium text-[var(--brand)] transition-opacity hover:opacity-70"
                aria-expanded={showMore}
              >
                {showMore ? "Hide details ↑" : "More details ↓"}
              </button>
              <Link
                to="/history"
                className="font-medium text-[var(--brand)] transition-opacity hover:opacity-70"
              >
                View full history →
              </Link>
              <span
                className="inline-flex items-center gap-1.5 text-muted-foreground/70"
                title="Score sensitivity — try your score +5 / +10 / +20. Not built yet."
              >
                Plan your score
                <span className="rounded-full border border-[var(--rule)] px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider">
                  Coming soon
                </span>
              </span>
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
