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
