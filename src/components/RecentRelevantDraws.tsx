import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { RoundBadge } from "@/components/RoundBadge";
import { SecondaryLink } from "@/components/CTA";
import { formatDate } from "@/components/DrawMeta";
import { drawsQuery } from "@/lib/queries";
import { type Draw } from "@/data/round-types";
import { isRelevantDraw, type Eligibility } from "@/lib/useCrsProfile";

// A compact grid of the most recent draws that match the user's eligibility.
// Not a carousel — carousels made the row feel dated and demanded custom
// controls to feel intentional. A simple 4-up grid reads instantly.
//
// If no eligibility is selected, the grid shows the most recent 4 draws
// overall (isRelevantDraw returns true when no filter is active).

const MAX_CARDS = 4;

function DrawTile({ draw }: { draw: Draw }) {
  return (
    <article className="flex h-[13rem] flex-col justify-between rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-5">
      <div>
        <p className="text-xs text-muted-foreground tabular-nums">{formatDate(draw.draw_date)}</p>
        <div className="mt-2">
          <RoundBadge draw={draw} />
        </div>
      </div>
      <div>
        <div className="figure text-[2.75rem] leading-none text-ink">{draw.cutoff_score}</div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {draw.invitations_issued.toLocaleString("en-CA")} invitations
        </p>
      </div>
    </article>
  );
}

interface Props {
  elig: Eligibility;
  hasEligibility: boolean;
}

export function RecentRelevantDraws({ elig, hasEligibility }: Props) {
  const { data, isLoading } = useQuery(drawsQuery());

  const recent = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => isRelevantDraw(d, elig)).slice(0, MAX_CARDS);
  }, [data, elig]);

  const heading = hasEligibility ? "Recent draws in this view" : "Recent draws";

  return (
    <section
      id="recent-draws"
      aria-labelledby="recent-heading"
      className="mt-14 scroll-mt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="recent-heading" className="kicker">
          {heading} <span className="text-muted-foreground/70">(latest {recent.length || MAX_CARDS})</span>
        </h2>
        <SecondaryLink to="/history">View full history &rarr;</SecondaryLink>
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: MAX_CARDS }).map((_, i) => (
            <Skeleton key={i} className="h-[13rem] w-full" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {hasEligibility
            ? "No recent draws match the eligibility you've selected. Try loosening the filter above, or check the full history."
            : "Data not available yet — the daily refresh runs at ~9am ET."}
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((d) => (
            <DrawTile key={d.round_number} draw={d} />
          ))}
        </div>
      )}
    </section>
  );
}
