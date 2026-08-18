import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge } from "@/components/RoundBadge";
import { ScoreScale } from "@/components/ScoreScale";
import { formatDate } from "@/components/DrawMeta";
import { badgeTone, type Draw } from "@/data/round-types";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";

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

const TILE_BG: Record<string, string> = {
  general: "var(--brand-soft)",
  cec: "var(--brand-soft)",
  fsw: "var(--brand-soft)",
  fst: "var(--brand-soft)",
  pnp: "var(--accent-soft)",
  category: "var(--accent-soft)",
};

function DrawTile({ draw }: { draw: Draw }) {
  return (
    <article
      className="flex flex-col justify-between rounded-[var(--radius)] border border-[var(--rule)] p-5"
      style={{ backgroundColor: TILE_BG[badgeTone(draw)] ?? "var(--brand-soft)" }}
    >
      <div>
        <p className="text-xs text-muted-foreground tabular-nums">{formatDate(draw.draw_date)}</p>
        <div className="mt-2">
          <RoundBadge draw={draw} />
        </div>
      </div>
      <div className="mt-6">
        <div className="figure text-[2.75rem] leading-none text-ink">{draw.cutoff_score}</div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {draw.invitations_issued.toLocaleString("en-CA")} invitations
        </p>
      </div>
    </article>
  );
}

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const [raw, setRaw] = useState("");

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

  const latest = data?.[0];
  const recent = data?.slice(0, 4) ?? [];

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
                {/* Latest cutoff */}
                <div>
                  <div
                    className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: "rgba(246,241,232,0.65)" }}
                  >
                    Latest cutoff
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
                  <div
                    className="mt-1 border-b pb-1"
                    style={{ borderColor: "rgba(246,241,232,0.35)" }}
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

      {/* Recent draws */}
      <section aria-labelledby="recent-heading" className="mt-14">
        <h2 id="recent-heading" className="kicker">
          Recent draws
        </h2>

        {isLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Data not available yet — the daily refresh runs at ~9am ET.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((d) => (
              <DrawTile key={d.round_number} draw={d} />
            ))}
          </div>
        )}

        <p className="mt-5 text-sm">
          <Link to="/history" className="font-medium text-brand hover:opacity-70">
            View full history →
          </Link>
        </p>
      </section>

      {/* Personalized CTA */}
      <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--rule)] bg-card px-5 py-5">
        <p className="text-[0.95rem] text-ink">
          Want to see which of these you would have cleared?
        </p>
        <Link
          to="/would-i-have-made-it"
          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
        >
          Check My Score →
        </Link>
      </section>

      {/* Minimal About link */}
      <p className="mt-10 text-sm text-muted-foreground">
        <Link to="/about" className="underline underline-offset-4 hover:text-ink">
          New to Express Entry? Learn how it works →
        </Link>
      </p>
    </div>
  );
}
