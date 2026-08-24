import {
  canadianCredentialBonusForLevel,
  canadianWorkExperiencePoints,
  educationLanguageTransferability,
  educationPoints,
  educationWorkTransferability,
  firstLanguagePoints,
  foreignCanadianWorkTransferability,
  foreignWorkLanguageTransferability,
} from "./core";
import { frenchBonusPoints, secondLanguagePoints } from "./language";
import {
  PNP_NOMINATION_POINTS,
  RULESET_2026_08,
  RULESET_MINISTERIAL_INSTRUCTIONS,
  TRANSFERABILITY_GROUP_CAP,
} from "./ruleset-2026-08";
import type {
  BreakdownLine,
  CanadianWorkExperienceScenarioProfile,
  EducationScenarioProfile,
  EnglishScenarioProfile,
  ForeignWorkExperienceScenarioProfile,
  FrenchScenarioProfile,
  ScenarioResult,
} from "./types";

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

// English is treated as the candidate's FIRST official language throughout
// this app (see calculateFrenchScenario above) — so improving it moves Core
// first-language points AND the two skill-transferability groups that pair
// language with education and with foreign work experience. Education,
// Canadian work experience, and foreign work experience are held fixed at
// their current values: this answers "what if just my English changes,"
// not "what if everything does" (that's the combination-scenarios idea,
// deliberately not built yet). One more thing this does NOT recalculate:
// the French-language bonus, even if the candidate also has a qualifying
// French result — that bonus's English-CLB-5+ qualifier is a live
// dependency this scenario doesn't touch. The UI says so.
export function calculateEnglishScenario(
  baseScore: number,
  profile: EnglishScenarioProfile,
): ScenarioResult {
  const beforeLanguage = firstLanguagePoints(profile.currentEnglishClb, profile.hasSpouseOrPartner);
  const afterLanguage = firstLanguagePoints(profile.targetEnglishClb, profile.hasSpouseOrPartner);

  const educationWork = educationWorkTransferability(
    profile.educationLevel,
    profile.canadianWorkYears,
  );
  const beforeEducationLanguage = educationLanguageTransferability(
    profile.educationLevel,
    profile.currentEnglishClb,
  );
  const afterEducationLanguage = educationLanguageTransferability(
    profile.educationLevel,
    profile.targetEnglishClb,
  );
  const beforeEducationGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    beforeEducationLanguage + educationWork,
  );
  const afterEducationGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    afterEducationLanguage + educationWork,
  );

  const foreignCanadianWork = foreignCanadianWorkTransferability(
    profile.foreignWorkYears,
    profile.canadianWorkYears,
  );
  const beforeForeignLanguage = foreignWorkLanguageTransferability(
    profile.foreignWorkYears,
    profile.currentEnglishClb,
  );
  const afterForeignLanguage = foreignWorkLanguageTransferability(
    profile.foreignWorkYears,
    profile.targetEnglishClb,
  );
  const beforeForeignGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    beforeForeignLanguage + foreignCanadianWork,
  );
  const afterForeignGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    afterForeignLanguage + foreignCanadianWork,
  );

  const breakdown: BreakdownLine[] = [
    {
      label: "First official language points",
      before: beforeLanguage,
      after: afterLanguage,
      delta: afterLanguage - beforeLanguage,
    },
    {
      label: "Skill transferability — education × language",
      before: beforeEducationGroup,
      after: afterEducationGroup,
      delta: afterEducationGroup - beforeEducationGroup,
    },
    {
      label: "Skill transferability — foreign work experience × language",
      before: beforeForeignGroup,
      after: afterForeignGroup,
      delta: afterForeignGroup - beforeForeignGroup,
    },
  ];

  const delta = breakdown.reduce((total, line) => total + line.delta, 0);
  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + delta));

  return {
    baseScore,
    projectedScore,
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_MINISTERIAL_INSTRUCTIONS,
  };
}

