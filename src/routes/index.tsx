import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge } from "@/components/RoundBadge";
import { SourceLink, formatDate } from "@/components/DrawMeta";
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">CRS Compass</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A personalized Express Entry tracker for Canada.
        </p>
      </div>

      <section aria-labelledby="cta-heading" className="mt-10">
        <Card className="border-primary/30 bg-card">
          <CardContent className="p-8">
            <h2 id="cta-heading" className="text-2xl font-bold tracking-tight md:text-3xl">
              See where your score stands
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Enter your CRS score and see which of the most recent Express Entry rounds you would
              have cleared — filtered to the ones that actually apply to you. This isn&apos;t a
              prediction — nobody can predict future cutoffs — but knowing what has already happened
              is often more useful.
            </p>
            <Link
              to="/would-i-have-made-it"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Check my score →
            </Link>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="latest-heading" className="mt-14">
        <h2 id="latest-heading" className="text-sm font-semibold text-muted-foreground uppercase">
          Most recent round
        </h2>
        {isLoading ? (
          <Card className="mt-4">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-16 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardContent>
          </Card>
        ) : !latest ? (
          <Card className="mt-4">
            <CardContent className="p-6 text-muted-foreground">
              Data not available yet — the daily refresh runs at ~9am ET.
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardContent className="p-8">
              <div className="flex flex-wrap items-center gap-4">
                <RoundBadge draw={latest} size="lg" />
                <div className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  {latest.cutoff_score}{" "}
                  <span className="text-xl font-semibold text-muted-foreground md:text-2xl">
                    CRS
                  </span>
                </div>
              </div>
              <dl className="mt-8 grid grid-cols-2 gap-5 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">{formatDate(latest.draw_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Round</dt>
                  <dd className="font-medium">#{latest.round_number}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Invitations issued</dt>
                  <dd className="font-medium">
                    {latest.invitations_issued.toLocaleString("en-CA")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tie-break</dt>
                  <dd className="font-medium">
                    {latest.tie_break_timestamp
                      ? new Date(latest.tie_break_timestamp).toLocaleString("en-CA")
                      : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 text-sm">
                <SourceLink
                  url={latest.source_url}
                  from="latest"
                  roundNumber={latest.round_number}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="mt-14">
        <h2 id="recent-heading" className="text-sm font-semibold text-muted-foreground uppercase">
          Recent rounds
        </h2>
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="p-4">
                  <Skeleton className="h-6 w-full" />
                </li>
              ))
            : recent.map((d) => (
                <li
                  key={d.round_number}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-28 shrink-0 text-muted-foreground">
                      {formatDate(d.draw_date)}
                    </span>
                    <RoundBadge draw={d} />
                  </div>
                  <span className="font-semibold">{d.cutoff_score} CRS</span>
                </li>
              ))}
        </ul>
        <p className="mt-5 text-sm">
          <Link
            to="/would-i-have-made-it"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            See which of these rounds you would have cleared →
          </Link>
        </p>
      </section>

      <section className="mt-16 max-w-2xl">
        <h2 className="text-lg font-semibold">What is Express Entry?</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Express Entry is the system Canada uses to manage applications for several permanent
          residence programs. Candidates sit in one national pool with a Comprehensive Ranking
          System (CRS) score, and IRCC periodically invites the highest-ranked candidates in a
          round of invitations. The cutoff score of each round is simply the score of the last
          person invited — it depends on who was in the pool and how many invitations were issued.
        </p>
        <p className="mt-4 text-sm">
          <Link
            to="/about"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            More about how this works, and what it doesn&apos;t tell you
          </Link>
        </p>
      </section>
    </div>
  );
}
