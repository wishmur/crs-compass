import { ABILITIES, type AbilityScores, type EducationLevel } from "./types";
import {
  CANADIAN_CREDENTIAL_BONUS,
  CANADIAN_WORK_EXPERIENCE_POINTS,
  EDUCATION_CANADIAN_WORK_TRANSFERABILITY,
  EDUCATION_LANGUAGE_TRANSFERABILITY,
  EDUCATION_POINTS,
  FIRST_LANGUAGE_CAP,
  FIRST_LANGUAGE_PER_ABILITY,
  FOREIGN_CANADIAN_WORK_TRANSFERABILITY,
  FOREIGN_WORK_LANGUAGE_TRANSFERABILITY,
  TRANSFERABILITY_GROUP_CAP,
} from "./ruleset-2026-08";

/** Points for one ability at a given CLB level, in the candidate's FIRST
    official language — a finer table than second-language (see
    language.ts): 4 and 5 share a band, then 6, 7, 8, 9, 10+ each stand
    alone. */
export function firstLanguageAbilityPoints(level: number, hasSpouseOrPartner: boolean): number {
  const band = FIRST_LANGUAGE_PER_ABILITY.find((b) => level >= b.min);
  if (!band) return 0;
  return hasSpouseOrPartner ? band.withSpouse : band.withoutSpouse;
}

/** Combined first-official-language points across all four abilities,
    capped per the with/without-spouse maximum (each ability is already
    individually capped, so this cap is a defensive backstop). */
export function firstLanguagePoints(scores: AbilityScores, hasSpouseOrPartner: boolean): number {
  const sum = ABILITIES.reduce(
    (total, ability) => total + firstLanguageAbilityPoints(scores[ability], hasSpouseOrPartner),
    0,
  );
  const cap = hasSpouseOrPartner ? FIRST_LANGUAGE_CAP.withSpouse : FIRST_LANGUAGE_CAP.withoutSpouse;
  return Math.min(sum, cap);
}

/** Core/human-capital points for a level of education. */
export function educationPoints(level: EducationLevel, hasSpouseOrPartner: boolean): number {
  const points = EDUCATION_POINTS[level];
  return hasSpouseOrPartner ? points.withSpouse : points.withoutSpouse;
}

/** Core/human-capital points for years of Canadian work experience. Years
    above 5 score the same as exactly 5. */
export function canadianWorkExperiencePoints(years: number, hasSpouseOrPartner: boolean): number {
  const banded = Math.max(0, Math.min(5, Math.floor(years)));
  const points = CANADIAN_WORK_EXPERIENCE_POINTS[banded]!;
  return hasSpouseOrPartner ? points.withSpouse : points.withoutSpouse;
}

/** Additional points for a Canadian-earned educational credential
    (Ministerial Instructions s.30) — a different factor from Core
    education points above, and keyed to a slightly different tier
    boundary than skill-transferability's "advanced" tier: a standalone
    3-year credential earns the 30-point tier here (unlike transferability,
    where it's grouped with 1-2 year credentials at the lower tier). Does
    NOT vary by spouse status. Only meaningful when the credential this
    level represents was actually studied for in Canada — callers must
    gate on that separately, since a foreign credential at the same level
    earns 0 here regardless of level. */
export function canadianCredentialBonusForLevel(level: EducationLevel): number {
  if (level === "none" || level === "secondary") return 0;
  if (level === "one-year" || level === "two-year") return CANADIAN_CREDENTIAL_BONUS.oneOrTwoYear;
  return CANADIAN_CREDENTIAL_BONUS.threeYearPlus;
}

/** IRCC's skill-transferability tables collapse first-language proficiency
    to three coarser tiers than the Core points table uses — below CLB 7,
    CLB 7-8, and CLB 9+ — all four abilities considered together. */
function languageTransferTier(scores: AbilityScores): "below-7" | "seven-to-eight" | "nine-plus" {
  const allAtLeast = (min: number) => ABILITIES.every((a) => scores[a] >= min);
  if (allAtLeast(9)) return "nine-plus";
  if (allAtLeast(7)) return "seven-to-eight";
  return "below-7";
}

