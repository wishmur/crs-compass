import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge, RoundDot } from "@/components/RoundBadge";
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

function Index() {
  const { data, isLoading } = useQuery(drawsQuery(8));

  useEffect(() => {
    capture(EVENTS.LANDING_VIEWED);
  }, []);

  const latest = data?.[0];
  const recent = data?.slice(1, 7) ?? [];

  const scale = (() => {
    const scores = (data ?? []).map((d) => d.cutoff_score);
    if (!scores.length) return { min: 0, max: 1, span: 1 };
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const pad = Math.max(8, Math.round((max - min) * 0.15));
    const lo = min - pad;
    const hi = max + pad;
    return { min: lo, max: hi, span: Math.max(1, hi - lo) };
  })();

  const pct = (score: number) => ((score - scale.min) / scale.span) * 100;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-4 sm:pt-14">
      {/* Primary moment — start here */}
      <section aria-labelledby="cta-heading">
        <p className="section-label">Start here</p>
        <h1
          id="cta-heading"
          className="mt-3 max-w-2xl text-3xl leading-[1.1] font-semibold text-foreground sm:text-4xl"
        >
          See where your score stands
          <span className="block text-muted-foreground">against the rounds that apply to you.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Enter your CRS score and see which recent Express Entry rounds you would have cleared.
          Not a prediction — nobody can predict future cutoffs — but what already happened is
          usually more useful.
        </p>

        <Link
          to="/would-i-have-made-it"
          className="surface surface-hover group mt-7 flex max-w-xl items-center gap-3 p-2 pl-5 ring-1 ring-primary/10 transition-all hover:-translate-y-0.5 hover:ring-primary/25"
        >
          <span className="flex-1 text-[0.95rem] text-muted-foreground transition-colors group-hover:text-foreground">
            Enter your CRS score — e.g. 486
          </span>
          <span className="inline-flex items-center gap-2 rounded-[calc(var(--radius)-0.35rem)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            Check my score
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      {/* Latest round */}
      <section aria-labelledby="latest-heading" className="mt-20">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-heading" className="section-label">
            Most recent round
          </h2>
          <Link
            to="/history"
            className="text-xs font-medium text-primary transition-opacity hover:opacity-70"
          >
            All history →
          </Link>
        </div>

        {isLoading ? (
          <div className="surface mt-4 space-y-4 p-8">
            <Skeleton className="h-16 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ) : !latest ? (
          <div className="sunken mt-4 p-8 text-sm text-muted-foreground">
            Data not available yet — the daily refresh runs at ~9am ET.
          </div>
        ) : (
          <div className="surface mt-4 overflow-hidden">
            <div className="p-7 sm:p-9">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="num text-6xl leading-none font-semibold text-foreground sm:text-7xl">
                  {latest.cutoff_score}
                  <span className="ml-2 align-baseline text-lg font-medium text-muted-foreground sm:text-xl">
                    CRS
                  </span>
                </div>
                <RoundBadge draw={latest} size="lg" className="mb-1.5" />
              </div>

              {/* Where this cutoff sits against the last 8 rounds */}
              <div className="mt-8 max-w-md">
                <div className="score-track relative h-1.5">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                    style={{ width: `${pct(latest.cutoff_score)}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
                    style={{ left: `${pct(latest.cutoff_score)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Position among the last {data?.length ?? 0} rounds of any type
                </p>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 text-sm sm:grid-cols-4">
                {[
                  { t: "Date", v: formatDate(latest.draw_date) },
                  { t: "Round", v: `#${latest.round_number}` },
                  {
                    t: "Invitations",
                    v: latest.invitations_issued.toLocaleString("en-CA"),
                  },
                  {
                    t: "Tie-break",
                    v: latest.tie_break_timestamp
                      ? new Date(latest.tie_break_timestamp).toLocaleString("en-CA")
                      : "—",
                  },
                ].map((f) => (
                  <div key={f.t}>
                    <dt className="text-xs text-muted-foreground">{f.t}</dt>
                    <dd className="num mt-1 font-medium text-foreground">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="hairline-t bg-surface-sunken/60 px-7 py-4 text-xs sm:px-9">
              <SourceLink url={latest.source_url} from="latest" roundNumber={latest.round_number} />
            </div>
          </div>
        )}
      </section>

      {/* Recent rounds */}
      <section aria-labelledby="recent-heading" className="mt-20">
        <h2 id="recent-heading" className="section-label">
          Recent rounds
        </h2>

        <ul className="mt-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="py-4 first:pt-0">
                  <Skeleton className="h-6 w-full" />
                </li>
              ))
            : recent.map((d) => (
                <li
                  key={d.round_number}
                  className="group -mx-3 flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-surface [&+li]:hairline-t"
                >
                  <RoundDot draw={d} />
                  <span className="num w-24 shrink-0 text-xs text-muted-foreground">
                    {formatDate(d.draw_date)}
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate text-sm text-foreground sm:block">
                    {roundLabel(d)}
                  </span>
                  <span className="score-track hidden h-1.5 w-32 shrink-0 md:block">
                    <span
                      className="block h-full rounded-full bg-primary/40 transition-all duration-300 group-hover:bg-primary/70"
                      style={{ width: `${pct(d.cutoff_score)}%` }}
                    />
                  </span>
                  <span className="num ml-auto w-16 shrink-0 text-right text-sm font-semibold text-foreground">
                    {d.cutoff_score}
                  </span>
                </li>
              ))}
        </ul>

        <p className="mt-6 text-sm">
          <Link
            to="/would-i-have-made-it"
            className="inline-flex items-center gap-1.5 font-medium text-primary transition-opacity hover:opacity-70"
          >
            See which of these rounds you would have cleared
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </section>

      {/* Explainer */}
      <section className="sunken mt-20 max-w-3xl p-7 sm:p-9">
        <h2 className="text-lg font-semibold text-foreground">What is Express Entry?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Express Entry is the system Canada uses to manage applications for several permanent
          residence programs. Candidates sit in one national pool with a Comprehensive Ranking
          System (CRS) score, and IRCC periodically invites the highest-ranked candidates in a round
          of invitations. The cutoff score of each round is simply the score of the last person
          invited — it depends on who was in the pool and how many invitations were issued.
        </p>
        <p className="mt-5 text-sm">
          <Link
            to="/about"
            className="font-medium text-primary transition-opacity hover:opacity-70"
          >
            More about how this works, and what it doesn&apos;t tell you →
          </Link>
        </p>
      </section>
    </div>
  );
}
