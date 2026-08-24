import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useScore } from "@/lib/useScore";
import { useCrsProfile } from "@/lib/useCrsProfile";
import { FilterChip } from "@/components/FilterChip";
import { FrenchScenarioFlow } from "@/components/plan/FrenchScenarioFlow";
import { PnpScenarioFlow } from "@/components/plan/PnpScenarioFlow";
import { EnglishScenarioFlow } from "@/components/plan/EnglishScenarioFlow";
import { CanadianWorkExperienceScenarioFlow } from "@/components/plan/CanadianWorkExperienceScenarioFlow";

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

const GOAL_CHIPS: { value: Goal | "citizenship"; label: string; disabled?: boolean }[] = [
  { value: "pr", label: "Permanent residency" },
  { value: "citizenship", label: "Citizenship (TBD)", disabled: true },
];

const SCENARIO_CHIPS = [
  { key: "french", label: "Improve my French" },
  { key: "english", label: "Improve my English" },
  { key: "canadianWork", label: "Canadian work experience" },
  { key: "pnp", label: "Provincial nomination" },
] as const;

const MORE_SCENARIOS = "Foreign work experience · Education";

function Plan() {
  const { raw, setRaw, score } = useScore();
  const { elig } = useCrsProfile();
  const [goal, setGoal] = useState<Goal>("pr");
  const [scenario, setScenario] = useState<(typeof SCENARIO_CHIPS)[number]["key"] | null>("french");

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero — same shape as Home: title, then a 12-col grid with the score
          input in the same column position (col-span-3). */}
      <section
        className="rounded-[calc(var(--radius)*1.5)] px-6 py-8 sm:px-10 sm:py-10"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <h1
          className="display text-[2.25rem] leading-[1.05] font-semibold sm:text-[2.75rem]"
          style={{ color: "var(--paper)" }}
        >
          Plan your score.
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          {/* CRS score input — same position and markup as Home's hero. */}
          <div className="md:col-span-3">
            <p
              className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "rgba(246,241,232,0.6)" }}
            >
              CRS score
            </p>
            <label htmlFor="plan-score" className="sr-only">
              Enter your CRS score
            </label>
            <div
              className="mt-3 rounded-[var(--radius)] border px-4 py-2 transition-colors focus-within:border-[var(--accent-soft)]"
              style={{
                borderColor: "rgba(246,241,232,0.28)",
                backgroundColor: "rgba(246,241,232,0.05)",
              }}
            >
              <input
                id="plan-score"
                inputMode="numeric"
                autoComplete="off"
                placeholder="—"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="figure w-full bg-transparent text-[2rem] leading-tight outline-none sm:text-[2.25rem]"
                style={{ color: "var(--accent-soft)" }}
              />
            </div>
            {score === null && (
              <p className="mt-2 text-xs" style={{ color: "rgba(246,241,232,0.6)" }}>
                <Link to="/" className="underline underline-offset-2 hover:opacity-80">
                  Check your score on Home →
                </Link>
              </p>
            )}
          </div>

          {/* What are you working towards? */}
          <div className="md:col-span-4">
            <p
              className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "rgba(246,241,232,0.6)" }}
            >
              What are you working towards?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOAL_CHIPS.map((g) => (
                <FilterChip
                  key={g.label}
                  label={g.label}
                  selected={goal === g.value}
                  disabled={g.disabled}
                  onClick={g.disabled ? undefined : () => setGoal(g.value as Goal)}
                  tone="dark"
                />
              ))}
            </div>
          </div>

          {/* What are you considering? */}
          <div className="md:col-span-5">
            <p
              className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase"
              style={{ color: "rgba(246,241,232,0.6)" }}
            >
              What are you considering?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SCENARIO_CHIPS.map((s) => (
                <FilterChip
                  key={s.key}
                  label={s.label}
                  selected={scenario === s.key}
                  disabled={score === null}
                  onClick={() => setScenario(s.key === scenario ? null : s.key)}
                  tone="dark"
                />
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: "rgba(246,241,232,0.6)" }}>
              <a
                href="https://form.typeform.com/to/sS3VEFtC"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:opacity-80"
              >
                Want something added? Tell me what you&rsquo;d use →
              </a>
            </p>
            <p className="mt-1 text-xs" style={{ color: "rgba(246,241,232,0.6)" }}>
              More scenarios: {MORE_SCENARIOS}
            </p>
          </div>
        </div>
      </section>

      {/* FrenchScenarioFlow renders its own panels: a questions panel and,
          once there's a result, a separate result panel below it. */}
      {score !== null && scenario === "french" && (
        <FrenchScenarioFlow baseScore={score} elig={elig} />
      )}
      {score !== null && scenario === "english" && (
        <EnglishScenarioFlow baseScore={score} elig={elig} />
      )}
      {score !== null && scenario === "canadianWork" && (
        <CanadianWorkExperienceScenarioFlow baseScore={score} elig={elig} />
      )}
      {score !== null && scenario === "pnp" && <PnpScenarioFlow baseScore={score} elig={elig} />}
    </div>
  );
}
