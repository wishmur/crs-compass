import { useAge } from "@/lib/useAge";
import { agePointsForAge } from "@/lib/crs/age";

function trendNote(age: number, next: ReturnType<typeof agePointsForAge>): string {
  if (age < 20) return "rising toward the maximum at 20";
  if (age <= 29) return "the maximum — holds through 29, then declines";
  if (age >= 45) return "the floor — age points bottom out at 45";
  return `down from the 20–29 maximum; ${next.withoutSpouse} (${next.withSpouse} with a spouse or partner) at your next birthday`;
}

/** Ambient awareness that CRS age points quietly erode after the 20-29
    plateau — most users have never checked. Self-contained: no age is
    collected anywhere else on the site, so this stores its own minimal
    input (years only, no date of birth) and shows nothing until the user
    opts in. Shows both with/without-spouse figures rather than asking
    spouse status separately, since that isn't collected on Home either —
    matches PoolContext's placement and weight: one plain-text line, no
    card. Deterministic IRCC lookup, not a prediction. */
export function AgeInsight() {
  const { raw, setRaw, age, hydrated } = useAge();

  if (!hydrated) return null;

  if (age === null) {
    return (
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-ink">Age points:</strong> these quietly shift every year — enter
        your age to see where yours stands.{" "}
        <label className="sr-only" htmlFor="age-insight-input">
          Your age in years
        </label>
        <input
          id="age-insight-input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Age"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="w-12 border-b border-[var(--rule)] bg-transparent text-center text-ink outline-none focus:border-[var(--brand)]"
        />
      </p>
    );
  }

  const current = agePointsForAge(age);
  const next = agePointsForAge(age + 1);

  return (
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
      <strong className="text-ink">Age points at {age}:</strong>{" "}
      <span className="text-ink">
        {current.withoutSpouse} ({current.withSpouse} with a spouse or partner)
      </span>{" "}
      of a possible 110 — {trendNote(age, next)}.{" "}
      <button
        type="button"
        onClick={() => setRaw("")}
        className="underline underline-offset-2 hover:text-foreground"
      >
        Remove
      </button>
    </p>
  );
}
