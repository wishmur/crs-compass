import type { EducationLevel, RulesetMeta } from "./types";

// Point values below were read directly off the live IRCC CRS criteria page
// (its own "Page details" showed date modified 2026-06-22) on 2026-08-19.
// Do not hand-edit these numbers without re-checking the source — if IRCC
// changes them, add a new ruleset-<date>.ts file rather than mutating this
// one, so past scenario results stay reproducible.

export const RULESET_2026_08: RulesetMeta = {
  version: "2026-08",
  effectiveFrom: "2026-06-22",
  verifiedAt: "2026-08-19",
  sources: [
    {
      label: "IRCC — CRS criteria",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score/crs-criteria.html",
    },
  ],
};

// Education, first-official-language, Canadian work experience, and every
// skill-transferability combination below aren't published as detailed
// tables on the summary CRS-criteria page above — only category maximums
// are. These come from the actual legal instrument the CRS is defined by,
// cross-checked against it on 2026-08-24: age, second-language, French
// bonus and PNP (all already in this file) match this source exactly.
export const RULESET_MINISTERIAL_INSTRUCTIONS: RulesetMeta = {
  version: "2026-08",
  effectiveFrom: "2025-03-25",
  verifiedAt: "2026-08-24",
  sources: [
    {
      label: "Ministerial Instructions respecting the Express Entry system",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-application-management-system/current.html",
    },
  ],
};

// --- Second official language points (Core/human capital factors, A) ------
// Per ability, banded by CLB/NCLC level. Identical banding regardless of
// spouse status; only the combined cap below differs.
export const SECOND_LANGUAGE_PER_ABILITY: { min: number; points: number }[] = [
  { min: 9, points: 6 },
  { min: 7, points: 3 },
  { min: 5, points: 1 },
  { min: 0, points: 0 },
];

export const SECOND_LANGUAGE_CAP = { withSpouse: 22, withoutSpouse: 24 };

// --- Age points (Core/human capital factors, A) ----------------------------
// Flat at the 20-29 plateau, then a fixed per-age table on both sides. Ages
// 18-19 are rising toward the plateau; 30+ is the decline most candidates
// never notice until they check.
export const AGE_POINTS_PLATEAU = { minAge: 20, maxAge: 29, withSpouse: 100, withoutSpouse: 110 };
export const AGE_POINTS_TABLE: Record<number, { withSpouse: number; withoutSpouse: number }> = {
  18: { withSpouse: 90, withoutSpouse: 99 },
  19: { withSpouse: 95, withoutSpouse: 105 },
  30: { withSpouse: 95, withoutSpouse: 105 },
  31: { withSpouse: 90, withoutSpouse: 99 },
  32: { withSpouse: 85, withoutSpouse: 94 },
  33: { withSpouse: 80, withoutSpouse: 88 },
  34: { withSpouse: 75, withoutSpouse: 83 },
  35: { withSpouse: 70, withoutSpouse: 77 },
  36: { withSpouse: 65, withoutSpouse: 72 },
  37: { withSpouse: 60, withoutSpouse: 66 },
  38: { withSpouse: 55, withoutSpouse: 61 },
  39: { withSpouse: 50, withoutSpouse: 55 },
  40: { withSpouse: 45, withoutSpouse: 50 },
  41: { withSpouse: 35, withoutSpouse: 39 },
  42: { withSpouse: 25, withoutSpouse: 28 },
  43: { withSpouse: 15, withoutSpouse: 17 },
  44: { withSpouse: 5, withoutSpouse: 6 },
};

// --- Additional points — French language skills (D) -----------------------
// "Scored NCLC 7 or higher on all four French language skills and scored
// CLB 4 or lower in English (or didn't take an English test)" -> 25.
// "...and scored CLB 5 or higher on all four English skills" -> 50.
// The 50-point tier supersedes the 25-point tier rather than stacking with
// it — this is the standard reading used by IRCC's own examples: the 25
// case is "French qualifies, strong English doesn't," the 50 case is
// "French qualifies, strong English does."
export const FRENCH_BONUS_NCLC_THRESHOLD = 7;
export const FRENCH_BONUS_ENGLISH_CLB_THRESHOLD = 5;
export const FRENCH_BONUS_POINTS = { partial: 25, full: 50 };

// --- Additional points — provincial/territorial nomination (D) ------------
// Flat 600, regardless of any other factor. Unlike education and work
// experience, a nomination is NOT one of IRCC's skill-transferability
// combination inputs (those only combine education/experience with
// language), so it never interacts with transferability points.
export const PNP_NOMINATION_POINTS = 600;

// --- Level of education (Core/human capital factors, A) --------------------
// Ministerial Instructions s.11. Highest credential obtained — a foreign
// credential only counts with an equivalency assessment. See types.ts for
// the EducationLevel band definitions.
export const EDUCATION_POINTS: Record<
  EducationLevel,
  { withSpouse: number; withoutSpouse: number }
