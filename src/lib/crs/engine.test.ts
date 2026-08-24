import { describe, expect, it } from "vitest";
import {
  calculateCanadianWorkExperienceScenario,
  calculateEducationScenario,
  calculateEnglishScenario,
  calculateForeignWorkExperienceScenario,
  calculateFrenchScenario,
  calculatePnpScenario,
} from "./engine";
import { frenchBonusPoints, secondLanguageAbilityPoints, secondLanguagePoints } from "./language";
import type {
  AbilityScores,
  CanadianWorkExperienceScenarioProfile,
  EducationScenarioProfile,
  EnglishScenarioProfile,
  ForeignWorkExperienceScenarioProfile,
  FrenchScenarioProfile,
} from "./types";

const abilities = (
  speaking: number,
  listening: number,
  reading: number,
  writing: number,
): AbilityScores => ({
  speaking,
  listening,
  reading,
  writing,
});

const noResult = abilities(0, 0, 0, 0);
const nclc7 = abilities(7, 7, 7, 7);
const nclc9 = abilities(9, 9, 9, 9);
const clb4 = abilities(4, 4, 4, 4);
const clb5 = abilities(5, 5, 5, 5);
const clb9 = abilities(9, 9, 9, 9);

function baseProfile(overrides: Partial<FrenchScenarioProfile> = {}): FrenchScenarioProfile {
  return {
    hasSpouseOrPartner: false,
    hasEnglishResults: true,
    englishClb: clb9,
    currentFrenchNclc: noResult,
    targetFrenchNclc: noResult,
    ...overrides,
  };
}

describe("secondLanguageAbilityPoints — CLB/NCLC band boundaries", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [6, 1],
    [7, 3],
    [8, 3],
    [9, 6],
    [10, 6],
  ])("level %i -> %i points", (level, expected) => {
    expect(secondLanguageAbilityPoints(level)).toBe(expected);
  });
});

describe("secondLanguagePoints — combined cap", () => {
  it("caps at 22 with a spouse even if the per-ability sum would exceed it", () => {
    // 6 * 4 = 24 raw, capped to 22 with spouse.
    expect(secondLanguagePoints(nclc9, true)).toBe(22);
  });

  it("caps at 24 without a spouse", () => {
    expect(secondLanguagePoints(nclc9, false)).toBe(24);
  });

  it("sums uncapped when below the cap", () => {
    // NCLC 7 all four abilities -> 3 points each -> 12, under either cap.
    expect(secondLanguagePoints(nclc7, false)).toBe(12);
  });
});

describe("frenchBonusPoints", () => {
  it("is 0 when French doesn't reach NCLC 7 on all four abilities", () => {
    const almost = abilities(7, 7, 7, 6);
    expect(frenchBonusPoints(almost, clb9)).toBe(0);
  });

  it("is 25 when French qualifies and English is CLB 4 or lower on all four", () => {
    expect(frenchBonusPoints(nclc7, clb4)).toBe(25);
  });

  it("is 25 when French qualifies and no English test was taken", () => {
    expect(frenchBonusPoints(nclc7, null)).toBe(25);
  });

  it("is 50 when French qualifies and English is CLB 5+ on all four abilities", () => {
    expect(frenchBonusPoints(nclc7, clb5)).toBe(50);
  });

  it("is 50 (not stacked with 25) when both thresholds are exceeded", () => {
    expect(frenchBonusPoints(nclc9, clb9)).toBe(50);
  });

  it("falls to 25 when English is mixed and not all four abilities clear CLB 5", () => {
    const mixedEnglish = abilities(9, 9, 9, 4);
    expect(frenchBonusPoints(nclc7, mixedEnglish)).toBe(25);
  });
});

