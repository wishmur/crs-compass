import { useMemo } from "react";
import { monthsAgo, useRelevantComparison } from "@/lib/useRelevantComparison";
import { useAge } from "@/lib/useAge";
import { agePointsForAge } from "@/lib/crs/age";
import type { Eligibility } from "@/lib/useCrsProfile";

const WINDOW_MONTHS = 36;

interface Props {
  currentScore: number;
  plannedScore: number;
  elig: Eligibility;
}

/** Age points at the user's next birthday, if they've entered an age on
    Home (age is shared via localStorage, same as score) and that birthday
    actually changes anything. Returns null otherwise — most of the 20-29
    plateau, and anyone who hasn't entered an age, have nothing to say
    here. Deliberately not a new input: Home already owns collecting age. */
function useNextBirthdayNote() {
  const { age } = useAge();
  return useMemo(() => {
    if (age === null) return null;
    const current = agePointsForAge(age);
    const next = agePointsForAge(age + 1);
    if (current.withoutSpouse === next.withoutSpouse && current.withSpouse === next.withSpouse) {
      return null;
    }
    return { nextAge: age + 1, current, next };
  }, [age]);
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
  const nextBirthday = useNextBirthdayNote();

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

      {nextBirthday && (
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Independent of this scenario: turning {nextBirthday.nextAge} moves your age points{" "}
          {nextBirthday.current.withoutSpouse} &rarr; {nextBirthday.next.withoutSpouse} (
          {nextBirthday.current.withSpouse} &rarr; {nextBirthday.next.withSpouse} with a spouse or
          partner) — from the age insight on Home.
        </p>
      )}
    </div>
  );
}