/** Education collapses to three tiers for transferability purposes:
    secondary-or-below scores 0 no matter what else is true; one-plus-year
    covers single credentials of 1-3+ years; advanced covers 2+ credentials
    (one being 3+ years), master's, or doctoral. */
function educationTransferTier(
  level: EducationLevel,
): "secondary-or-below" | "one-plus-year" | "advanced" {
  if (level === "none" || level === "secondary") return "secondary-or-below";
  if (level === "two-credentials" || level === "masters" || level === "doctoral") return "advanced";
  return "one-plus-year";
}

function canadianWorkTransferTier(years: number): "none" | "one" | "two-plus" {
  if (years <= 0) return "none";
  if (years < 2) return "one";
  return "two-plus";
}

function foreignWorkTransferTier(years: number): "none" | "one-two" | "three-plus" {
  if (years <= 0) return "none";
  if (years < 3) return "one-two";
  return "three-plus";
}

/** Skill transferability: education x first-official-language, capped
    contribution before combining with the education x Canadian-work-
    experience group (see totalTransferabilityPoints). */
export function educationLanguageTransferability(
  level: EducationLevel,
  firstLanguageClb: AbilityScores,
): number {
  return EDUCATION_LANGUAGE_TRANSFERABILITY[educationTransferTier(level)]![
    languageTransferTier(firstLanguageClb)
  ]!;
}

/** Skill transferability: education x Canadian work experience. */
export function educationWorkTransferability(
  level: EducationLevel,
  canadianWorkYears: number,
): number {
  return EDUCATION_CANADIAN_WORK_TRANSFERABILITY[educationTransferTier(level)]![
    canadianWorkTransferTier(canadianWorkYears)
  ]!;
}

/** Skill transferability: foreign work experience x first-official-
    language. */
export function foreignWorkLanguageTransferability(
  foreignWorkYears: number,
  firstLanguageClb: AbilityScores,
): number {
  return FOREIGN_WORK_LANGUAGE_TRANSFERABILITY[foreignWorkTransferTier(foreignWorkYears)]![
    languageTransferTier(firstLanguageClb)
  ]!;
}

/** Skill transferability: foreign work experience x Canadian work
    experience. */
export function foreignCanadianWorkTransferability(
  foreignWorkYears: number,
  canadianWorkYears: number,
): number {
  return FOREIGN_CANADIAN_WORK_TRANSFERABILITY[foreignWorkTransferTier(foreignWorkYears)]![
    canadianWorkTransferTier(canadianWorkYears)
  ]!;
}

export interface TransferabilityBreakdown {
  educationLanguage: number;
  educationWork: number;
  foreignLanguage: number;
  foreignCanadianWork: number;
  /** (educationLanguage + educationWork) capped at 50, plus
      (foreignLanguage + foreignCanadianWork) capped at 50. Excludes the
      certificate-of-qualification (trades) group, out of scope for this
      app's scenarios. */
  total: number;
}

/** Full skill-transferability points for a profile — every combination
    IRCC defines except the trades certificate group. Two independently-
    capped groups of 50 each (Ministerial Instructions s.27). */
export function totalTransferabilityPoints(
  level: EducationLevel,
  firstLanguageClb: AbilityScores,
  canadianWorkYears: number,
  foreignWorkYears: number,
): TransferabilityBreakdown {
  const educationLanguage = educationLanguageTransferability(level, firstLanguageClb);
  const educationWork = educationWorkTransferability(level, canadianWorkYears);
  const foreignLanguage = foreignWorkLanguageTransferability(foreignWorkYears, firstLanguageClb);
  const foreignCanadianWork = foreignCanadianWorkTransferability(
    foreignWorkYears,
    canadianWorkYears,
  );

  const educationGroup = Math.min(TRANSFERABILITY_GROUP_CAP, educationLanguage + educationWork);
  const foreignGroup = Math.min(TRANSFERABILITY_GROUP_CAP, foreignLanguage + foreignCanadianWork);

  return {
    educationLanguage,
    educationWork,
    foreignLanguage,
    foreignCanadianWork,
    total: educationGroup + foreignGroup,
  };
}