describe("calculateFrenchScenario — end-to-end scenarios", () => {
  it("no French result -> NCLC 7 all four, strong English, no spouse: +12 second-language +50 bonus", () => {
    const result = calculateFrenchScenario(
      487,
      baseProfile({ hasSpouseOrPartner: false, englishClb: clb9, targetFrenchNclc: nclc7 }),
    );
    expect(result.breakdown).toEqual([
      { label: "Second official language points", before: 0, after: 12, delta: 12 },
      { label: "French-language bonus (additional points)", before: 0, after: 50, delta: 50 },
    ]);
    expect(result.delta).toBe(62);
    expect(result.projectedScore).toBe(549);
  });

  it("no French result -> NCLC 7 all four, English below CLB 5: +12 second-language +25 bonus", () => {
    const result = calculateFrenchScenario(
      487,
      baseProfile({ hasSpouseOrPartner: false, englishClb: clb4, targetFrenchNclc: nclc7 }),
    );
    expect(result.delta).toBe(37);
    expect(result.projectedScore).toBe(524);
  });

  it("already has some French, improves further, has a spouse (lower cap)", () => {
    const result = calculateFrenchScenario(
      450,
      baseProfile({
        hasSpouseOrPartner: true,
        englishClb: clb9,
        currentFrenchNclc: abilities(5, 5, 5, 5), // 1 pt/ability = 4 total
        targetFrenchNclc: nclc9, // 6 pt/ability = 24 raw, capped to 22 w/ spouse
      }),
    );
    const secondLangLine = result.breakdown[0]!;
    expect(secondLangLine.before).toBe(4);
    expect(secondLangLine.after).toBe(22);
    expect(secondLangLine.delta).toBe(18);
    // Bonus goes from 0 (NCLC5 doesn't qualify) to 50 (NCLC9 + CLB9 English).
    expect(result.breakdown[1]).toEqual({
      label: "French-language bonus (additional points)",
      before: 0,
      after: 50,
      delta: 50,
    });
    expect(result.projectedScore).toBe(450 + 18 + 50);
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculateFrenchScenario(
      1190,
      baseProfile({ hasSpouseOrPartner: false, englishClb: clb9, targetFrenchNclc: nclc9 }),
    );
    expect(result.projectedScore).toBe(1200);
    expect(result.delta).toBe(10);
  });

  it("delta is 0 when the target matches the current result", () => {
    const result = calculateFrenchScenario(
      487,
      baseProfile({ currentFrenchNclc: nclc7, targetFrenchNclc: nclc7 }),
    );
    expect(result.delta).toBe(0);
    expect(result.projectedScore).toBe(487);
  });
});

describe("calculatePnpScenario", () => {
  it("adds a flat 600 points", () => {
    const result = calculatePnpScenario(450);
    expect(result.breakdown).toEqual([
      { label: "Provincial nomination (additional points)", before: 0, after: 600, delta: 600 },
    ]);
    expect(result.delta).toBe(600);
    expect(result.projectedScore).toBe(1050);
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculatePnpScenario(700);
    expect(result.projectedScore).toBe(1200);
    expect(result.delta).toBe(500);
  });

  it("clamps even from a very low base score", () => {
    const result = calculatePnpScenario(0);
    expect(result.projectedScore).toBe(600);
    expect(result.delta).toBe(600);
  });
});

