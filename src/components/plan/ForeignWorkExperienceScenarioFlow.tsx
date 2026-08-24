import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbilityLevelPicker,
  TRANSFERABILITY_LANGUAGE_BANDS,
} from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateForeignWorkExperienceScenario } from "@/lib/crs/engine";
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

const CANADIAN_YEARS_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1 year" },
  { value: 2, label: "2 years" },
  { value: 3, label: "3 years" },
  { value: 4, label: "4 years" },
  { value: 5, label: "5+ years" },
];

// Foreign work experience itself only ever feeds skill transferability
// (never Core points), and transferability only cares which tier a
// candidate lands in — 0 / 1-2 / 3+ years score identically within a
// tier — so current and target both use these three choices rather than
// false year-by-year precision.
const FOREIGN_YEARS_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1–2 years" },
  { value: 3, label: "3+ years" },
];

function languageTierSummary(scores: AbilityScores): string {
  const values = ABILITIES.map((a) => scores[a]);
  const allSame = values.every((v) => v === values[0]);
  const bandLabel = (v: number) => (v >= 9 ? "9+" : v >= 7 ? "7–8" : "below 7");
  if (allSame) return `CLB ${bandLabel(values[0]!)} across all four abilities`;
  const labels: Record<(typeof ABILITIES)[number], string> = {
    speaking: "speaking",
    listening: "listening",
    reading: "reading",
    writing: "writing",
  };
  return ABILITIES.map((a) => `${labels[a]} CLB ${bandLabel(scores[a])}`).join(", ");
}

interface Props {
  baseScore: number;
  elig: Eligibility;
}

/** Foreign work experience scenario: the simplest of the transferability-
    aware scenarios. Foreign experience earns no Core points on its own
    and never pairs with education — only with language (current, fixed
    context here) and Canadian work experience (also fixed context) — so
    there's no spouse question (nothing here varies by spouse status) and
    no education step. See calculateForeignWorkExperienceScenario. */
export function ForeignWorkExperienceScenarioFlow({ baseScore, elig }: Props) {
  const { setProfile } = usePlannerProfile();

  const [activeStep, setActiveStep] = useState<StepId>(1);

  const [firstLanguageClb, setFirstLanguageClb] =
    useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [canadianYears, setCanadianYears] = useState<number | null>(null);
  const [currentYears, setCurrentYears] = useState<number | null>(null);
  const [targetYears, setTargetYears] = useState<number | null>(null);

  const step1Complete = isComplete(firstLanguageClb);
  const step2Complete = canadianYears !== null;
  const step3Complete = currentYears !== null && targetYears !== null;
  const canCalculate = step1Complete && step2Complete && step3Complete;

  const result = useMemo(() => {
    if (!canCalculate) return null;
    return calculateForeignWorkExperienceScenario(baseScore, {
      firstLanguageClb: isComplete(firstLanguageClb) ? firstLanguageClb : EMPTY_ZERO,
      canadianWorkYears: canadianYears ?? 0,
      currentForeignWorkYears: currentYears ?? 0,
      targetForeignWorkYears: targetYears ?? 0,
    });
  }, [canCalculate, baseScore, firstLanguageClb, canadianYears, currentYears, targetYears]);

  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  const persist = (next: { firstLanguageClb?: PartialAbilityScores; canadianYears?: number }) => {
    setProfile((p) => ({
      ...p,
      canadianWorkYears: next.canadianYears ?? p.canadianWorkYears,
      hasEnglishResults:
        next.firstLanguageClb && isComplete(next.firstLanguageClb) ? true : p.hasEnglishResults,
      englishClb:
        next.firstLanguageClb && isComplete(next.firstLanguageClb)
          ? next.firstLanguageClb
          : p.englishClb,
    }));
  };

  // Each handler only checks the step AFTER its own — see the identical
  // note in CanadianWorkExperienceScenarioFlow for why.
  const handleLanguage = (next: PartialAbilityScores) => {
    setFirstLanguageClb(next);
    persist({ firstLanguageClb: next });
    if (isComplete(next)) setActiveStep(!step2Complete ? 2 : 3);
  };

  const handleCanadianYears = (value: number) => {
    setCanadianYears(value);
    persist({ canadianYears: value });
    setActiveStep(3);
  };

  return (
    <>
      <section className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8" style={PANEL_STYLE}>
        {/* 01 — Current first official language, coarse (tier only) */}
        <div>
          <p className="kicker">01 &middot; Current first official language</p>
          {activeStep === 1 ? (
            <div className="mt-3">
              <p className="font-medium text-ink">
                What&rsquo;s your current level in your first official language?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This scenario isn&rsquo;t about your language result, but the transferability points
                are capped together with a language score, so this still needs to be right. Only the
                tier matters here, not the exact CLB level.
              </p>
              <div className="mt-4">
                <AbilityLevelPicker
                  levelLabel="CLB"
                  value={firstLanguageClb}
                  onChange={handleLanguage}
                  bands={TRANSFERABILITY_LANGUAGE_BANDS}
                />
              </div>
            </div>
          ) : step1Complete ? (
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-[0.95rem] text-ink">
                {languageTierSummary(firstLanguageClb as AbilityScores)}.
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

        {/* 02 — Canadian work experience, fixed context */}
        {step1Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">02 &middot; Canadian work experience</p>
            {activeStep === 2 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">Do you have Canadian work experience?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Canadian work experience also pairs with foreign experience in
                  skill-transferability.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CANADIAN_YEARS_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={canadianYears === opt.value}
                      onClick={() => handleCanadianYears(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ) : step2Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  Canadian work experience:{" "}
                  {CANADIAN_YEARS_OPTIONS.find(
                    (o) => o.value === canadianYears,
                  )?.label.toLowerCase()}
                  .
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

        {/* 03 — Foreign work experience, current and target */}
        {step1Complete && step2Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">03 &middot; Foreign work experience</p>
            {activeStep === 3 ? (
              <div className="mt-3">
                <p className="text-[1.05rem] font-semibold text-ink sm:text-[1.15rem]">
                  Your current and target foreign work experience
                </p>
                <p className="mt-4 text-sm font-medium text-ink">Current</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FOREIGN_YEARS_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={currentYears === opt.value}
                      onClick={() => setCurrentYears(opt.value)}
                    />
                  ))}
                </div>
                <p className="mt-6 text-sm font-medium text-ink">Target</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FOREIGN_YEARS_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={targetYears === opt.value}
                      onClick={() => setTargetYears(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ) : step3Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {FOREIGN_YEARS_OPTIONS.find((o) => o.value === currentYears)?.label} &rarr;
                  targeting {FOREIGN_YEARS_OPTIONS.find((o) => o.value === targetYears)?.label}.
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveStep(3)}
                >
                  Edit
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {result && (
        <section
          ref={resultRef}
          className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8"
          style={PANEL_STYLE}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            <div>
              <p className="kicker">Your planned score</p>
              <p className="display mt-3 text-[1.75rem] leading-[1.15] text-ink sm:text-[2.25rem]">
                {result.baseScore}{" "}
                <span aria-hidden className="text-muted-foreground">
                  &rarr;
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
                      {line.before} &rarr; {line.after}{" "}
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
                  See the official criteria &rarr;
                </a>
              </p>
            </div>

            <div className="md:border-l md:pl-10" style={DIVIDER_STYLE}>
              <PlanHistoricalComparison
                currentScore={result.baseScore}
                plannedScore={result.projectedScore}
                elig={elig}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
