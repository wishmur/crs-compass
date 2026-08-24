// Shared types for the versioned CRS rules engine. Every calculation in the
// app should be traceable to a specific Ruleset so a future rule change adds
// a new version instead of mutating history.

/** Where a ruleset's numbers came from and when they were last checked
    against the live IRCC pages. */
export interface RulesetSource {
  label: string;
  url: string;
}

export interface RulesetMeta {
  /** e.g. "2026-08" — the month this ruleset was verified, not a semver. */
  version: string;
  /** Date-modified shown on the primary IRCC source page at verification time. */
  effectiveFrom: string;
  /** Date a human/agent last checked this ruleset's numbers against IRCC. */
  verifiedAt: string;
  sources: RulesetSource[];
}

export type Ability = "speaking" | "listening" | "reading" | "writing";

export const ABILITIES: readonly Ability[] = ["speaking", "listening", "reading", "writing"];

export type AbilityScores = Record<Ability, number>;

/** UI-local: a set of ability scores still being filled in. `null` means
    "not answered yet," distinct from any real CLB/NCLC band. */
export type PartialAbilityScores = Record<Ability, number | null>;

export const EMPTY_PARTIAL_ABILITIES: PartialAbilityScores = {
  speaking: null,
  listening: null,
  reading: null,
  writing: null,
};

export function isComplete(scores: PartialAbilityScores): scores is AbilityScores {
  return ABILITIES.every((a) => scores[a] !== null);
}

/** One line of a transparent point breakdown — never collapse a scenario
    result into a single unexplained delta. */
export interface BreakdownLine {
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface ScenarioResult {
  baseScore: number;
  projectedScore: number;
  delta: number;
  breakdown: BreakdownLine[];
  ruleset: RulesetMeta;
}

/** Supporting profile inputs the French scenario needs. Deliberately narrow:
    only what second-official-language points and the French bonus actually
    depend on. See src/lib/crs/engine.ts for why education and work
    experience are NOT here. */
export interface FrenchScenarioProfile {
  hasSpouseOrPartner: boolean;
  /** False = "I haven't taken an English test" — a distinct CRS state from
      scoring CLB 4 or lower, but treated the same by the French bonus rule. */
  hasEnglishResults: boolean;
  englishClb: AbilityScores;
  currentFrenchNclc: AbilityScores;
  targetFrenchNclc: AbilityScores;
}

/** IRCC's "level of education" bands — Ministerial Instructions s.11. Feeds
    both Core education points directly and skill-transferability (paired
    with first-official-language and Canadian work experience). */
export type EducationLevel =
  | "none" // less than a secondary school credential
  | "secondary"
  | "one-year" // one-year post-secondary program credential
  | "two-year" // two-year post-secondary program credential
  | "three-year" // post-secondary program credential of 3+ years
  | "two-credentials" // 2+ post-secondary credentials, one 3+ years
  | "masters" // master's, or an entry-to-practice professional degree
  | "doctoral";

export const EDUCATION_LEVELS: readonly EducationLevel[] = [
  "none",
  "secondary",
  "one-year",
  "two-year",
  "three-year",
  "two-credentials",
  "masters",
  "doctoral",
];

/** Supporting profile inputs the English scenario needs. Unlike French,
    English is assumed to be the candidate's FIRST official language (see
    engine.ts) — so improving it moves Core first-language points AND two
    of the four skill-transferability combinations (paired with education,
    and with foreign work experience). Education and work experience are
    held fixed at their current values throughout — this scenario answers
    "what if just my English changes," not "what if everything does." */
export interface EnglishScenarioProfile {
  hasSpouseOrPartner: boolean;
  educationLevel: EducationLevel;
  canadianWorkYears: number;
  foreignWorkYears: number;
  currentEnglishClb: AbilityScores;
  targetEnglishClb: AbilityScores;
}

/** Supporting profile inputs the Canadian work experience scenario needs.
    Canadian work experience doesn't pair with language directly anywhere
    in IRCC's tables (only with education and with foreign work
    experience) — but firstLanguageClb is still required here, because the
    education x language transferability group is capped together WITH
    education x Canadian-work: if language points alone already saturate
    that group, more Canadian work experience can't add anything, and
    getting that right means knowing the (unchanging) language figure even
    though this scenario never asks the user to change it. Same idea for
    foreignWorkYears against the foreign-experience group. */
export interface CanadianWorkExperienceScenarioProfile {
  hasSpouseOrPartner: boolean;
  educationLevel: EducationLevel;
  firstLanguageClb: AbilityScores;
  foreignWorkYears: number;
  currentCanadianWorkYears: number;
  targetCanadianWorkYears: number;
}

/** Supporting profile inputs the foreign work experience scenario needs.
    Foreign work experience never pairs with education anywhere in IRCC's
    tables — only with language (s.23) and with Canadian work experience
    (s.24), both capped together as one group — so unlike the Canadian
    work experience scenario, this one doesn't need an education level at
    all. It does need current language and Canadian work experience as
    fixed context, for the same group-saturation reason as before.
    Deliberately no hasSpouseOrPartner: none of IRCC's skill-
    transferability tables (unlike Core points) vary by spouse status, and
    foreign work experience earns no Core points of its own — so this
    scenario has nothing spouse-dependent to compute, and doesn't ask. */
export interface ForeignWorkExperienceScenarioProfile {
  firstLanguageClb: AbilityScores;
  canadianWorkYears: number;
  currentForeignWorkYears: number;
  targetForeignWorkYears: number;
}
