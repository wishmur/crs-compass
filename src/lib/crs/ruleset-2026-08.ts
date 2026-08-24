import type { RulesetMeta } from "./types";

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
