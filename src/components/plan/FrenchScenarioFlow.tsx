import { useEffect, useMemo, useRef, useState } from "react";
import { AbilityLevelPicker } from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateFrenchScenario } from "@/lib/crs/engine";
import {
  ABILITIES,
  EMPTY_PARTIAL_ABILITIES,
  isComplete,
  type AbilityScores,
  type PartialAbilityScores,
} from "@/lib/crs/types";
import type { Eligibility } from "@/lib/useCrsProfile";

const EMPTY_ZERO = { speaking: 0, listening: 0, reading: 0, writing: 0 };
const DIVIDER_STYLE = { borderColor: "color-mix(in srgb, var(--brand) 14%, transparent)" };
const PANEL_STYLE = {
  backgroundColor: "var(--brand-soft)",
  borderColor: "color-mix(in srgb, var(--brand) 12%, transparent)",
};

type StepId = 1 | 2 | 3;

function bandLabel(value: number): string {
  if (value >= 9) return "9+";
  if (value >= 7) return "7–8";
  if (value >= 5) return "5–6";
  return "below 5";
}

/** One-line summary of a completed four-ability answer, for a collapsed
    step. Collapses to "<prefix> <band> across all four abilities" when
    every ability landed in the same band — the common case — otherwise
    lists each ability individually. */
function summarizeAbilities(scores: AbilityScores, prefix: "CLB" | "NCLC"): string {
  const values = ABILITIES.map((a) => scores[a]);
  const allSame = values.every((v) => v === values[0]);
  if (allSame) return `${prefix} ${bandLabel(values[0]!)} across all four abilities`;
  const labels: Record<(typeof ABILITIES)[number], string> = {
    speaking: "speaking",
    listening: "listening",
    reading: "reading",
    writing: "writing",
  };
  return ABILITIES.map((a) => `${labels[a]} ${prefix} ${bandLabel(scores[a])}`).join(", ");
}

interface Props {
  baseScore: number;
  elig: Eligibility;
}

/** French-language scenario: the one fully-implemented planner flow. Every
    other scenario card on /plan is a visible placeholder — this is the real
    thing, end to end.

    Renders two separate light-green panels: a "questions" panel with the
    3-step progressive accordion (no per-step cards inside it — just
    kickers, whitespace, and thin dividers; only one step shows its full
    controls at a time, completed steps before it collapse to a one-line
    summary with Edit), and — once there's enough to calculate — a second,
    visually distinct "result" panel below it, so a generated result reads
    as its own answer rather than more of the form. */
