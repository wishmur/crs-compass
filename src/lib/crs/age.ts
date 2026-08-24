import { AGE_POINTS_PLATEAU, AGE_POINTS_TABLE } from "./ruleset-2026-08";

export interface AgePoints {
  withSpouse: number;
  withoutSpouse: number;
}

/** Age points at a given age, both with and without an accompanying spouse
    or partner. 17 and under, and 45 and over, both score 0 — everything
    else is a direct table lookup, flat across the 20-29 plateau. */
export function agePointsForAge(age: number): AgePoints {
  if (age >= AGE_POINTS_PLATEAU.minAge && age <= AGE_POINTS_PLATEAU.maxAge) {
    return {
      withSpouse: AGE_POINTS_PLATEAU.withSpouse,
      withoutSpouse: AGE_POINTS_PLATEAU.withoutSpouse,
    };
  }
  return AGE_POINTS_TABLE[age] ?? { withSpouse: 0, withoutSpouse: 0 };
}
