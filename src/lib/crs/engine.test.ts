import { describe, expect, it } from "vitest";
import { calculateFrenchScenario } from "./engine";
import { frenchBonusPoints, secondLanguageAbilityPoints, secondLanguagePoints } from "./language";
import type { AbilityScores, FrenchScenarioProfile } from "./types";

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
