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
    guardrails — never invitation-probability language. */
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
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--rule)] p-4">
          <p className="text-xs text-muted-foreground">Current score: {currentScore}</p>
          <p className="mt-1 text-ink">
            Above the cutoff in <span className="num font-semibold">{current.above}</span> of{" "}
            {current.total} relevant rounds
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--brand)] bg-[var(--brand-soft)] p-4">
          <p className="text-xs text-muted-foreground">Planned score: {plannedScore}</p>
          <p className="mt-1 text-ink">
            Above the cutoff in{" "}
            <span className="num font-semibold" style={{ color: "var(--brand)" }}>
              {planned.above}
            </span>{" "}
            of {planned.total} relevant rounds
          </p>
        </div>
      </div>
      {additionalCleared > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-ink">
          This scenario would have put your score above{" "}
          <span className="font-medium">{additionalCleared} additional</span> relevant historical
          cutoff{additionalCleared === 1 ? "" : "s"} in the last {WINDOW_MONTHS} months.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This scenario wouldn&rsquo;t have changed how many relevant historical rounds your score
          cleared in the last {WINDOW_MONTHS} months.
        </p>
      )}
    </div>
  );
}
