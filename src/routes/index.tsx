import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const [raw, setRaw] = useState("");
  const { elig, setElig, hasEligibility } = useCrsProfile();

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

  // "Latest relevant" — the most recent draw matching current eligibility.
  // With no eligibility, isRelevantDraw excludes PNP (whose cutoffs assume a
  // 600-point nomination bonus), so users see a comparison that means
  // something in their context.
  const latestRelevant = data?.find((d) => isRelevantDraw(d, elig));
  const latestFallback = data?.[0];
  const latest = latestRelevant ?? latestFallback;
  const isRelevantLatest = latestRelevant !== undefined && latestRelevant === latest;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero — deep teal surface */}
      <section
        className="rounded-[calc(var(--radius)*1.5)] px-6 py-10 sm:px-10 sm:py-12"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          {/* Left 6 columns: heading */}
          <div className="md:col-span-6">
            <p
              className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "var(--accent-soft)" }}
            >
              Express Entry, in context
            </p>
            <h1
              className="display mt-3 max-w-[14ch] text-[2.5rem] leading-[1.05] font-semibold sm:text-[3rem]"
              style={{ color: "var(--paper)" }}
            >
              See where your score stands.
            </h1>
          </div>

          {/* Right 6 columns */}
          <div className="md:col-span-6">
            {isLoading ? (
              <Skeleton className="h-32 w-full opacity-30" />
            ) : !latest ? (
              <p className="text-sm" style={{ color: "rgba(246,241,232,0.75)" }}>
                Data not available yet — the daily refresh runs at ~9am ET.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Latest relevant cutoff */}
                <div>
                  <div
                    className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: "rgba(246,241,232,0.65)" }}
                  >
                    {isRelevantLatest ? "Latest relevant cutoff" : "Latest cutoff"}
                  </div>
                  <div
                    className="figure mt-1 text-[3rem] leading-none sm:text-[3.5rem]"
                    style={{ color: "var(--paper)" }}
                  >
                    {latest.cutoff_score}
                  </div>
                  <div
                    className="mt-2 flex flex-wrap items-center gap-2 text-xs"
                    style={{ color: "rgba(246,241,232,0.7)" }}
                  >
                    <RoundBadge draw={latest} />
                    <span>·</span>
                    <span>{formatDate(latest.draw_date)}</span>
                  </div>
                </div>

                {/* Your score */}
                <div>
                  <label
                    htmlFor="crs-score"
                    className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: "var(--accent-soft)" }}
                  >
                    Your score
                  </label>
                  {/* Boxed input — visually distinguishes user-editable score from the
                      static LATEST CUTOFF number to its left. */}
                  <div
                    className="mt-2 rounded-[var(--radius)] border px-4 py-2.5 transition-colors focus-within:border-[var(--accent-soft)]"
                    style={{
                      borderColor: "rgba(246,241,232,0.28)",
                      backgroundColor: "rgba(246,241,232,0.06)",
                    }}
                  >
                    <input
                      id="crs-score"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="—"
                      value={raw}
                      onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="figure w-full bg-transparent text-[3rem] leading-none outline-none sm:text-[3.5rem]"
                      style={{ color: "var(--accent-soft)" }}
                    />
                  </div>
                </div>

                {/* Comparison scale */}
                <div className="sm:col-span-2">
                  <div className="pt-2">
                    <ScoreScale cutoffDraw={latest} score={score} tone="dark" />
                  </div>
                  {score != null && (
                    <div className="mt-3 text-sm font-medium">
                      {(() => {
                        const diff = score - latest.cutoff_score;
                        if (diff > 0) {
                          return (
                            <span style={{ color: "var(--accent-soft)" }}>+{diff} above cutoff</span>
                          );
                        }
                        if (diff < 0) {
                          return (
                            <span style={{ color: "var(--accent-soft)" }}>
                              {Math.abs(diff)} below cutoff
                            </span>
                          );
                        }
                        return (
                          <span style={{ color: "rgba(246,241,232,0.7)" }}>At the cutoff</span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Progressive answer to "where do I stand?":
            1. eligibility inputs (chips)
            2. recent draws filtered by that eligibility
            3. paginated "what the history says" against the user's score
          Score flows from the hero above; eligibility is shared across all three via useCrsProfile. */}
      <EligibilityInputs elig={elig} setElig={setElig} />
      <RecentRelevantDraws elig={elig} hasEligibility={hasEligibility} />
      <PersonalScoreSection score={score} elig={elig} />
    </div>
  );
}
