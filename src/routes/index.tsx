import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge, RoundDot } from "@/components/RoundBadge";
import { ScoreScale } from "@/components/ScoreScale";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { roundLabel } from "@/data/round-types";
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
  const recent = data?.slice(0, 6) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-6">
        {/* Left 6 columns: heading */}
        <div className="md:col-span-6">
          <p className="kicker">Express Entry, in context</p>
          <h1 className="display mt-3 max-w-[14ch] text-[2.5rem] leading-[1.05] font-semibold text-ink sm:text-[3rem]">
            See where your score stands.
          </h1>
        </div>

        {/* Right 6 columns: cutoff + score + timeline */}
        <div className="md:col-span-6">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !latest ? (
            <p className="text-sm text-muted-foreground">
              Data not available yet — the daily refresh runs at ~9am ET.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Latest cutoff */}
              <div>
                <div className="kicker">Latest cutoff</div>
                <div className="figure mt-1 text-[3rem] leading-none text-ink sm:text-[3.5rem]">
                  {latest.cutoff_score}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <RoundBadge draw={latest} />
                  <span>·</span>
                  <span>{formatDate(latest.draw_date)}</span>
                </div>
              </div>

              {/* Your score */}
              <div>
                <label htmlFor="crs-score" className="kicker">
                  Your score
                </label>
                <div className="mt-1 border-b border-rule pb-1">
                  <input
                    id="crs-score"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="—"
                    value={raw}
                    onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="figure w-full bg-transparent text-[3rem] leading-none text-ink outline-none placeholder:text-rule sm:text-[3.5rem]"
                  />
                </div>
              </div>

              {/* Timeline spanning both columns */}
              <div className="sm:col-span-2">
                <div className="pt-2">
                  <ScoreScale cutoffDraw={latest} score={score} />
                </div>
                {score != null && (
                  <div className="mt-3 text-sm font-medium">
                    {(() => {
                      const diff = score - latest.cutoff_score;
                      if (diff > 0) {
                        return <span className="text-brand">+{diff} above cutoff</span>;
                      }
                      if (diff < 0) {
                        return <span className="text-accent">{Math.abs(diff)} below cutoff</span>;
                      }
                      return <span className="text-muted-foreground">At the cutoff</span>;
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Latest draw — editorial block */}
      <section aria-labelledby="latest-heading" className="mt-20 border-t border-rule pt-10">
        <h2 id="latest-heading" className="kicker">
          Latest draw
        </h2>

        {isLoading ? (
          <Skeleton className="mt-6 h-28 w-72" />
        ) : !latest ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Data not available yet — the daily refresh runs at ~9am ET.
          </p>
        ) : (
          <div className="mt-6 grid gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="figure text-7xl text-ink md:text-8xl">{latest.cutoff_score}</span>
                <RoundBadge draw={latest} size="lg" />
              </div>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                The cutoff is the score of the last candidate invited in this round.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Round #{latest.round_number} · {formatDate(latest.draw_date)}
              </p>
            </div>

            <dl className="space-y-4 text-sm md:min-w-56 md:text-right">
              <div>
                <dt className="kicker">Invitations issued</dt>
                <dd className="mt-1 font-medium tabular-nums text-ink">
                  {latest.invitations_issued.toLocaleString("en-CA")}
                </dd>
              </div>
              <div>
                <dt className="kicker">Tie-break timestamp</dt>
                <dd className="mt-1 font-medium tabular-nums text-ink">
                  {latest.tie_break_timestamp
                    ? new Date(latest.tie_break_timestamp).toLocaleString("en-CA")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="kicker">Source</dt>
                <dd className="mt-1 text-ink">
                  <SourceLink
                    url={latest.source_url}
                    from="latest"
                    roundNumber={latest.round_number}
                  />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Recent rounds */}
      <section aria-labelledby="recent-heading" className="mt-16 border-t border-rule pt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-heading" className="kicker">
            Recent rounds
          </h2>
          <Link to="/history" className="text-xs font-medium text-brand hover:opacity-70">
            All history →
          </Link>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="kicker py-2 font-semibold">Date</th>
              <th className="kicker py-2 font-semibold">Round type</th>
              <th className="kicker py-2 text-right font-semibold">Cutoff</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              : recent.map((d) => (
                  <tr key={d.round_number} className="border-b border-rule/70">
                    <td className="py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(d.draw_date)}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-2 text-ink">
                        <RoundDot draw={d} />
                        {roundLabel(d)}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums text-ink">
                      {d.cutoff_score}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </section>

      {/* Explainer */}
      <section className="mt-16 max-w-2xl border-t border-rule pt-10">
        <h2 className="display text-2xl font-semibold text-ink">What is Express Entry?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Express Entry is the system Canada uses to manage applications for several permanent
          residence programs. Candidates sit in one national pool with a Comprehensive Ranking
          System (CRS) score, and IRCC periodically invites the highest-ranked candidates in a round
          of invitations. The cutoff score of each round is simply the score of the last person
          invited — it depends on who was in the pool and how many invitations were issued.
        </p>
        <p className="mt-5 text-sm">
          <Link to="/about" className="font-medium text-brand hover:opacity-70">
            More about how this works, and what it doesn&apos;t tell you →
          </Link>
        </p>
      </section>
    </div>
  );
}
