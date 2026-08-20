import { useMemo } from "react";
import { monthsAgo, useRelevantComparison } from "@/lib/useRelevantComparison";
import type { Eligibility } from "@/lib/useCrsProfile";

const WINDOW_MONTHS = 36;

interface Props {
  currentScore: number;
  plannedScore: number;
  elig: Eligibility;
}

/** "Would this scenario have mattered?" — the same relevant-draws RPC Home
    uses, called twice (current score, planned score) so the two numbers are
    computed identically. Historical-fact language only, per product
    guardrails — never invitation-probability language. Typography only, no
    boxes: this renders inside the Plan page's already-bordered result area. */
export function PlanHistoricalComparison({ currentScore, plannedScore, elig }: Props) {
  const since = useMemo(() => monthsAgo(WINDOW_MONTHS), []);

  const current = useRelevantComparison(currentScore, elig, since);
  const planned = useRelevantComparison(plannedScore, elig, since);

  if (current.isLoading || planned.isLoading) {
    return <p className="text-sm text-muted-foreground">Comparing against historical draws…</p>;
  }

  if (current.total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No relevant rounds found in the last {WINDOW_MONTHS} months for these selections — or data
        isn&rsquo;t available yet.
      </p>
    );
  }

  const additionalCleared = planned.above - current.above;

  return (
    <div>
      <p className="kicker">Historical impact</p>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="figure text-[1.75rem] text-ink sm:text-[2rem]">{currentScore}</span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <span className="figure text-[1.75rem] sm:text-[2rem]" style={{ color: "var(--brand)" }}>
          {plannedScore}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          {current.above} of {current.total} relevant rounds
        </span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <span className="text-ink">
          {planned.above} of {planned.total} relevant rounds
        </span>
      </div>

      {additionalCleared > 0 ? (
        <p className="mt-4 text-[0.95rem] font-medium" style={{ color: "var(--brand)" }}>
          +{additionalCleared} additional relevant historical cutoff
          {additionalCleared === 1 ? "" : "s"} cleared
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          This scenario wouldn&rsquo;t have changed how many relevant historical rounds your score
          cleared in the last {WINDOW_MONTHS} months.
        </p>
      )}
    </div>
  );
}
