// Foundation for the planning/scenario experience. Not implemented yet —
// this file exists so consumers (the /plan route, future hooks, the future
// CRS rules engine) can start importing stable type names.
//
// When the planner ships, it will let a user hold a base CRS score constant,
// toggle hypothetical changes (language result, work experience, education),
// and see (a) the predicted new score under IRCC's published rules and
// (b) how that new score would have compared against relevant historical
// rounds.

import type { Program } from "@/data/round-types";

/** A single hypothetical change the user is considering. Discriminated by
    kind so a future rules-engine can dispatch on it. */
export type ScenarioChange =
  | { kind: "language"; test: "IELTS" | "CELPIP" | "TEF" | "TCF"; delta: number }
  | { kind: "canadian_work_years"; years: number }
  | { kind: "foreign_work_years"; years: number }
  | { kind: "education"; level: "bachelor" | "two_or_more" | "master" | "phd" }
  | { kind: "provincial_nomination" }
  | { kind: "sibling_in_canada" };

/** Snapshot of what the user considers the "current" state. baseScore is
    what they already know; the changes list is what they're modeling on top. */
export interface Scenario {
  baseScore: number;
  changes: ScenarioChange[];
  /** Which programs/categories the projected score should be evaluated
      against. Structurally identical to Eligibility on useCrsProfile — kept
      as its own type so the planner can diverge later if needed. */
  programs: Program[];
  categories: string[];
}

/** Placeholder — the rules engine returns this. Left intentionally sparse:
    real fields land when the engine does. */
export interface ScenarioResult {
  projectedScore: number;
  delta: number;
  notes: string[];
}
