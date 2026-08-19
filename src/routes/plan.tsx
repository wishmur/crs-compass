import { createFileRoute, Link } from "@tanstack/react-router";
import { useScore } from "@/lib/useScore";

// Placeholder for the score-planner experience. Real implementation lands
// in a future pass — this page exists now so the Home CTA and the nav have
// something legitimate to point at, and so URLs are stable.

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan your score — CRS Compass" },
      {
        name: "description",
        content:
          "Coming soon: model how changes to language, work experience, or education could affect your CRS score and your position against historical draws.",
      },
    ],
  }),
  component: PlanPlaceholder,
});

function PlanPlaceholder() {
  const { score } = useScore();

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="kicker">Plan</p>
          <span className="rounded-full border border-[var(--rule)] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            Coming soon
          </span>
        </div>

        <h1 className="display mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Plan your score.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink">
          A place to hold your current CRS constant and see how specific changes &mdash; a better
          language result, another year of Canadian work experience, a completed credential
          &mdash; would move your position against the rounds that apply to you.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Historical comparison only. This won&rsquo;t predict future cutoffs, and it won&rsquo;t
          submit anything to IRCC.
        </p>

        <div
          className="mt-8 rounded-[var(--radius)] border border-dashed p-5 sm:p-6"
          style={{ borderColor: "var(--rule)" }}
        >
          <p className="kicker">What&rsquo;s coming</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Hold your known CRS score constant.</li>
            <li>
              Toggle hypothetical changes: language test result, work-experience years,
              education level, provincial nomination.
            </li>
            <li>
              See the projected new score under IRCC&rsquo;s published rules, and how it would
              have compared against the last 24 months of relevant historical rounds.
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {score !== null && (
            <span className="text-muted-foreground">
              Your current score:{" "}
              <span className="tabular-nums font-medium text-ink">{score}</span>
            </span>
          )}
          <Link
            to="/"
            className="font-medium text-[var(--brand)] transition-opacity hover:opacity-70"
          >
            {score !== null ? "Back to your position →" : "Enter your score on Home →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
