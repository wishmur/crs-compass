import { useCallback, useEffect, useState } from "react";
import { EVENTS, capture } from "@/lib/analytics";
import type { Program, Draw } from "@/data/round-types";

// The user's eligibility profile — the shape of "who they are for Express
// Entry." Persisted to localStorage; consumed by every section that filters
// or scores against the draws data.

export const ELIG_KEY = "crsSignal.eligibility";

export interface Eligibility {
  /** Empty array = the "General only" default. Non-empty = those specific
      programs (multi-select). CEC + FSW selected together means "show me
      rounds for either." */
  programs: Program[];
  /** Empty array = the "All categories" default. A non-empty array narrows
      to just those category families. */
  categories: string[];
}

const DEFAULT_ELIG: Eligibility = { programs: [], categories: [] };

export interface CrsProfile {
  elig: Eligibility;
  setElig: React.Dispatch<React.SetStateAction<Eligibility>>;
  resetElig: () => void;
  hydrated: boolean;
  /** True when the user has narrowed away from the default view. */
  hasEligibility: boolean;
}

/** Read the stored shape, tolerating the older single-program layout. */
function migrate(parsed: unknown): Eligibility {
  if (!parsed || typeof parsed !== "object") return DEFAULT_ELIG;
  const p = parsed as {
    program?: Program | null;
    programs?: Program[];
    categories?: string[];
  };
  const programs = Array.isArray(p.programs)
    ? p.programs
    : p.program
      ? [p.program]
      : [];
  const categories = Array.isArray(p.categories) ? p.categories : [];
  return { programs, categories };
}

export function useCrsProfile(): CrsProfile {
  const [hydrated, setHydrated] = useState(false);
  const [elig, setElig] = useState<Eligibility>(DEFAULT_ELIG);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ELIG_KEY);
      if (raw) setElig(migrate(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ELIG_KEY, JSON.stringify(elig));
    capture(EVENTS.WIHBI_ELIGIBILITY_CHANGED, {
      programs: elig.programs,
      categories: elig.categories,
    });
  }, [elig, hydrated]);

  const resetElig = useCallback(() => setElig(DEFAULT_ELIG), []);

  const hasEligibility = elig.programs.length > 0 || elig.categories.length > 0;
  return { elig, setElig, resetElig, hydrated, hasEligibility };
}

// Filter predicate shared by every "is this draw relevant to me?" surface.
//
// Programs:
//   []              → "General only" — exclude program_specific rounds entirely
//   ['CEC', ...]    → include only those programs' rounds (+ general always)
//
// Categories:
//   []              → "All categories" — every category-based round passes
//   [names]         → only those category families pass
//
// General rounds are always included.
export function isRelevantDraw(d: Draw, elig: Eligibility): boolean {
  if (d.round_type === "general") return true;
  if (d.round_type === "category_based") {
    if (elig.categories.length === 0) return true;
    return d.category !== null && elig.categories.includes(d.category);
  }
  if (d.round_type === "program_specific") {
    return elig.programs.length > 0 && d.program !== null && elig.programs.includes(d.program);
  }
  return false;
}