// Canadian work experience never pairs with language directly in IRCC's
// tables — only with education (s.22) and with foreign work experience
// (s.24). But those two transferability GROUPS are each capped together
// with a language-paired sub-score that doesn't change here (education x
// language, foreign x language) — so if language points alone already
// saturate a group, more Canadian work experience can't add anything to
// it. Getting that right needs the candidate's current first-language
// level and foreign work experience as fixed context, even though this
// scenario never asks the user to change either.
export function calculateCanadianWorkExperienceScenario(
  baseScore: number,
  profile: CanadianWorkExperienceScenarioProfile,
): ScenarioResult {
  const beforeCore = canadianWorkExperiencePoints(
    profile.currentCanadianWorkYears,
    profile.hasSpouseOrPartner,
  );
  const afterCore = canadianWorkExperiencePoints(
    profile.targetCanadianWorkYears,
    profile.hasSpouseOrPartner,
  );

  const educationLanguage = educationLanguageTransferability(
    profile.educationLevel,
    profile.firstLanguageClb,
  );
  const beforeEducationWork = educationWorkTransferability(
    profile.educationLevel,
    profile.currentCanadianWorkYears,
  );
  const afterEducationWork = educationWorkTransferability(
    profile.educationLevel,
    profile.targetCanadianWorkYears,
  );
  const beforeEducationGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    educationLanguage + beforeEducationWork,
  );
  const afterEducationGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    educationLanguage + afterEducationWork,
  );

  const foreignLanguage = foreignWorkLanguageTransferability(
    profile.foreignWorkYears,
    profile.firstLanguageClb,
  );
  const beforeForeignCanadianWork = foreignCanadianWorkTransferability(
    profile.foreignWorkYears,
    profile.currentCanadianWorkYears,
  );
  const afterForeignCanadianWork = foreignCanadianWorkTransferability(
    profile.foreignWorkYears,
    profile.targetCanadianWorkYears,
  );
  const beforeForeignGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    foreignLanguage + beforeForeignCanadianWork,
  );
  const afterForeignGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    foreignLanguage + afterForeignCanadianWork,
  );

  const breakdown: BreakdownLine[] = [
    {
      label: "Canadian work experience points",
      before: beforeCore,
      after: afterCore,
      delta: afterCore - beforeCore,
    },
    {
      label: "Skill transferability — education × Canadian work experience",
      before: beforeEducationGroup,
      after: afterEducationGroup,
      delta: afterEducationGroup - beforeEducationGroup,
    },
    {
      label: "Skill transferability — foreign × Canadian work experience",
      before: beforeForeignGroup,
      after: afterForeignGroup,
      delta: afterForeignGroup - beforeForeignGroup,
    },
  ];

  const delta = breakdown.reduce((total, line) => total + line.delta, 0);
  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + delta));

  return {
    baseScore,
    projectedScore,
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_MINISTERIAL_INSTRUCTIONS,
  };
}

// Foreign work experience never pairs with education anywhere in IRCC's
// tables, and earns no Core points of its own — it only feeds one
// transferability group: foreign x language plus foreign x Canadian work
// experience, capped together at 50. That's this scenario's entire
// effect, so there's exactly one breakdown line. No hasSpouseOrPartner:
// nothing here varies by spouse status (see ForeignWorkExperienceScenarioProfile).
export function calculateForeignWorkExperienceScenario(
  baseScore: number,
  profile: ForeignWorkExperienceScenarioProfile,
): ScenarioResult {
  const beforeLanguage = foreignWorkLanguageTransferability(
    profile.currentForeignWorkYears,
    profile.firstLanguageClb,
  );
  const afterLanguage = foreignWorkLanguageTransferability(
    profile.targetForeignWorkYears,
    profile.firstLanguageClb,
  );
  const beforeCanadianWork = foreignCanadianWorkTransferability(
    profile.currentForeignWorkYears,
    profile.canadianWorkYears,
  );
  const afterCanadianWork = foreignCanadianWorkTransferability(
    profile.targetForeignWorkYears,
    profile.canadianWorkYears,
  );

  const beforeGroup = Math.min(TRANSFERABILITY_GROUP_CAP, beforeLanguage + beforeCanadianWork);
  const afterGroup = Math.min(TRANSFERABILITY_GROUP_CAP, afterLanguage + afterCanadianWork);

  const breakdown: BreakdownLine[] = [
    {
      label: "Skill transferability — foreign work experience",
      before: beforeGroup,
      after: afterGroup,
      delta: afterGroup - beforeGroup,
    },
  ];

  const delta = breakdown.reduce((total, line) => total + line.delta, 0);
  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + delta));

  return {
    baseScore,
    projectedScore,
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_MINISTERIAL_INSTRUCTIONS,
  };
}

