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
    boxes: this renders as the second column of the Plan page's result
    panel, beside the score/breakdown — so the headline number here is the
    cleared-rounds count, not the score (already prominent one column over). */
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

      <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="figure text-[1.75rem] text-ink sm:text-[2rem]">
          {current.above}/{current.total}
        </span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
        <span className="figure text-[1.75rem] sm:text-[2rem]" style={{ color: "var(--brand)" }}>
          {planned.above}/{planned.total}
        </span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">relevant historical cutoffs cleared</p>

      {additionalCleared > 0 ? (
        <p className="mt-4 text-[0.95rem] font-medium" style={{ color: "var(--brand)" }}>
          +{additionalCleared} additional cutoff{additionalCleared === 1 ? "" : "s"} cleared
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
