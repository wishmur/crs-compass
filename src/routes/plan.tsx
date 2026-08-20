import { createFileRoute, Link } from "@tanstack/react-router";
import { useScore } from "@/lib/useScore";
import { useCrsProfile } from "@/lib/useCrsProfile";
import { ScenarioCard } from "@/components/plan/ScenarioCard";
import { FrenchScenarioFlow } from "@/components/plan/FrenchScenarioFlow";
import { useState } from "react";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan your score — CRS Compass" },
      {
        name: "description",
        content:
          "Hold your CRS score constant, try a change you're considering, and see the exact point breakdown plus how it compares against relevant historical Express Entry draws.",
      },
    ],
  }),
  component: Plan,
});

type Goal = "pr";

const SCENARIOS = [
  {
    key: "french",
    title: "Improve my French",
    description: "Model a French test result.",
    active: true,
  },
  { key: "english", title: "Improve my English", active: false },
  { key: "cec", title: "More Canadian work experience", active: false },
  { key: "foreign_work", title: "More foreign work experience", active: false },
  { key: "education", title: "New education credential", active: false },
  { key: "pnp", title: "Provincial nomination", active: false },
] as const;

function Plan() {
  const { raw, setRaw, score } = useScore();
  const { elig } = useCrsProfile();
  const [goal, setGoal] = useState<Goal>("pr");
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["key"] | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:pt-14">
      <div className="mx-auto max-w-4xl">
        <p className="kicker">Plan</p>
        <h1 className="display mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Plan your score.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted-foreground">
          Start with the CRS score you already know. Try a change you&rsquo;re considering and see
          exactly how it affects your score — and whether it would have mattered against real
          historical draws.
        </p>

        {/* Step 1 — current score */}
        <div className="mt-10">
          <p className="kicker">Your current CRS</p>
          <div
            className="mt-3 inline-flex rounded-[var(--radius)] border px-4 py-2 focus-within:border-[var(--brand)]"
            style={{ borderColor: "var(--rule)" }}
          >
            <label htmlFor="plan-score" className="sr-only">
              Enter your CRS score
            </label>
            <input
              id="plan-score"
              inputMode="numeric"
              autoComplete="off"
              placeholder="—"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="figure w-28 bg-transparent text-[2rem] leading-tight text-ink outline-none"
            />
          </div>
          {score === null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Don&rsquo;t know your score yet?{" "}
              <Link to="/" className="underline underline-offset-2">
                Check it on Home →
              </Link>
            </p>
          )}
        </div>

        {/* Step 2 — goal */}
        <div className="mt-10">
          <p className="kicker">What are you working toward?</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ScenarioCard
              title="Permanent residency"
              description="Express Entry — federal programs."
              selected={goal === "pr"}
              onClick={() => setGoal("pr")}
            />
            <ScenarioCard title="Citizenship" badge="Coming later" disabled />
          </div>
        </div>

        {/* Step 3 — scenario */}
        {score !== null && (
          <div className="mt-10">
            <p className="kicker">What are you considering?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <ScenarioCard
                  key={s.key}
                  title={s.title}
                  description={s.active ? s.description : undefined}
                  badge={s.active ? undefined : "Coming soon"}
                  disabled={!s.active}
                  selected={scenario === s.key}
                  onClick={
                    s.active ? () => setScenario(s.key === scenario ? null : s.key) : undefined
                  }
                />
              ))}
            </div>

            {scenario === "french" && <FrenchScenarioFlow baseScore={score} elig={elig} />}
          </div>
        )}
      </div>
    </div>
  );
}
