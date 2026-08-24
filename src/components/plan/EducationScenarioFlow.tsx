import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbilityLevelPicker,
  TRANSFERABILITY_LANGUAGE_BANDS,
} from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateEducationScenario } from "@/lib/crs/engine";
import {
  ABILITIES,
  EMPTY_PARTIAL_ABILITIES,
  isComplete,
  type AbilityScores,
  type EducationLevel,
  type PartialAbilityScores,
} from "@/lib/crs/types";
import type { Eligibility } from "@/lib/useCrsProfile";

const EMPTY_ZERO = { speaking: 0, listening: 0, reading: 0, writing: 0 };
const DIVIDER_STYLE = { borderColor: "color-mix(in srgb, var(--brand) 14%, transparent)" };
const PANEL_STYLE = {
  backgroundColor: "var(--brand-soft)",
  borderColor: "color-mix(in srgb, var(--brand) 12%, transparent)",
};

type StepId = 1 | 2 | 3 | 4;

const EDUCATION_OPTIONS: { value: EducationLevel; label: string; short: string }[] = [
  { value: "none", label: "Less than a secondary school credential", short: "less than secondary" },
  { value: "secondary", label: "Secondary school (high school)", short: "secondary school" },
  {
    value: "one-year",
    label: "One-year post-secondary credential",
    short: "a one-year credential",
  },
  {
    value: "two-year",
    label: "Two-year post-secondary credential",
    short: "a two-year credential",
  },
  {
    value: "three-year",
    label: "Post-secondary credential, 3+ years (e.g. bachelor's)",
    short: "a 3+ year credential",
  },
  {
    value: "two-credentials",
    label: "Two or more credentials, one being 3+ years",
    short: "two or more credentials",
  },
  {
    value: "masters",
    label: "Master's, or an entry-to-practice professional degree",
    short: "a master's",
  },
  { value: "doctoral", label: "Doctoral (PhD)", short: "a doctorate" },
];

const CANADIAN_YEARS_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1 year" },
  { value: 2, label: "2 years" },
  { value: 3, label: "3 years" },
  { value: 4, label: "4 years" },
  { value: 5, label: "5+ years" },
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

/** Education scenario: pairs with language and Canadian work experience in
    skill transferability — not with foreign work experience, so unlike
    the Canadian work experience scenario this one doesn't ask about it.
    Also tracks a second, independent dimension per side (current/target):
    whether that credential was actually earned in Canada, which unlocks
    a separate additional-points bonus on top of everything else. See
    calculateEducationScenario. */
