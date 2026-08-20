import { frenchBonusPoints, secondLanguagePoints } from "./language";
import { RULESET_2026_08 } from "./ruleset-2026-08";
import type { BreakdownLine, FrenchScenarioProfile, ScenarioResult } from "./types";

const CRS_MAX = 1200;

// Why this engine only touches two components ------------------------------
// IRCC's published skill-transferability combinations (education + language,
// foreign work experience + language) are keyed to the candidate's FIRST
// official language, not the second. This engine assumes English is the
// user's first official language and French their second — the common case
// for this product's users. Under that assumption, improving a French result
// changes exactly two things: second-official-language points, and the
// French-language additional-points bonus. Age, education, and work
// experience are untouched, so they aren't asked for here. If French is
// actually the user's stronger/first-designated language, this scenario
// understates the effect (transferability points would also move) — the UI
// says so.
export function calculateFrenchScenario(
  baseScore: number,
  profile: FrenchScenarioProfile,
): ScenarioResult {
  const englishClb = profile.hasEnglishResults ? profile.englishClb : null;

  const beforeSecondLang = secondLanguagePoints(
    profile.currentFrenchNclc,
    profile.hasSpouseOrPartner,
  );
  const afterSecondLang = secondLanguagePoints(
    profile.targetFrenchNclc,
    profile.hasSpouseOrPartner,
  );

  const beforeBonus = frenchBonusPoints(profile.currentFrenchNclc, englishClb);
  const afterBonus = frenchBonusPoints(profile.targetFrenchNclc, englishClb);

  const breakdown: BreakdownLine[] = [
    {
      label: "Second official language points",
      before: beforeSecondLang,
      after: afterSecondLang,
      delta: afterSecondLang - beforeSecondLang,
    },
    {
      label: "French-language bonus (additional points)",
      before: beforeBonus,
      after: afterBonus,
      delta: afterBonus - beforeBonus,
    },
  ];

  const delta = breakdown.reduce((total, line) => total + line.delta, 0);
  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + delta));

  return {
    baseScore,
    projectedScore,
    // Report the delta actually applied (post-cap), not the raw component
    // sum, so the headline number and the breakdown never disagree.
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_2026_08,
  };
}
