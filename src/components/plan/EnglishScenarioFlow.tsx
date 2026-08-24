import { useEffect, useMemo, useRef, useState } from "react";
import { AbilityLevelPicker, FIRST_LANGUAGE_BANDS } from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateEnglishScenario } from "@/lib/crs/engine";
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

// Foreign work experience only ever feeds skill transferability (never
// Core points directly), and transferability only cares about which tier
// a candidate lands in — 0 / 1-2 / 3+ years score identically within a
// tier — so this offers exactly those three choices rather than false
// year-by-year precision.
const FOREIGN_YEARS_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1–2 years" },
  { value: 3, label: "3+ years" },
];

function bandLabel(value: number): string {
  if (value >= 10) return "10+";
  if (value >= 4) return String(value);
  return "below 4";
}

function summarizeAbilities(scores: AbilityScores): string {
  const values = ABILITIES.map((a) => scores[a]);
  const allSame = values.every((v) => v === values[0]);
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

/** English scenario: treats English as the candidate's first official
    language (see calculateEnglishScenario), so — unlike French — getting
    the math right needs the candidate's current education level and
    Canadian/foreign work experience too, not just spouse status. Same
    strict-accordion, collapse-to-summary pattern as FrenchScenarioFlow,
    just with two more steps for those extra inputs. */
export function EnglishScenarioFlow({ baseScore, elig }: Props) {
  const { setProfile } = usePlannerProfile();

  const [activeStep, setActiveStep] = useState<StepId>(1);

  const [spouse, setSpouse] = useState<boolean | null>(null);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [canadianYears, setCanadianYears] = useState<number | null>(null);
  const [foreignYears, setForeignYears] = useState<number | null>(null);
  const [current, setCurrent] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [target, setTarget] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);

  const step1Complete = spouse !== null;
  const step2Complete = educationLevel !== null;
  const step3Complete = canadianYears !== null && foreignYears !== null;
  const step4Complete = isComplete(current) && isComplete(target);
  const canCalculate = step1Complete && step2Complete && step3Complete && step4Complete;

  const result = useMemo(() => {
    if (!canCalculate || spouse === null || educationLevel === null) return null;
    return calculateEnglishScenario(baseScore, {
      hasSpouseOrPartner: spouse,
      educationLevel,
      canadianWorkYears: canadianYears ?? 0,
      foreignWorkYears: foreignYears ?? 0,
      currentEnglishClb: isComplete(current) ? current : EMPTY_ZERO,
      targetEnglishClb: isComplete(target) ? target : EMPTY_ZERO,
    });
  }, [
    canCalculate,
    baseScore,
    spouse,
    educationLevel,
    canadianYears,
    foreignYears,
    current,
    target,
  ]);

  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  const persist = (next: {
    spouse?: boolean;
    educationLevel?: EducationLevel;
    canadianYears?: number | undefined;
    foreignYears?: number | undefined;
    current?: PartialAbilityScores;
  }) => {
    setProfile((p) => ({
      ...p,
      hasSpouseOrPartner: next.spouse ?? p.hasSpouseOrPartner,
      educationLevel: next.educationLevel ?? p.educationLevel,
      canadianWorkYears: next.canadianYears ?? p.canadianWorkYears,
      foreignWorkYears: next.foreignYears ?? p.foreignWorkYears,
      hasEnglishResults: next.current ? isComplete(next.current) : p.hasEnglishResults,
      englishClb: next.current && isComplete(next.current) ? next.current : p.englishClb,
    }));
  };

  const handleSpouse = (value: boolean) => {
    setSpouse(value);
    persist({ spouse: value });
    setActiveStep(step2Complete ? (step3Complete ? (step4Complete ? 1 : 4) : 3) : 2);
  };

  const handleEducation = (value: EducationLevel) => {
    setEducationLevel(value);
    persist({ educationLevel: value });
    setActiveStep(step3Complete ? (step4Complete ? 1 : 4) : 3);
  };

  const handleWorkExperience = (next: { canadian?: number; foreign?: number }) => {
    const nextCanadian = next.canadian ?? canadianYears;
    const nextForeign = next.foreign ?? foreignYears;
    if (next.canadian !== undefined) setCanadianYears(next.canadian);
    if (next.foreign !== undefined) setForeignYears(next.foreign);
    persist({ canadianYears: next.canadian, foreignYears: next.foreign });
    if (nextCanadian !== null && nextForeign !== null) setActiveStep(4);
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
                  Education pairs with language in the skill-transferability points, so this needs
                  to be right even though this scenario is about English.
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

        {/* 03 — Work experience */}
        {step1Complete && step2Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">03 &middot; Work experience</p>
            {activeStep === 3 ? (
              <div className="mt-3">
                <p className="font-medium text-ink">Canadian and foreign work experience</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Both also pair with language in skill transferability — Canadian experience
                  additionally earns Core points on its own.
                </p>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Canadian work experience</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CANADIAN_YEARS_OPTIONS.map((opt) => (
                      <FilterChip
                        key={opt.value}
                        label={opt.label}
                        selected={canadianYears === opt.value}
                        onClick={() => handleWorkExperience({ canadian: opt.value })}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Foreign work experience</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FOREIGN_YEARS_OPTIONS.map((opt) => (
                      <FilterChip
                        key={opt.value}
                        label={opt.label}
                        selected={foreignYears === opt.value}
                        onClick={() => handleWorkExperience({ foreign: opt.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : step3Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {CANADIAN_YEARS_OPTIONS.find((o) => o.value === canadianYears)?.label} Canadian,{" "}
                  {FOREIGN_YEARS_OPTIONS.find((o) => o.value === foreignYears)?.label.toLowerCase()}{" "}
                  foreign.
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

        {/* 04 — English, current and target */}
        {step1Complete && step2Complete && step3Complete && (
          <div className="mt-8 border-t pt-8" style={DIVIDER_STYLE}>
            <p className="kicker">04 &middot; English result</p>
            {activeStep === 4 ? (
              <div className="mt-3">
                <p className="text-[1.05rem] font-semibold text-ink sm:text-[1.15rem]">
                  Your current and target English results
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter both as CLB levels. If you know an IELTS, CELPIP, or PTE Core score instead,
                  convert it first using{" "}
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

                <p className="mt-4 text-sm font-medium text-ink">Current</p>
                <div className="mt-2">
                  <AbilityLevelPicker
                    levelLabel="CLB"
                    value={current}
                    onChange={(next) => {
                      setCurrent(next);
                      persist({ current: next });
                    }}
                    bands={FIRST_LANGUAGE_BANDS}
                  />
                </div>

                <p className="mt-6 text-sm font-medium text-ink">Target</p>
                <div className="mt-2">
                  <AbilityLevelPicker
                    levelLabel="CLB"
                    value={target}
                    onChange={setTarget}
                    bands={FIRST_LANGUAGE_BANDS}
                  />
                </div>
              </div>
            ) : step4Complete ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-[0.95rem] text-ink">
                  {summarizeAbilities(current as AbilityScores)} &rarr; targeting{" "}
                  {summarizeAbilities(target as AbilityScores)}.
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
              <p className="mt-2 text-xs text-muted-foreground">
                This assumes English is your first official language, so it recalculates Core
                language points and the education/foreign-experience transferability groups. It does{" "}
                <em>not</em> recalculate the French-language bonus, even if you also have a
                qualifying French result — that bonus depends on your English level too, so changing
                both together isn&rsquo;t reflected here yet.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Next step: English results come from an IRCC-approved IELTS, CELPIP, or PTE Core
                test.{" "}
                <a
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  See IRCC&rsquo;s language testing info &rarr;
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