describe("calculateEnglishScenario", () => {
  function baseEnglishProfile(
    overrides: Partial<EnglishScenarioProfile> = {},
  ): EnglishScenarioProfile {
    return {
      hasSpouseOrPartner: false,
      educationLevel: "none",
      canadianWorkYears: 0,
      foreignWorkYears: 0,
      currentEnglishClb: noResult,
      targetEnglishClb: noResult,
      ...overrides,
    };
  }

  it("moves only Core language points when education/work experience don't qualify for transferability", () => {
    const result = calculateEnglishScenario(
      450,
      baseEnglishProfile({ targetEnglishClb: nclc9 }), // reuse the all-9s fixture as CLB9
    );
    expect(result.breakdown).toEqual([
      { label: "First official language points", before: 0, after: 124, delta: 124 },
      { label: "Skill transferability — education × language", before: 0, after: 0, delta: 0 },
      {
        label: "Skill transferability — foreign work experience × language",
        before: 0,
        after: 0,
        delta: 0,
      },
    ]);
    expect(result.delta).toBe(124);
  });

  it("moves education transferability alongside Core points when education qualifies", () => {
    const result = calculateEnglishScenario(
      450,
      baseEnglishProfile({ educationLevel: "three-year", targetEnglishClb: nclc9 }),
    );
    const eduLine = result.breakdown[1]!;
    expect(eduLine.before).toBe(0);
    expect(eduLine.after).toBe(25); // one-plus-year tier, CLB9+ -> 25
  });

  it("moves foreign-experience transferability alongside Core points when foreign experience qualifies", () => {
    const result = calculateEnglishScenario(
      450,
      baseEnglishProfile({ foreignWorkYears: 3, targetEnglishClb: nclc9 }),
    );
    const foreignLine = result.breakdown[2]!;
    expect(foreignLine.before).toBe(0);
    expect(foreignLine.after).toBe(50); // 3+ years foreign, CLB9+ -> 50
  });

  it("caps the education group at 50 even when Canadian work experience alone already maxes it", () => {
    // doctoral + 2yr Canadian work experience = 50 (educationWork) on its own,
    // regardless of language -> improving English can't push the group past 50.
    const result = calculateEnglishScenario(
      450,
      baseEnglishProfile({
        educationLevel: "doctoral",
        canadianWorkYears: 2,
        targetEnglishClb: nclc9,
      }),
    );
    const eduLine = result.breakdown[1]!;
    expect(eduLine.before).toBe(50);
    expect(eduLine.after).toBe(50);
    expect(eduLine.delta).toBe(0);
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculateEnglishScenario(
      1190,
      baseEnglishProfile({
        educationLevel: "doctoral",
        foreignWorkYears: 5,
        targetEnglishClb: nclc9,
      }),
    );
    expect(result.projectedScore).toBe(1200);
  });

  it("delta is 0 when the target matches the current result", () => {
    const result = calculateEnglishScenario(
      450,
      baseEnglishProfile({ currentEnglishClb: nclc7, targetEnglishClb: nclc7 }),
    );
    expect(result.delta).toBe(0);
  });
});

describe("calculateCanadianWorkExperienceScenario", () => {
  function baseProfile(
    overrides: Partial<CanadianWorkExperienceScenarioProfile> = {},
  ): CanadianWorkExperienceScenarioProfile {
    return {
      hasSpouseOrPartner: false,
      educationLevel: "none",
      firstLanguageClb: noResult,
      foreignWorkYears: 0,
      currentCanadianWorkYears: 0,
      targetCanadianWorkYears: 0,
      ...overrides,
    };
  }

  it("moves only Core points when education and foreign experience don't qualify for transferability", () => {
    const result = calculateCanadianWorkExperienceScenario(
      450,
      baseProfile({ targetCanadianWorkYears: 3 }),
    );
    expect(result.breakdown).toEqual([
      { label: "Canadian work experience points", before: 0, after: 64, delta: 64 },
      {
        label: "Skill transferability — education × Canadian work experience",
        before: 0,
        after: 0,
        delta: 0,
      },
      {
        label: "Skill transferability — foreign × Canadian work experience",
        before: 0,
        after: 0,
        delta: 0,
      },
    ]);
    expect(result.delta).toBe(64);
  });

  it("moves education transferability alongside Core points when education and language qualify", () => {
    const result = calculateCanadianWorkExperienceScenario(
      450,
      baseProfile({
        educationLevel: "three-year",
        firstLanguageClb: nclc9,
        targetCanadianWorkYears: 2,
      }),
    );
    const eduLine = result.breakdown[1]!;
    expect(eduLine.before).toBe(25); // education x language alone, no Canadian work experience yet
    expect(eduLine.after).toBe(50); // +25 from 2 years Canadian work experience
    expect(result.breakdown[0]!.delta).toBe(53); // Core points for 2 years Canadian work experience
    expect(result.delta).toBe(53 + 25);
  });

  it("caps the education group at 50 even when language alone already maxes it", () => {
    // doctoral + CLB9+ = 50 (education x language) on its own -> more Canadian
    // work experience can't push the group past 50, even though it's the
    // thing this scenario is actually asking about.
    const result = calculateCanadianWorkExperienceScenario(
      450,
      baseProfile({
        educationLevel: "doctoral",
        firstLanguageClb: nclc9,
        targetCanadianWorkYears: 5,
      }),
    );
    const eduLine = result.breakdown[1]!;
    expect(eduLine.before).toBe(50);
    expect(eduLine.after).toBe(50);
    expect(eduLine.delta).toBe(0);
    // Core points still move normally.
    expect(result.breakdown[0]!.delta).toBe(80);
  });

  it("moves the foreign-experience group when foreign work experience and language qualify", () => {
    const result = calculateCanadianWorkExperienceScenario(
      450,
      baseProfile({ foreignWorkYears: 3, firstLanguageClb: nclc7, targetCanadianWorkYears: 2 }),
    );
    const foreignLine = result.breakdown[2]!;
    expect(foreignLine.before).toBe(25); // foreign x language alone
    expect(foreignLine.after).toBe(50); // +25 from 2 years Canadian work experience, capped at 50
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculateCanadianWorkExperienceScenario(
      1150,
      baseProfile({
        educationLevel: "doctoral",
        firstLanguageClb: nclc9,
        foreignWorkYears: 5,
        targetCanadianWorkYears: 5,
      }),
    );
    expect(result.projectedScore).toBe(1200);
  });

  it("delta is 0 when the target matches the current years", () => {
    const result = calculateCanadianWorkExperienceScenario(
      450,
      baseProfile({ currentCanadianWorkYears: 2, targetCanadianWorkYears: 2 }),
    );
    expect(result.delta).toBe(0);
  });
});

