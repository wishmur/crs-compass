import { describe, expect, it } from "vitest";
import {
  canadianCredentialBonusForLevel,
  canadianWorkExperiencePoints,
  educationLanguageTransferability,
  educationPoints,
  educationWorkTransferability,
  firstLanguageAbilityPoints,
  firstLanguagePoints,
  foreignCanadianWorkTransferability,
  foreignWorkLanguageTransferability,
  totalTransferabilityPoints,
} from "./core";
import type { AbilityScores } from "./types";

const abilities = (
  speaking: number,
  listening: number,
  reading: number,
  writing: number,
): AbilityScores => ({ speaking, listening, reading, writing });

const clb7 = abilities(7, 7, 7, 7);
const clb9 = abilities(9, 9, 9, 9);
const clb4 = abilities(4, 4, 4, 4);
const clb10 = abilities(10, 10, 10, 10);

describe("firstLanguageAbilityPoints — CLB band boundaries (Ministerial Instructions s.13)", () => {
  it.each([
    [3, false, 0],
    [4, false, 6],
    [5, false, 6],
    [6, false, 9],
    [7, false, 17],
    [8, false, 23],
    [9, false, 31],
    [10, false, 34],
    [11, false, 34],
  ])("without spouse, level %i -> %i points", (level, hasSpouse, expected) => {
    expect(firstLanguageAbilityPoints(level, hasSpouse)).toBe(expected);
  });

  it.each([
    [4, true, 6],
    [6, true, 8],
    [7, true, 16],
    [8, true, 22],
    [9, true, 29],
    [10, true, 32],
  ])("with spouse, level %i -> %i points", (level, hasSpouse, expected) => {
    expect(firstLanguageAbilityPoints(level, hasSpouse)).toBe(expected);
  });
});

describe("firstLanguagePoints — combined cap", () => {
  it("hits exactly 136 at CLB10 across all four abilities, without spouse", () => {
    expect(firstLanguagePoints(clb10, false)).toBe(136);
  });

  it("hits exactly 128 at CLB10 across all four abilities, with spouse", () => {
    expect(firstLanguagePoints(clb10, true)).toBe(128);
  });

  it("sums uncapped below the maximum", () => {
    expect(firstLanguagePoints(clb7, false)).toBe(17 * 4);
  });
});

describe("educationPoints (Ministerial Instructions s.11)", () => {
  it.each([
    ["none", false, 0],
    ["secondary", false, 30],
    ["one-year", false, 90],
    ["two-year", false, 98],
    ["three-year", false, 120],
    ["two-credentials", false, 128],
    ["masters", false, 135],
    ["doctoral", false, 150],
    ["secondary", true, 28],
    ["three-year", true, 112],
    ["doctoral", true, 140],
  ] as const)("%s, withSpouse=%s -> %i", (level, hasSpouse, expected) => {
    expect(educationPoints(level, hasSpouse)).toBe(expected);
  });
});

describe("canadianWorkExperiencePoints (Ministerial Instructions s.15)", () => {
  it.each([
    [0, false, 0],
    [1, false, 40],
    [2, false, 53],
    [3, false, 64],
    [4, false, 72],
    [5, false, 80],
    [0, true, 0],
    [1, true, 35],
    [5, true, 70],
  ])("%i years, withSpouse=%s -> %i", (years, hasSpouse, expected) => {
    expect(canadianWorkExperiencePoints(years, hasSpouse)).toBe(expected);
  });

  it("bands years above 5 the same as exactly 5", () => {
    expect(canadianWorkExperiencePoints(9, false)).toBe(canadianWorkExperiencePoints(5, false));
  });
});

describe("educationLanguageTransferability (Ministerial Instructions s.21)", () => {
  it("is 0 for a secondary credential regardless of language", () => {
    expect(educationLanguageTransferability("secondary", clb9)).toBe(0);
  });

  it("is 0 when language doesn't reach CLB7 on all four abilities", () => {
    expect(educationLanguageTransferability("three-year", clb4)).toBe(0);
  });

  it("is 13 for one-plus-year education with CLB 7-8", () => {
    expect(educationLanguageTransferability("one-year", clb7)).toBe(13);
  });

  it("is 25 for one-plus-year education with CLB 9+", () => {
    expect(educationLanguageTransferability("three-year", clb9)).toBe(25);
  });

  it("is 25 for advanced education with CLB 7-8", () => {
    expect(educationLanguageTransferability("masters", clb7)).toBe(25);
  });

  it("is 50 for advanced education with CLB 9+", () => {
    expect(educationLanguageTransferability("doctoral", clb9)).toBe(50);
  });
});

