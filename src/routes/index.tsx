import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge } from "@/components/RoundBadge";
import { ScoreScale } from "@/components/ScoreScale";
import { formatDate } from "@/components/DrawMeta";
import { EligibilityInputs } from "@/components/EligibilityInputs";
import { RecentRelevantDraws } from "@/components/RecentRelevantDraws";
import { PersonalScoreSection } from "@/components/PersonalScoreSection";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { useCrsProfile, isRelevantDraw } from "@/lib/useCrsProfile";

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

// ─── Hero-scoped subcomponents ────────────────────────────────────────────
// Kept in this file (not extracted) because they only exist inside the hero
// and their styling is tightly coupled to the deep-green surface.

function HeroKicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
      style={{ color: "var(--accent-soft)" }}
    >
      {children}
    </p>
  );
}

function HeroTileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase"
      style={{ color: "rgba(246,241,232,0.6)" }}
    >
      {children}
    </p>
  );
}

/** Bordered inset used for the three YOUR VIEW tiles and the result panel. */
function HeroInset({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border ${className}`}
      style={{
        borderColor: "rgba(246,241,232,0.28)",
        backgroundColor: "rgba(246,241,232,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const [raw, setRaw] = useState("");
  const { elig, setElig, resetElig, hasEligibility } = useCrsProfile();

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

  // The single filter state — same instance drives Recent Draws and the
  // historical summary below the hero. "Latest in this view" is the most
  // recent draw matching that state.
  const latestRelevant = data?.find((d) => isRelevantDraw(d, elig));
  const latestFallback = data?.[0];
  const latest = latestRelevant ?? latestFallback;
  const isRelevantLatest = latestRelevant !== undefined && latestRelevant === latest;

  const programLabel = elig.program ?? "General only";
  const categoryLabel =
    elig.categories.length === 0
      ? "All categories"
      : elig.categories.length === 1
        ? elig.categories[0]!
        : `${elig.categories.length} categories`;

  const canReset = hasEligibility;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero — deep teal surface */}
      <section
        className="rounded-[calc(var(--radius)*1.5)] px-6 py-10 sm:px-10 sm:py-12"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-10">
          {/* Left — title only, no marketing subtitle */}
          <div className="md:col-span-5">
            <HeroKicker>Express Entry, in context</HeroKicker>
            <h1
              className="display mt-3 max-w-[14ch] text-[2.5rem] leading-[1.05] font-semibold sm:text-[3rem]"
              style={{ color: "var(--paper)" }}
            >
              See where your score lands.
            </h1>
          </div>

          {/* Right — YOUR VIEW + result */}
          <div className="md:col-span-7">
            {/* YOUR VIEW panel: score input + program/category readouts + reset */}
            <HeroInset className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <HeroKicker>Your view</HeroKicker>
                <button
                  type="button"
                  onClick={resetElig}
                  disabled={!canReset}
                  className="inline-flex items-center gap-1 text-xs font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ color: "var(--accent-soft)" }}
                  aria-label="Reset eligibility to General only + All categories"
                >
                  <RotateCcw aria-hidden className="h-3 w-3" />
                  Reset
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* CRS score input */}
                <div>
                  <HeroTileLabel>CRS score</HeroTileLabel>
                  <label htmlFor="crs-score" className="sr-only">
                    Enter your CRS score
                  </label>
                  <div
                    className="mt-1.5 rounded-[var(--radius)] border px-3 py-1.5 transition-colors focus-within:border-[var(--accent-soft)]"
                    style={{
                      borderColor: "rgba(246,241,232,0.28)",
                      backgroundColor: "rgba(246,241,232,0.04)",
                    }}
                  >
                    <input
                      id="crs-score"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="—"
                      value={raw}
                      onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="figure w-full bg-transparent text-[1.5rem] leading-tight outline-none"
                      style={{ color: "var(--accent-soft)" }}
                    />
                  </div>
                </div>

                {/* Program readout */}
                <div>
                  <HeroTileLabel>Program eligibility</HeroTileLabel>
                  <p
                    className="mt-1.5 truncate text-[0.95rem] font-medium"
                    style={{ color: "var(--paper)" }}
                    title={programLabel}
                  >
                    {programLabel}
                  </p>
                </div>

                {/* Category readout */}
                <div>
                  <HeroTileLabel>Category eligibility</HeroTileLabel>
                  <p
                    className="mt-1.5 truncate text-[0.95rem] font-medium"
                    style={{ color: "var(--paper)" }}
                    title={
                      elig.categories.length > 1 ? elig.categories.join(", ") : categoryLabel
                    }
                  >
                    {categoryLabel}
                  </p>
                </div>
              </div>
            </HeroInset>

            {/* Result panel — cutoff + user score + scale */}
            <div className="mt-4">
              {isLoading ? (
                <Skeleton className="h-40 w-full opacity-30" />
              ) : !latest ? (
                <HeroInset className="p-5 sm:p-6">
                  <p className="text-sm" style={{ color: "rgba(246,241,232,0.75)" }}>
                    Data not available yet — the daily refresh runs at ~9am ET.
                  </p>
                </HeroInset>
              ) : (
                <HeroInset className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <HeroTileLabel>
                        {isRelevantLatest && hasEligibility
                          ? "Latest relevant cutoff"
                          : "Latest cutoff in this view"}
                      </HeroTileLabel>
                      <div
                        className="figure mt-1 text-[2.75rem] leading-none sm:text-[3rem]"
                        style={{ color: "var(--paper)" }}
                      >
                        {latest.cutoff_score}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <RoundBadge draw={latest} />
                      </div>
                      <p
                        className="mt-1.5 text-xs"
                        style={{ color: "rgba(246,241,232,0.65)" }}
                      >
                        {formatDate(latest.draw_date)}
                      </p>
                    </div>

                    <div>
                      <HeroTileLabel>Your score</HeroTileLabel>
                      <div
                        className="figure mt-1 text-[2.75rem] leading-none sm:text-[3rem]"
                        style={{
                          color: score != null ? "var(--accent-soft)" : "rgba(246,241,232,0.35)",
                        }}
                      >
                        {score ?? "—"}
                      </div>
                      <div className="mt-3">
                        <ScoreScale cutoffDraw={latest} score={score} tone="dark" />
                      </div>
                      {score != null && (
                        <div
                          className="mt-2 text-sm font-medium"
                          style={{ color: "var(--accent-soft)" }}
                        >
                          {(() => {
                            const diff = score - latest.cutoff_score;
                            if (diff > 0) return `+${diff} above cutoff`;
                            if (diff < 0) return `${diff} below cutoff`;
                            return "Matched cutoff · tie-break applies";
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </HeroInset>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Same filter state drives all three sections below. */}
      <EligibilityInputs elig={elig} setElig={setElig} />
      <RecentRelevantDraws elig={elig} hasEligibility={hasEligibility} />
      <PersonalScoreSection score={score} elig={elig} />
    </div>
  );
}
