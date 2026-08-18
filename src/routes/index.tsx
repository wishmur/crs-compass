import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge, RoundDot } from "@/components/RoundBadge";
import { ScoreCompare } from "@/components/ScoreCompare";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { roundLabel } from "@/data/round-types";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";

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

const SCORE_KEY = "crsSignal.score";

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));
  const [score, setScore] = useState("");

  useEffect(() => {
    capture(EVENTS.LANDING_VIEWED);
    try {
      const s = localStorage.getItem(SCORE_KEY);
      if (s) setScore(s);
    } catch {
      /* ignore */
    }
  }, []);

  const latest = data?.[0];
  const recent = data?.slice(1, 7) ?? [];

  const n = Number(score);
  const validScore = score !== "" && Number.isFinite(n) && n >= 0 && n <= 1200;
  const userScore = validScore ? n : null;

  const scale = (() => {
    const scores = (data ?? []).map((d) => d.cutoff_score);
    if (!scores.length) return { min: 0, max: 1, span: 1 };
    const min = Math.min(...scores, userScore ?? Infinity);
    const max = Math.max(...scores, userScore ?? -Infinity);
    const pad = Math.max(8, Math.round((max - min) * 0.15));
    const lo = min - pad;
    const hi = max + pad;
    return { min: lo, max: hi, span: Math.max(1, hi - lo) };
  })();

  const pct = (v: number) => ((v - scale.min) / scale.span) * 100;

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero — the comparison is the product */}
      <section aria-labelledby="cta-heading" className="grid gap-10 pt-10 pb-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <p className="section-label">Express Entry, in context</p>
          <h1
            id="cta-heading"
            className="display mt-3 text-5xl text-foreground sm:text-6xl"
          >
            See where your score
            <span className="block italic text-teal">stands today.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-muted-foreground">
            Type your CRS score. We place it against the most recent round&apos;s cutoff — and on
            the next page, against every round that actually applies to you.
          </p>

          <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-4">
            <label className="block">
              <span className="section-label">Your CRS score</span>
              <input
                type="number"
                min={0}
                max={1200}
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="486"
                aria-label="Your CRS score"
                className="figure-xl mt-2 block w-44 border-b-2 border-rule bg-transparent pb-1 text-6xl text-foreground transition-colors outline-none placeholder:text-muted-foreground/35 focus:border-burnt"
              />
            </label>

            <Link
              to="/would-i-have-made-it"
              className="group inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-teal-deep"
            >
              Check my score
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Live comparison against the latest cutoff */}
        <div className="lg:col-span-5 lg:pt-8">
          {latest ? (
            <div className="border-l-2 border-peach pl-6">
              <p className="section-label">Against the latest round</p>
              <ScoreCompare
                className="mt-4"
                cutoff={latest.cutoff_score}
                score={userScore}
                cutoffLabel={`cutoff ${latest.cutoff_score}`}
              />
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {userScore == null ? (
                  <>Enter a score to see it placed on this scale.</>
                ) : userScore >= latest.cutoff_score ? (
                  <>
                    You are{" "}
                    <span className="num font-medium text-result-pass">
                      {userScore - latest.cutoff_score} above
                    </span>{" "}
                    the {roundLabel(latest)} cutoff of {latest.cutoff_score}.
                  </>
                ) : (
                  <>
                    You are{" "}
                    <span className="num font-medium text-result-fail">
                      {latest.cutoff_score - userScore} below
                    </span>{" "}
                    the {roundLabel(latest)} cutoff of {latest.cutoff_score}.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="border-l-2 border-peach pl-6 text-sm text-muted-foreground">
              Data not available yet — the daily refresh runs at ~9am ET.
            </div>
          )}
        </div>
      </section>

      {/* Latest draw — a data headline, not a card */}
      <section aria-labelledby="latest-heading" className="rule-t pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-heading" className="section-label">
            Latest draw
          </h2>
          <Link
            to="/history"
            className="text-xs font-medium text-burnt transition-opacity hover:opacity-70"
          >
            All history →
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ) : !latest ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Data not available yet — the daily refresh runs at ~9am ET.
          </p>
        ) : (
          <div className="mt-5 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <span className="figure-xl text-[5.5rem] text-foreground sm:text-[7rem]">
                  {latest.cutoff_score}
                </span>
                <div className="mb-3 space-y-2">
                  <RoundBadge draw={latest} size="lg" />
                  <p className="num text-sm text-muted-foreground">
                    {formatDate(latest.draw_date)} · Round #{latest.round_number}
                  </p>
                </div>
              </div>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                The cutoff is the CRS score of the last candidate invited in this round — it only
                means something alongside the round type above.
              </p>
            </div>

            <dl className="lg:col-span-5 lg:pt-4">
              {[
                {
                  t: "Invitations issued",
                  v: latest.invitations_issued.toLocaleString("en-CA"),
                },
                {
                  t: "Tie-break",
                  v: latest.tie_break_timestamp
                    ? new Date(latest.tie_break_timestamp).toLocaleString("en-CA")
                    : "—",
                },
              ].map((f) => (
                <div
                  key={f.t}
                  className="flex items-baseline justify-between gap-6 py-2.5 [&+div]:hairline-t"
                >
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">{f.t}</dt>
                  <dd className="num text-sm font-medium text-foreground">{f.v}</dd>
                </div>
              ))}
              <div className="hairline-t py-2.5 text-xs">
                <SourceLink
                  url={latest.source_url}
                  from="latest"
                  roundNumber={latest.round_number}
                />
              </div>
            </dl>
          </div>
        )}
      </section>

      {/* Recent rounds */}
      <section aria-labelledby="recent-heading" className="rule-t mt-12 pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-heading" className="section-label">
            Recent rounds
          </h2>
          {userScore != null && (
            <p className="num text-xs text-muted-foreground">
              Compared against your score of {userScore}
            </p>
          )}
        </div>

        <ul className="mt-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="py-4">
                  <Skeleton className="h-6 w-full" />
                </li>
              ))
            : recent.map((d) => {
                const cleared = userScore != null && userScore >= d.cutoff_score;
                return (
                  <li
                    key={d.round_number}
                    className="group hairline-t flex items-center gap-4 py-3 transition-colors hover:bg-surface-sunken/70"
                  >
                    <RoundDot draw={d} />
                    <span className="num w-24 shrink-0 text-xs text-muted-foreground">
                      {formatDate(d.draw_date)}
                    </span>
                    <span className="hidden min-w-0 flex-1 truncate text-sm text-foreground sm:block">
                      {roundLabel(d)}
                    </span>
                    <span className="relative hidden h-4 w-40 shrink-0 md:block">
                      <span className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-track" />
                      <span
                        aria-hidden
                        className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-foreground/60"
                        style={{ left: `${pct(d.cutoff_score)}%` }}
                      />
                      {userScore != null && (
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{
                            left: `${pct(userScore)}%`,
                            backgroundColor: cleared
                              ? "var(--result-pass)"
                              : "var(--result-fail)",
                          }}
                        />
                      )}
                    </span>
                    <span className="num ml-auto w-14 shrink-0 text-right text-[0.95rem] font-medium text-foreground">
                      {d.cutoff_score}
                    </span>
                  </li>
                );
              })}
        </ul>

        <p className="mt-5 text-sm">
          <Link
            to="/would-i-have-made-it"
            className="inline-flex items-center gap-1.5 font-medium text-burnt transition-opacity hover:opacity-70"
          >
            See which of these rounds you would have cleared
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </section>

      {/* Explainer — offset, colored surface */}
      <section className="mt-14 mb-6 lg:grid lg:grid-cols-12">
        <div className="sunken p-7 lg:col-span-9 lg:col-start-2 sm:p-9">
          <h2 className="display text-2xl text-foreground">What is Express Entry?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Express Entry is the system Canada uses to manage applications for several permanent
            residence programs. Candidates sit in one national pool with a Comprehensive Ranking
            System (CRS) score, and IRCC periodically invites the highest-ranked candidates in a
            round of invitations. The cutoff score of each round is simply the score of the last
            person invited — it depends on who was in the pool and how many invitations were
            issued.
          </p>
          <p className="mt-4 text-sm">
            <Link
              to="/about"
              className="font-medium text-burnt transition-opacity hover:opacity-70"
            >
              More about how this works, and what it doesn&apos;t tell you →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