// Education pairs with language (s.21) and Canadian work experience (s.22)
// in skill transferability — not with foreign work experience, so this
// scenario doesn't ask about it at all. Separately, a Canadian-EARNED
// credential (not just any credential at that level) earns its own
// additional-points bonus (s.30) — tracked per side since the candidate's
// current credential and a prospective target aren't necessarily both
// Canadian.
export function calculateEducationScenario(
  baseScore: number,
  profile: EducationScenarioProfile,
): ScenarioResult {
  const beforeCore = educationPoints(profile.currentEducationLevel, profile.hasSpouseOrPartner);
  const afterCore = educationPoints(profile.targetEducationLevel, profile.hasSpouseOrPartner);

  const beforeEducationLanguage = educationLanguageTransferability(
    profile.currentEducationLevel,
    profile.firstLanguageClb,
  );
  const afterEducationLanguage = educationLanguageTransferability(
    profile.targetEducationLevel,
    profile.firstLanguageClb,
  );
  const beforeEducationWork = educationWorkTransferability(
    profile.currentEducationLevel,
    profile.canadianWorkYears,
  );
  const afterEducationWork = educationWorkTransferability(
    profile.targetEducationLevel,
    profile.canadianWorkYears,
  );
  const beforeGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    beforeEducationLanguage + beforeEducationWork,
  );
  const afterGroup = Math.min(
    TRANSFERABILITY_GROUP_CAP,
    afterEducationLanguage + afterEducationWork,
  );

  const beforeCanadianBonus = profile.currentEducationIsCanadian
    ? canadianCredentialBonusForLevel(profile.currentEducationLevel)
    : 0;
  const afterCanadianBonus = profile.targetEducationIsCanadian
    ? canadianCredentialBonusForLevel(profile.targetEducationLevel)
    : 0;

  const breakdown: BreakdownLine[] = [
    {
      label: "Level of education points",
      before: beforeCore,
      after: afterCore,
      delta: afterCore - beforeCore,
    },
    {
      label: "Skill transferability — education",
      before: beforeGroup,
      after: afterGroup,
      delta: afterGroup - beforeGroup,
    },
    {
      label: "Canadian educational credential (additional points)",
      before: beforeCanadianBonus,
      after: afterCanadianBonus,
      delta: afterCanadianBonus - beforeCanadianBonus,
    },
  ];

  const delta = breakdown.reduce((total, line) => total + line.delta, 0);
  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + delta));

  return {
    baseScore,
    projectedScore,
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_MINISTERIAL_INSTRUCTIONS,
  };
}

// A provincial nomination adds a flat 600 points and touches nothing else —
// no skill-transferability recalculation, unlike French/English/work
// experience. This is the simplest possible scenario: one yes/no input.
export function calculatePnpScenario(baseScore: number): ScenarioResult {
  const breakdown: BreakdownLine[] = [
    {
      label: "Provincial nomination (additional points)",
      before: 0,
      after: PNP_NOMINATION_POINTS,
      delta: PNP_NOMINATION_POINTS,
    },
  ];

  const projectedScore = Math.max(0, Math.min(CRS_MAX, baseScore + PNP_NOMINATION_POINTS));

  return {
    baseScore,
    projectedScore,
    delta: projectedScore - baseScore,
    breakdown,
    ruleset: RULESET_2026_08,
  };
}