> = {
  none: { withSpouse: 0, withoutSpouse: 0 },
  secondary: { withSpouse: 28, withoutSpouse: 30 },
  "one-year": { withSpouse: 84, withoutSpouse: 90 },
  "two-year": { withSpouse: 91, withoutSpouse: 98 },
  "three-year": { withSpouse: 112, withoutSpouse: 120 },
  "two-credentials": { withSpouse: 119, withoutSpouse: 128 },
  masters: { withSpouse: 126, withoutSpouse: 135 },
  doctoral: { withSpouse: 140, withoutSpouse: 150 },
};

// --- First official language proficiency (Core/human capital factors, A) --
// Ministerial Instructions s.13. Per ability — finer-grained bands than the
// second-language table above (4 and 5 share a band; 6, 7, 8, 9, 10+ each
// stand alone).
export const FIRST_LANGUAGE_PER_ABILITY: {
  min: number;
  withSpouse: number;
  withoutSpouse: number;
}[] = [
  { min: 10, withSpouse: 32, withoutSpouse: 34 },
  { min: 9, withSpouse: 29, withoutSpouse: 31 },
  { min: 8, withSpouse: 22, withoutSpouse: 23 },
  { min: 7, withSpouse: 16, withoutSpouse: 17 },
  { min: 6, withSpouse: 8, withoutSpouse: 9 },
  { min: 4, withSpouse: 6, withoutSpouse: 6 },
  { min: 0, withSpouse: 0, withoutSpouse: 0 },
];
export const FIRST_LANGUAGE_CAP = { withSpouse: 128, withoutSpouse: 136 };

// --- Canadian work experience (Core/human capital factors, A) --------------
// Ministerial Instructions s.15. Years capped at 5 (5+ scores the same as
// exactly 5).
export const CANADIAN_WORK_EXPERIENCE_POINTS: Record<
  number,
  { withSpouse: number; withoutSpouse: number }
> = {
  0: { withSpouse: 0, withoutSpouse: 0 },
  1: { withSpouse: 35, withoutSpouse: 40 },
  2: { withSpouse: 46, withoutSpouse: 53 },
  3: { withSpouse: 56, withoutSpouse: 64 },
  4: { withSpouse: 63, withoutSpouse: 72 },
  5: { withSpouse: 70, withoutSpouse: 80 },
};

// --- Skill transferability factors (C) --------------------------------------
// Ministerial Instructions s.21-27. Two independently-capped groups of 50:
// (education x language) + (education x Canadian work experience), and
// (foreign work experience x language) + (foreign work experience x
// Canadian work experience). Certificate-of-qualification (trades) is a
// third group, out of scope for now — not one of this app's scenarios.
//
// Each group's two sub-tables share the same 0/13/25/50 shape, keyed by a
// coarser "tier" than the table above: language only distinguishes
// below-7 / 7-8 / 9+ here (not the finer per-ability bands used for Core
// language points), and education collapses to secondary-or-below /
// one-plus-year / advanced (2+ credentials, master's, doctoral).
export const TRANSFERABILITY_GROUP_CAP = 50;

export const EDUCATION_LANGUAGE_TRANSFERABILITY: Record<string, Record<string, number>> = {
  "secondary-or-below": { "below-7": 0, "seven-to-eight": 0, "nine-plus": 0 },
  "one-plus-year": { "below-7": 0, "seven-to-eight": 13, "nine-plus": 25 },
  advanced: { "below-7": 0, "seven-to-eight": 25, "nine-plus": 50 },
};

export const EDUCATION_CANADIAN_WORK_TRANSFERABILITY: Record<string, Record<string, number>> = {
  "secondary-or-below": { none: 0, one: 0, "two-plus": 0 },
  "one-plus-year": { none: 0, one: 13, "two-plus": 25 },
  advanced: { none: 0, one: 25, "two-plus": 50 },
};

export const FOREIGN_WORK_LANGUAGE_TRANSFERABILITY: Record<string, Record<string, number>> = {
  none: { "below-7": 0, "seven-to-eight": 0, "nine-plus": 0 },
  "one-two": { "below-7": 0, "seven-to-eight": 13, "nine-plus": 25 },
  "three-plus": { "below-7": 0, "seven-to-eight": 25, "nine-plus": 50 },
};

export const FOREIGN_CANADIAN_WORK_TRANSFERABILITY: Record<string, Record<string, number>> = {
  none: { none: 0, one: 0, "two-plus": 0 },
  "one-two": { none: 0, one: 13, "two-plus": 25 },
  "three-plus": { none: 0, one: 25, "two-plus": 50 },
};

// --- Additional points — Canadian educational credential (D) --------------
// Ministerial Instructions s.30. Distinct from the Core education factor
// above: this only counts a credential actually studied for in Canada
// (8+ months full-time, physically present), regardless of the Core
// education level otherwise on file.
export const CANADIAN_CREDENTIAL_BONUS = { oneOrTwoYear: 15, threeYearPlus: 30 };