describe("educationWorkTransferability (Ministerial Instructions s.22)", () => {
  it("is 0 for a secondary credential regardless of Canadian experience", () => {
    expect(educationWorkTransferability("secondary", 5)).toBe(0);
  });

  it("is 0 with no Canadian work experience", () => {
    expect(educationWorkTransferability("doctoral", 0)).toBe(0);
  });

  it("is 13 for one-plus-year education with 1 year Canadian experience", () => {
    expect(educationWorkTransferability("one-year", 1)).toBe(13);
  });

  it("is 25 for one-plus-year education with 2+ years Canadian experience", () => {
    expect(educationWorkTransferability("two-year", 2)).toBe(25);
  });

  it("is 25 for advanced education with 1 year Canadian experience", () => {
    expect(educationWorkTransferability("two-credentials", 1)).toBe(25);
  });

  it("is 50 for advanced education with 2+ years Canadian experience", () => {
    expect(educationWorkTransferability("masters", 3)).toBe(50);
  });
});

describe("foreignWorkLanguageTransferability (Ministerial Instructions s.23)", () => {
  it("is 0 with no foreign work experience", () => {
    expect(foreignWorkLanguageTransferability(0, clb9)).toBe(0);
  });

  it("is 13 for 1-2 years foreign experience with CLB 7-8", () => {
    expect(foreignWorkLanguageTransferability(2, clb7)).toBe(13);
  });

  it("is 25 for 1-2 years foreign experience with CLB 9+", () => {
    expect(foreignWorkLanguageTransferability(1, clb9)).toBe(25);
  });

  it("is 25 for 3+ years foreign experience with CLB 7-8", () => {
    expect(foreignWorkLanguageTransferability(3, clb7)).toBe(25);
  });

  it("is 50 for 3+ years foreign experience with CLB 9+", () => {
    expect(foreignWorkLanguageTransferability(5, clb9)).toBe(50);
  });
});

describe("foreignCanadianWorkTransferability (Ministerial Instructions s.24)", () => {
  it("is 0 with no foreign work experience", () => {
    expect(foreignCanadianWorkTransferability(0, 5)).toBe(0);
  });

  it("is 13 for 1-2 years foreign experience with 1 year Canadian experience", () => {
    expect(foreignCanadianWorkTransferability(1, 1)).toBe(13);
  });

  it("is 25 for 1-2 years foreign experience with 2+ years Canadian experience", () => {
    expect(foreignCanadianWorkTransferability(2, 2)).toBe(25);
  });

  it("is 25 for 3+ years foreign experience with 1 year Canadian experience", () => {
    expect(foreignCanadianWorkTransferability(3, 1)).toBe(25);
  });

  it("is 50 for 3+ years foreign experience with 2+ years Canadian experience", () => {
    expect(foreignCanadianWorkTransferability(4, 4)).toBe(50);
  });
});

describe("totalTransferabilityPoints — group caps (Ministerial Instructions s.27)", () => {
  it("caps the education group at 50 even though the sub-scores would total more", () => {
    // doctoral + CLB9+ = 50 (educationLanguage), doctoral + 2yr Canadian = 50 (educationWork).
    // Raw sum 100, capped to 50.
    const result = totalTransferabilityPoints("doctoral", clb9, 5, 0);
    expect(result.educationLanguage).toBe(50);
    expect(result.educationWork).toBe(50);
    expect(result.total).toBe(50);
  });

  it("caps the foreign-experience group at 50 the same way", () => {
    const result = totalTransferabilityPoints("none", clb9, 5, 5);
    expect(result.foreignLanguage).toBe(50);
    expect(result.foreignCanadianWork).toBe(50);
    expect(result.total).toBe(50);
  });

  it("reaches the full 100 when both groups are independently maxed", () => {
    const result = totalTransferabilityPoints("doctoral", clb9, 5, 5);
    expect(result.total).toBe(100);
  });

  it("sums uncapped groups directly", () => {
    // one-year education + CLB7-8 = 13, one-year education + 1yr Canadian = 13 -> group 26.
    // No foreign experience -> foreign group 0.
    const result = totalTransferabilityPoints("one-year", clb7, 1, 0);
    expect(result.educationLanguage).toBe(13);
    expect(result.educationWork).toBe(13);
    expect(result.foreignLanguage).toBe(0);
    expect(result.foreignCanadianWork).toBe(0);
    expect(result.total).toBe(26);
  });
});

describe("canadianCredentialBonusForLevel (Ministerial Instructions s.30)", () => {
  it.each([
    ["none", 0],
    ["secondary", 0],
    ["one-year", 15],
    ["two-year", 15],
    ["three-year", 30],
    ["two-credentials", 30],
    ["masters", 30],
    ["doctoral", 30],
  ] as const)("%s -> %i", (level, expected) => {
    expect(canadianCredentialBonusForLevel(level)).toBe(expected);
  });

  it("puts a standalone 3-year credential in the 30-point tier, unlike transferability's 'advanced' tier", () => {
    // Transferability's educationTransferTier groups "three-year" with
    // "one-plus-year" (not "advanced") — this bonus tier boundary is
    // different, and it's easy to accidentally reuse the wrong one.
    expect(canadianCredentialBonusForLevel("three-year")).toBe(30);
    expect(educationLanguageTransferability("three-year", clb9)).toBe(25); // one-plus-year tier, not advanced (50)
  });
});
