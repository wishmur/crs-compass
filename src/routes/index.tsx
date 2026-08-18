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

  const verdict = (() => {
    if (!latest) return "Enter a score to see it placed on this scale.";
    if (score == null) return "Enter a score to see it placed on this scale.";
    const diff = score - latest.cutoff_score;
    const type = roundLabel(latest);
    return diff < 0
      ? `${Math.abs(diff)} points short of the most recent ${type} cutoff.`
      : `${diff} points above the most recent ${type} cutoff.`;
  })();

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
      {/* Hero */}
      <section className="grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <p className="kicker">Express Entry, in context</p>
          <h1 className="display mt-4 max-w-[14ch] text-[2.75rem] leading-[1.02] font-semibold text-ink md:text-[3.5rem]">
            See where your score stands.
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            Type your CRS score. We place it against the most recent round instantly, and against
            every historical round that actually applies to you on the deeper page.
          </p>

          <div className="mt-10 max-w-xs border-b border-rule pb-1">
            <label htmlFor="crs-score" className="kicker block">
              Your CRS score
            </label>
            <input
              id="crs-score"
              inputMode="numeric"
              autoComplete="off"
              placeholder="486"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="figure mt-2 w-full bg-transparent text-6xl text-ink outline-none placeholder:text-rule md:text-7xl"
            />
          </div>
        </div>

        {/* Live comparison */}
        <div className="md:pt-2">
          <p className="kicker">Against the latest round</p>
          {isLoading ? (
            <Skeleton className="mt-8 h-24 w-full" />
          ) : !latest ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Data not available yet — the daily refresh runs at ~9am ET.
            </p>
          ) : (
            <>
              <ScoreScale cutoffDraw={latest} score={score} />
              <p className="mt-6 text-[0.95rem] leading-relaxed text-ink">{verdict}</p>
              <p className="mt-4 text-sm">
                <Link
                  to="/would-i-have-made-it"
                  className="text-brand underline underline-offset-4 hover:no-underline"
                >
                  See where you stand across every relevant round →
                </Link>
              </p>
            </>
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
                The cutoff is the CRS score of the last candidate invited in this round — it only
                means something alongside the round type above.
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