export function EducationScenarioFlow({ baseScore, elig }: Props) {
  const { setProfile } = usePlannerProfile();

  const [activeStep, setActiveStep] = useState<StepId>(1);

  const [spouse, setSpouse] = useState<boolean | null>(null);
  const [firstLanguageClb, setFirstLanguageClb] =
    useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [canadianYears, setCanadianYears] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<EducationLevel | null>(null);
  const [currentIsCanadian, setCurrentIsCanadian] = useState<boolean | null>(null);
  const [targetLevel, setTargetLevel] = useState<EducationLevel | null>(null);
  const [targetIsCanadian, setTargetIsCanadian] = useState<boolean | null>(null);

  const step1Complete = spouse !== null;
  const step2Complete = isComplete(firstLanguageClb);
  const step3Complete = canadianYears !== null;
  const step4Complete =
    currentLevel !== null &&
    currentIsCanadian !== null &&
    targetLevel !== null &&
    targetIsCanadian !== null;
  const canCalculate = step1Complete && step2Complete && step3Complete && step4Complete;

  const result = useMemo(() => {
    if (!canCalculate || spouse === null || currentLevel === null || targetLevel === null) {
      return null;
    }
    return calculateEducationScenario(baseScore, {
      hasSpouseOrPartner: spouse,
      firstLanguageClb: isComplete(firstLanguageClb) ? firstLanguageClb : EMPTY_ZERO,
      canadianWorkYears: canadianYears ?? 0,
      currentEducationLevel: currentLevel,
      currentEducationIsCanadian: currentIsCanadian ?? false,
      targetEducationLevel: targetLevel,
      targetEducationIsCanadian: targetIsCanadian ?? false,
    });
  }, [
    canCalculate,
    baseScore,
    spouse,
    firstLanguageClb,
    canadianYears,
    currentLevel,
    currentIsCanadian,
    targetLevel,
    targetIsCanadian,
  ]);

  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  const persist = (next: {
    spouse?: boolean;
    firstLanguageClb?: PartialAbilityScores;
    canadianYears?: number;
    currentLevel?: EducationLevel;
  }) => {
    setProfile((p) => ({
      ...p,
      hasSpouseOrPartner: next.spouse ?? p.hasSpouseOrPartner,
      canadianWorkYears: next.canadianYears ?? p.canadianWorkYears,
      educationLevel: next.currentLevel ?? p.educationLevel,
      hasEnglishResults:
        next.firstLanguageClb && isComplete(next.firstLanguageClb) ? true : p.hasEnglishResults,
      englishClb:
        next.firstLanguageClb && isComplete(next.firstLanguageClb)
          ? next.firstLanguageClb
          : p.englishClb,
    }));
  };

  // Each handler only checks steps AFTER its own — see the identical note
  // in CanadianWorkExperienceScenarioFlow for why.
  const handleSpouse = (value: boolean) => {
    setSpouse(value);
    persist({ spouse: value });
    setActiveStep(!step2Complete ? 2 : !step3Complete ? 3 : 4);
  };

  const handleLanguage = (next: PartialAbilityScores) => {
    setFirstLanguageClb(next);
    persist({ firstLanguageClb: next });
    if (isComplete(next)) setActiveStep(!step3Complete ? 3 : 4);
  };

  const handleCanadianYears = (value: number) => {
    setCanadianYears(value);
    persist({ canadianYears: value });
    setActiveStep(4);
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
              <p className="mt-1 text-sm text-muted-foreground">
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

        {/* 02 — Current first official language, coarse (tier only) */}
        {step1Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">02 &middot; Current first official language</p>
            {activeStep === 2 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">
                  What&rsquo;s your current level in your first official language?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This scenario isn&rsquo;t about your language result, but the transferability
                  points are capped together with a language score, so this still needs to be right.
                  Only the tier matters here, not the exact CLB level.
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
            ) : step2Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {languageTierSummary(firstLanguageClb as AbilityScores)}.
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

        {/* 03 — Canadian work experience, fixed context */}
        {step1Complete && step2Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">03 &middot; Canadian work experience</p>
            {activeStep === 3 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">Do you have Canadian work experience?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Canadian work experience also pairs with education in skill-transferability.
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
            ) : step3Complete ? (
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
                  onClick={() => setActiveStep(3)}
                >
                  Edit
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* 04 — Education, current and target */}
        {step1Complete && step2Complete && step3Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">04 &middot; Education</p>
            {activeStep === 4 ? (
              <div className="mt-3">
                <p className="text-[1.05rem] font-semibold text-ink sm:text-[1.15rem]">
                  Your current and target education
                </p>

                <p className="mt-4 text-sm font-medium text-ink">Current highest credential</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EDUCATION_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={currentLevel === opt.value}
                      onClick={() => setCurrentLevel(opt.value)}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Was that credential earned in Canada?
                </p>
                <div className="mt-2 flex gap-2">
                  <FilterChip
                    label="Yes"
                    selected={currentIsCanadian === true}
                    onClick={() => setCurrentIsCanadian(true)}
                  />
                  <FilterChip
                    label="No"
                    selected={currentIsCanadian === false}
                    onClick={() => setCurrentIsCanadian(false)}
                  />
                </div>

                <p className="mt-6 text-sm font-medium text-ink">Target credential</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EDUCATION_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={targetLevel === opt.value}
                      onClick={() => setTargetLevel(opt.value)}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Would that credential be earned in Canada?
                </p>
                <div className="mt-2 flex gap-2">
                  <FilterChip
                    label="Yes"
                    selected={targetIsCanadian === true}
                    onClick={() => setTargetIsCanadian(true)}
                  />
                  <FilterChip
                    label="No"
                    selected={targetIsCanadian === false}
                    onClick={() => setTargetIsCanadian(false)}
                  />
                </div>
              </div>
            ) : step4Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {EDUCATION_OPTIONS.find((o) => o.value === currentLevel)?.short}
                  {currentIsCanadian ? " (Canadian)" : ""} &rarr; targeting{" "}
                  {EDUCATION_OPTIONS.find((o) => o.value === targetLevel)?.short}
                  {targetIsCanadian ? " (Canadian)" : ""}.
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveStep(4)}
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
              <p className="mt-4 text-xs text-muted-foreground">
                Next step: foreign credentials need an educational credential assessment (ECA)
                before they count toward your score.{" "}
                <a
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/education-assessment.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  See IRCC&rsquo;s ECA info &rarr;
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