describe("calculateForeignWorkExperienceScenario", () => {
  function baseProfile(
    overrides: Partial<ForeignWorkExperienceScenarioProfile> = {},
  ): ForeignWorkExperienceScenarioProfile {
    return {
      firstLanguageClb: noResult,
      canadianWorkYears: 0,
      currentForeignWorkYears: 0,
      targetForeignWorkYears: 0,
      ...overrides,
    };
  }

  it("has exactly one breakdown line — the single transferability group", () => {
    const result = calculateForeignWorkExperienceScenario(
      450,
      baseProfile({ firstLanguageClb: nclc9, targetForeignWorkYears: 2 }),
    );
    expect(result.breakdown).toEqual([
      { label: "Skill transferability — foreign work experience", before: 0, after: 25, delta: 25 },
    ]);
    expect(result.delta).toBe(25);
  });

  it("combines the language and Canadian-work sub-scores, capped at 50", () => {
    const result = calculateForeignWorkExperienceScenario(
      450,
      baseProfile({ firstLanguageClb: nclc7, canadianWorkYears: 3, targetForeignWorkYears: 1 }),
    );
    // 1-2yr foreign x CLB7-8 = 13, 1-2yr foreign x 2+yr Canadian = 25 -> 38.
    expect(result.breakdown[0]!.after).toBe(38);
  });

  it("caps the group at 50 — more foreign experience adds nothing once already saturated", () => {
    // At 1 year foreign experience, CLB9+ and 5yr Canadian work experience
    // already combine to the 50 cap (25 + 25). Going to 3+ years foreign
    // experience raises both sub-scores to 50 each, but the group is still
    // capped at 50 — no further CRS benefit.
    const result = calculateForeignWorkExperienceScenario(
      450,
      baseProfile({
        firstLanguageClb: nclc9,
        canadianWorkYears: 5,
        currentForeignWorkYears: 1,
        targetForeignWorkYears: 3,
      }),
    );
    expect(result.breakdown[0]!.before).toBe(50);
    expect(result.breakdown[0]!.after).toBe(50);
    expect(result.delta).toBe(0);
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculateForeignWorkExperienceScenario(
      1180,
      baseProfile({ firstLanguageClb: nclc9, targetForeignWorkYears: 2 }),
    );
    expect(result.projectedScore).toBe(1200);
  });

  it("delta is 0 when the target matches the current years", () => {
    const result = calculateForeignWorkExperienceScenario(
      450,
      baseProfile({ currentForeignWorkYears: 1, targetForeignWorkYears: 1 }),
    );
    expect(result.delta).toBe(0);
  });
});

