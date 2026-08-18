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
      { title: "CRS Signal — Latest Express Entry draw and cutoff" },
      {
        name: "description",
        content:
          "The most recent Express Entry round: cutoff score, invitations issued and round type, plus the last rounds at a glance.",
      },
      { property: "og:title", content: "CRS Signal — Latest Express Entry draw" },
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Where do you stand in Express Entry?
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Every round, every cutoff — always shown with the round type that gives it meaning.
      </p>

      <section aria-labelledby="latest-heading" className="mt-8">
        <h2 id="latest-heading" className="sr-only">
          Most recent round
        </h2>
        {isLoading ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-16 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardContent>
          </Card>
        ) : !latest ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              Data not available yet — the daily refresh runs at ~9am ET.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <RoundBadge draw={latest} size="lg" />
                <div className="leading-none">
                  <div className="text-xl font-semibold text-muted-foreground md:text-3xl">
                    {latest.cutoff_score} CRS
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
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
              <div className="mt-6 text-sm">
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

      <section aria-labelledby="recent-heading" className="mt-10">
        <h2 id="recent-heading" className="text-sm font-semibold text-muted-foreground uppercase">
          Recent rounds
        </h2>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
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
        <p className="mt-4 text-sm">
          <Link
            to="/would-i-have-made-it"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            See which of these rounds you would have cleared →
          </Link>
        </p>
      </section>

      <section className="mt-12 max-w-2xl">
        <h2 className="text-lg font-semibold">What is Express Entry?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Express Entry is the system Canada uses to manage applications for several permanent
          residence programs. Candidates sit in one national pool with a Comprehensive Ranking
          System (CRS) score, and IRCC periodically invites the highest-ranked candidates in a
          round of invitations. The cutoff score of each round is simply the score of the last
          person invited — it depends on who was in the pool and how many invitations were issued.
        </p>
        <p className="mt-3 text-sm">
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