export function FrenchScenarioFlow({ baseScore, elig }: Props) {
  const { setProfile } = usePlannerProfile();

  const [activeStep, setActiveStep] = useState<StepId>(1);

  const [spouse, setSpouse] = useState<boolean | null>(null);
  const [englishMode, setEnglishMode] = useState<"none" | "has" | null>(null);
  const [englishClb, setEnglishClb] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [hasCurrentFrench, setHasCurrentFrench] = useState(false);
  const [currentFrench, setCurrentFrench] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [target, setTarget] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);

  const step1Complete = spouse !== null;
  const step2Complete = englishMode === "none" || (englishMode === "has" && isComplete(englishClb));
  const currentFrenchReady = !hasCurrentFrench || isComplete(currentFrench);
  const canCalculate = step1Complete && step2Complete && currentFrenchReady && isComplete(target);

  const result = useMemo(() => {
    if (!canCalculate || spouse === null) return null;
    return calculateFrenchScenario(baseScore, {
      hasSpouseOrPartner: spouse,
      hasEnglishResults: englishMode === "has",
      englishClb: englishMode === "has" && isComplete(englishClb) ? englishClb : EMPTY_ZERO,
      currentFrenchNclc: hasCurrentFrench && isComplete(currentFrench) ? currentFrench : EMPTY_ZERO,
      targetFrenchNclc: isComplete(target) ? target : EMPTY_ZERO,
    });
  }, [
    canCalculate,
    baseScore,
    spouse,
    englishMode,
    englishClb,
    hasCurrentFrench,
    currentFrench,
    target,
  ]);

  // Nudge the result panel into view the moment it first appears — not on
  // every recalculation while editing, only the false -> true transition.
  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  const persist = (next: {
    spouse?: boolean;
    englishMode?: "none" | "has";
    englishClb?: PartialAbilityScores;
    currentFrench?: PartialAbilityScores;
  }) => {
    setProfile((p) => ({
      hasSpouseOrPartner: next.spouse ?? p.hasSpouseOrPartner,
      hasEnglishResults: next.englishMode ? next.englishMode === "has" : p.hasEnglishResults,
      englishClb: next.englishClb && isComplete(next.englishClb) ? next.englishClb : p.englishClb,
      currentFrenchNclc:
        next.currentFrench && isComplete(next.currentFrench)
          ? next.currentFrench
          : p.currentFrenchNclc,
    }));
  };

  // After answering step 1, skip straight past step 2 if it's already
  // answered (e.g. the user came back via Edit) instead of re-showing it.
  const advancePastStep1 = () => setActiveStep(step2Complete ? 3 : 2);

  const handleSpouse = (value: boolean) => {
    setSpouse(value);
    persist({ spouse: value });
    advancePastStep1();
  };

  const handleEnglishMode = (mode: "none" | "has") => {
    setEnglishMode(mode);
    persist({ englishMode: mode });
    if (mode === "none") setActiveStep(3);
  };

  const handleEnglishClb = (next: PartialAbilityScores) => {
    setEnglishClb(next);
    persist({ englishMode: "has", englishClb: next });
    if (isComplete(next)) setActiveStep(3);
  };

  return (
    <>
      <section className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8" style={PANEL_STYLE}>
        {/* 01 — Profile context */}
        <div>
          <p className="kicker">01 &middot; Profile context</p>
          {activeStep === 1 ? (
            <div className="mt-3">
              <p className="font-medium text-ink">
                Do you have a spouse or partner coming with you to Canada?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The point tables — and caps — differ with and without a spouse or common-law
                partner.
              </p>
              <div className="mt-3 flex gap-2">
                <FilterChip
                  label="Yes"
                  selected={spouse === true}
                  onClick={() => handleSpouse(true)}
                />
                <FilterChip
                  label="No"
                  selected={spouse === false}
                  onClick={() => handleSpouse(false)}
                />
              </div>
            </div>
          ) : step1Complete ? (
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-[0.95rem] text-ink">
                {spouse
                  ? "Has a spouse or common-law partner coming to Canada."
                  : "No spouse or common-law partner coming to Canada."}
              </p>
              <button
                type="button"
                className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setActiveStep(1)}
              >
                Edit
              </button>
            </div>
          ) : null}
        </div>

        {/* 02 — Current English */}
        {step1Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">02 &middot; Current English</p>
            {activeStep === 2 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">What&rsquo;s your current English result?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The French bonus depends on how strong your English is, not just your French.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilterChip
                    label="I haven't taken an English test"
                    selected={englishMode === "none"}
                    onClick={() => handleEnglishMode("none")}
                  />
                  <FilterChip
                    label="I have English results"
                    selected={englishMode === "has"}
                    onClick={() => handleEnglishMode("has")}
                  />
                </div>
                {englishMode === "has" && (
                  <div className="mt-4">
                    <AbilityLevelPicker
                      levelLabel="CLB"
                      value={englishClb}
                      onChange={handleEnglishClb}
                    />
                  </div>
                )}
              </div>
            ) : step2Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {englishMode === "none"
                    ? "Hasn't taken an English test yet."
                    : `English results: ${summarizeAbilities(englishClb as AbilityScores, "CLB")}.`}
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveStep(2)}
                >
                  Edit
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* 03 — French target. The most visually prominent step, and the only
          one that never collapses — the result populates directly beneath
          it once it's answered. */}
        {step1Complete && step2Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">03 &middot; French target</p>
            <p className="mt-3 text-[1.05rem] font-semibold text-ink sm:text-[1.15rem]">
              What French result are you aiming for?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your target as NCLC levels. If you know a TEF Canada or TCF Canada score
              instead, convert it first using{" "}
              <a
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                IRCC&rsquo;s official comparison chart
              </a>
              .
            </p>

            <div className="mt-3 text-xs text-muted-foreground">
              {!hasCurrentFrench ? (
                <span>
                  Starting from no French result counted in your score yet.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => setHasCurrentFrench(true)}
                  >
                    Already have a French result counted in your score? Add it →
                  </button>
                </span>
              ) : (
                <span>
                  Starting point: your current French result, already counted in your score above.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => {
                      setHasCurrentFrench(false);
                      setCurrentFrench(EMPTY_PARTIAL_ABILITIES);
                      setProfile((p) => ({ ...p, currentFrenchNclc: EMPTY_ZERO }));
                    }}
                  >
                    Remove
                  </button>
                </span>
              )}
            </div>

            {hasCurrentFrench && (
              <div className="mt-4">
                <AbilityLevelPicker
                  levelLabel="NCLC"
                  value={currentFrench}
                  onChange={(next) => {
                    setCurrentFrench(next);
                    persist({ currentFrench: next });
                  }}
                />
              </div>
            )}

            <div className="mt-4">
              <AbilityLevelPicker levelLabel="NCLC" value={target} onChange={setTarget} />
            </div>
          </div>
        )}
      </section>

      {/* Result — a separate panel from the questions above, so a generated
          result reads as its own answer rather than more of the form.
          Typography only inside it, no nested boxes. */}
      {result && (
        <section
          ref={resultRef}
          className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8"
          style={PANEL_STYLE}
        >
          <p className="kicker">Your planned score</p>
          <p className="display mt-3 text-[1.75rem] leading-[1.15] text-ink sm:text-[2.25rem]">
            {result.baseScore}{" "}
            <span aria-hidden className="text-muted-foreground">
              →
            </span>{" "}
            <span style={{ color: result.delta >= 0 ? "var(--brand)" : "var(--accent)" }}>
              {result.projectedScore}
            </span>
          </p>
          <p
            className="figure mt-1 text-xl"
            style={{ color: result.delta >= 0 ? "var(--brand)" : "var(--accent)" }}
          >
            {result.delta >= 0 ? "+" : ""}
            {result.delta} CRS
          </p>

          <div className="mt-6 space-y-3">
            {result.breakdown.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{line.label}</span>
                <span className="num text-ink">
                  {line.before} → {line.after}{" "}
                  <span className="text-muted-foreground">
                    ({line.delta >= 0 ? "+" : ""}
                    {line.delta})
                  </span>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Calculated using CRS rules verified {result.ruleset.verifiedAt}.{" "}
            <a
              href={result.ruleset.sources[0]?.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              See the official criteria →
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            This assumes English is your first official language and French your second — the common
            case. If French is actually your stronger language, other CRS factors could also shift
            and this number would understate the effect.
          </p>

          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <PlanHistoricalComparison
              currentScore={result.baseScore}
              plannedScore={result.projectedScore}
              elig={elig}
            />
          </div>
        </section>
      )}
    </>
  );
}
