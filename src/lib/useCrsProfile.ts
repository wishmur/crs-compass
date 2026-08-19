import { useCallback, useEffect, useState } from "react";
import { EVENTS, capture } from "@/lib/analytics";
import type { Program, Draw } from "@/data/round-types";

// The user's eligibility profile — the shape of "who they are for Express
// Entry." Persisted to localStorage; consumed by every section that filters
// or scores against the draws data.

export const ELIG_KEY = "crsSignal.eligibility";

export interface Eligibility {
  /** null = the "General only" default: no specific program selected, so
      program-specific rounds (CEC/FSW/FST/PNP) are excluded from the view. */
  program: Program | null;
  /** Empty array = the "All categories" default: every category-based round
      passes. A non-empty array narrows to just those category families. */
  categories: string[];
}

const DEFAULT_ELIG: Eligibility = { program: null, categories: [] };

export interface CrsProfile {
  elig: Eligibility;
  setElig: React.Dispatch<React.SetStateAction<Eligibility>>;
  resetElig: () => void;
  /** True once we've read localStorage. */
  hydrated: boolean;
  /** True when the user has narrowed away from the default view (any
      specific program or specific category selected). Drives the "Latest
      relevant cutoff" vs "Latest cutoff in this view" label. */
  hasEligibility: boolean;
}

export function useCrsProfile(): CrsProfile {
  const [hydrated, setHydrated] = useState(false);
  const [elig, setElig] = useState<Eligibility>(DEFAULT_ELIG);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ELIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Eligibility>;
        setElig({
          program: parsed.program ?? null,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ELIG_KEY, JSON.stringify(elig));
    capture(EVENTS.WIHBI_ELIGIBILITY_CHANGED, {
      programs: elig.program ? [elig.program] : [],
      categories: elig.categories,
    });
  }, [elig, hydrated]);

  const resetElig = useCallback(() => setElig(DEFAULT_ELIG), []);

  const hasEligibility = elig.program !== null || elig.categories.length > 0;
  return { elig, setElig, resetElig, hydrated, hasEligibility };
}

// Filter predicate shared by every "is this draw relevant to me?" surface.
//
// Program:
//   null            → "General only" — exclude program_specific rounds entirely
//   'CEC' | ...     → include only that program's rounds (+ general always)
//
// Categories:
//   []              → "All categories" — every category-based round passes
//   [names]         → only those category families pass
//
// General rounds are always included. PNP is only included when the user has
// explicitly selected PNP.
export function isRelevantDraw(d: Draw, elig: Eligibility): boolean {
  if (d.round_type === "general") return true;
  if (d.round_type === "category_based") {
    if (elig.categories.length === 0) return true;
    return d.category !== null && elig.categories.includes(d.category);
  }
  if (d.round_type === "program_specific") {
    return elig.program !== null && d.program === elig.program;
  }
  return false;
}
