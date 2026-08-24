import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbilityLevelPicker,
  TRANSFERABILITY_LANGUAGE_BANDS,
} from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateCanadianWorkExperienceScenario } from "@/lib/crs/engine";
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

type StepId = 1 | 2 | 3 | 4 | 5;

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

/** Canadian work experience scenario: never pairs with language directly
    in IRCC's tables, but the two transferability groups it does move
    (education, foreign experience) are each capped together with a
    language-paired sub-score that stays fixed here — so this still needs
    the candidate's current first-official-language level as context, just
    coarser than English needs it (only the transferability tier matters,
    not the exact CLB level, since Core language points aren't being
    recalculated). See calculateCanadianWorkExperienceScenario. */
export function CanadianWorkExperienceScenarioFlow({ baseScore, elig }: Props) {
  const { setProfile } = usePlannerProfile();

  const [activeStep, setActiveStep] = useState<StepId>(1);

  const [spouse, setSpouse] = useState<boolean | null>(null);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [firstLanguageClb, setFirstLanguageClb] =
    useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [foreignYears, setForeignYears] = useState<number | null>(null);
  const [currentYears, setCurrentYears] = useState<number | null>(null);
  const [targetYears, setTargetYears] = useState<number | null>(null);

  const step1Complete = spouse !== null;
  const step2Complete = educationLevel !== null;
  const step3Complete = isComplete(firstLanguageClb);
  const step4Complete = foreignYears !== null;
  const step5Complete = currentYears !== null && targetYears !== null;
  const canCalculate =
    step1Complete && step2Complete && step3Complete && step4Complete && step5Complete;

  const result = useMemo(() => {
    if (!canCalculate || spouse === null || educationLevel === null) return null;
    return calculateCanadianWorkExperienceScenario(baseScore, {
      hasSpouseOrPartner: spouse,
      educationLevel,
      firstLanguageClb: isComplete(firstLanguageClb) ? firstLanguageClb : EMPTY_ZERO,
      foreignWorkYears: foreignYears ?? 0,
      currentCanadianWorkYears: currentYears ?? 0,
      targetCanadianWorkYears: targetYears ?? 0,
    });
  }, [
    canCalculate,
    baseScore,
    spouse,
    educationLevel,
    firstLanguageClb,
    foreignYears,
    currentYears,
    targetYears,
  ]);

  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  const persist = (next: {
    spouse?: boolean;
    educationLevel?: EducationLevel;
    firstLanguageClb?: PartialAbilityScores;
    foreignYears?: number;
  }) => {
    setProfile((p) => ({
      ...p,
      hasSpouseOrPartner: next.spouse ?? p.hasSpouseOrPartner,
      educationLevel: next.educationLevel ?? p.educationLevel,
      foreignWorkYears: next.foreignYears ?? p.foreignWorkYears,
      hasEnglishResults:
        next.firstLanguageClb && isComplete(next.firstLanguageClb) ? true : p.hasEnglishResults,
      englishClb:
        next.firstLanguageClb && isComplete(next.firstLanguageClb)
          ? next.firstLanguageClb
          : p.englishClb,
    }));
  };

  // Each handler only checks steps AFTER its own — checking a step's own
  // `xComplete` flag right after setting it would read a stale value,
  // since the state update hasn't landed yet within this same handler.
  const handleSpouse = (value: boolean) => {
    setSpouse(value);
    persist({ spouse: value });
    setActiveStep(!step2Complete ? 2 : !step3Complete ? 3 : !step4Complete ? 4 : 5);
  };

  const handleEducation = (value: EducationLevel) => {
    setEducationLevel(value);
    persist({ educationLevel: value });
    setActiveStep(!step3Complete ? 3 : !step4Complete ? 4 : 5);
  };

  const handleLanguage = (next: PartialAbilityScores) => {
    setFirstLanguageClb(next);
    persist({ firstLanguageClb: next });
    if (isComplete(next)) setActiveStep(!step4Complete ? 4 : 5);
  };

  const handleForeignYears = (value: number) => {
    setForeignYears(value);
    persist({ foreignYears: value });
    setActiveStep(5);
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

        {/* 02 — Education */}
        {step1Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">02 &middot; Current education</p>
            {activeStep === 2 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">
                  What&rsquo;s your highest level of education?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Education pairs with Canadian work experience in the skill-transferability points.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EDUCATION_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={educationLevel === opt.value}
                      onClick={() => handleEducation(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ) : step2Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  Highest education:{" "}
                  {EDUCATION_OPTIONS.find((o) => o.value === educationLevel)?.short}.
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

        {/* 03 — Current first official language, coarse (tier only) */}
        {step1Complete && step2Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">03 &middot; Current first official language</p>
            {activeStep === 3 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">
                  What&rsquo;s your current level in your first official language?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This scenario isn&rsquo;t about your language result, but the education
                  transferability points are capped together with a language score, so this still
                  needs to be right. Only the tier matters here, not the exact CLB level.
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
            ) : step3Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {languageTierSummary(firstLanguageClb as AbilityScores)}.
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

        {/* 04 — Foreign work experience */}
        {step1Complete && step2Complete && step3Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">04 &middot; Foreign work experience</p>
            {activeStep === 4 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">Do you have foreign work experience?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Foreign experience also pairs with Canadian work experience in
                  skill-transferability.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FOREIGN_YEARS_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={foreignYears === opt.value}
                      onClick={() => handleForeignYears(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ) : step4Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  Foreign work experience:{" "}
                  {FOREIGN_YEARS_OPTIONS.find((o) => o.value === foreignYears)?.label.toLowerCase()}
                  .
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

        {/* 05 — Canadian work experience, current and target */}
        {step1Complete && step2Complete && step3Complete && step4Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">05 &middot; Canadian work experience</p>
            {activeStep === 5 ? (
              <div className="mt-3">
                <p className="text-[1.05rem] font-semibold text-ink sm:text-[1.15rem]">
                  Your current and target Canadian work experience
                </p>
                <p className="mt-4 text-sm font-medium text-ink">Current</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CANADIAN_YEARS_OPTIONS.map((opt) => (
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
                  {CANADIAN_YEARS_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      selected={targetYears === opt.value}
                      onClick={() => setTargetYears(opt.value)}
                    />
                  ))}
                </div>
              </div>
            ) : step5Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {CANADIAN_YEARS_OPTIONS.find((o) => o.value === currentYears)?.label} &rarr;
                  targeting {CANADIAN_YEARS_OPTIONS.find((o) => o.value === targetYears)?.label}.
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveStep(5)}
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
                Next step: Canadian work experience needs to match a National Occupational
                Classification TEER 0-3 role, full-time or the full-time equivalent.{" "}
                <a
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  See IRCC&rsquo;s Canadian Experience Class info &rarr;
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
