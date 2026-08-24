import { describe, expect, it } from "vitest";
import { agePointsForAge } from "./age";

describe("agePointsForAge", () => {
  it("is 0 at 17 and under", () => {
    expect(agePointsForAge(17)).toEqual({ withSpouse: 0, withoutSpouse: 0 });
    expect(agePointsForAge(0)).toEqual({ withSpouse: 0, withoutSpouse: 0 });
  });

  it("rises through 18 and 19 toward the plateau", () => {
    expect(agePointsForAge(18)).toEqual({ withSpouse: 90, withoutSpouse: 99 });
    expect(agePointsForAge(19)).toEqual({ withSpouse: 95, withoutSpouse: 105 });
  });

  it("is flat at the maximum across the whole 20-29 plateau", () => {
    expect(agePointsForAge(20)).toEqual({ withSpouse: 100, withoutSpouse: 110 });
    expect(agePointsForAge(25)).toEqual({ withSpouse: 100, withoutSpouse: 110 });
    expect(agePointsForAge(29)).toEqual({ withSpouse: 100, withoutSpouse: 110 });
  });

  it("starts declining immediately at 30", () => {
    expect(agePointsForAge(30)).toEqual({ withSpouse: 95, withoutSpouse: 105 });
  });

  it("matches the table through the decline to 44", () => {
    expect(agePointsForAge(35)).toEqual({ withSpouse: 70, withoutSpouse: 77 });
    expect(agePointsForAge(44)).toEqual({ withSpouse: 5, withoutSpouse: 6 });
  });

  it("is 0 at 45 and over", () => {
    expect(agePointsForAge(45)).toEqual({ withSpouse: 0, withoutSpouse: 0 });
    expect(agePointsForAge(60)).toEqual({ withSpouse: 0, withoutSpouse: 0 });
  });
});