describe("calculateEducationScenario", () => {
  function baseProfile(
    overrides: Partial<EducationScenarioProfile> = {},
  ): EducationScenarioProfile {
    return {
      hasSpouseOrPartner: false,
      firstLanguageClb: noResult,
      canadianWorkYears: 0,
      currentEducationLevel: "secondary",
      currentEducationIsCanadian: false,
      targetEducationLevel: "secondary",
      targetEducationIsCanadian: false,
      ...overrides,
    };
  }

  it("moves Core points and education transferability when language qualifies", () => {
    const result = calculateEducationScenario(
      450,
      baseProfile({ firstLanguageClb: nclc9, targetEducationLevel: "three-year" }),
    );
    expect(result.breakdown).toEqual([
      { label: "Level of education points", before: 30, after: 120, delta: 90 },
      { label: "Skill transferability — education", before: 0, after: 25, delta: 25 },
      {
        label: "Canadian educational credential (additional points)",
        before: 0,
        after: 0,
        delta: 0,
      },
    ]);
    expect(result.delta).toBe(115);
  });

  it("adds the Canadian credential bonus only when the target is flagged as Canadian-earned", () => {
    const result = calculateEducationScenario(
      450,
      baseProfile({ targetEducationLevel: "two-year", targetEducationIsCanadian: true }),
    );
    const bonusLine = result.breakdown[2]!;
    expect(bonusLine.before).toBe(0);
    expect(bonusLine.after).toBe(15);
    expect(result.delta).toBe(68 + 15); // Core: 98 - 30 = 68, plus the +15 bonus
  });

  it("isolates the Canadian credential bonus when the education level itself doesn't change", () => {
    const result = calculateEducationScenario(
      450,
      baseProfile({
        firstLanguageClb: nclc9,
        canadianWorkYears: 5,
        currentEducationLevel: "doctoral",
        targetEducationLevel: "doctoral",
        targetEducationIsCanadian: true,
      }),
    );
    expect(result.breakdown[0]!.delta).toBe(0); // Core unchanged, same level both sides
    expect(result.breakdown[1]!.delta).toBe(0); // transferability unchanged, same level both sides
    expect(result.breakdown[2]!.delta).toBe(30); // only the Canadian bonus moves
    expect(result.delta).toBe(30);
  });

  it("caps the transferability group at 50 — moving to a higher tier adds nothing once saturated", () => {
    const result = calculateEducationScenario(
      450,
      baseProfile({
        firstLanguageClb: nclc9,
        canadianWorkYears: 2,
        currentEducationLevel: "three-year",
        targetEducationLevel: "two-credentials",
      }),
    );
    expect(result.breakdown[1]!.before).toBe(50);
    expect(result.breakdown[1]!.after).toBe(50);
    expect(result.breakdown[1]!.delta).toBe(0);
    // Core points still move normally even though transferability is saturated.
    expect(result.breakdown[0]!.delta).toBe(8);
  });

  it("clamps the projected score at the 1200 maximum", () => {
    const result = calculateEducationScenario(
      1150,
      baseProfile({
        firstLanguageClb: nclc9,
        canadianWorkYears: 5,
        targetEducationLevel: "doctoral",
        targetEducationIsCanadian: true,
      }),
    );
    expect(result.projectedScore).toBe(1200);
  });

  it("delta is 0 when the target matches the current level and Canadian status", () => {
    const result = calculateEducationScenario(
      450,
      baseProfile({ currentEducationLevel: "one-year", targetEducationLevel: "one-year" }),
    );
    expect(result.delta).toBe(0);
  });
});
