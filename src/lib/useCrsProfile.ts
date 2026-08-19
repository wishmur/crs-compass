import { useEffect, useState } from "react";
import { EVENTS, capture } from "@/lib/analytics";
import type { Program, Draw } from "@/data/round-types";

// The user's eligibility profile — the shape of "who they are for Express
// Entry." Persisted to localStorage; consumed by every section that filters
// or scores against the draws data.

export const ELIG_KEY = "crsSignal.eligibility";

export interface Eligibility {
  program: Program | null;
  /** Only meaningful when program === null. 'none' = user explicitly does
      not qualify for any listed program; 'unsure' = user is uncertain and
      wants help. Both suppress the program filter, but 'unsure' surfaces
      a help callout in the UI so the user isn't silently treated as
      ineligible. */
  programStance: "none" | "unsure";
  categories: string[];
}

export interface CrsProfile {
  elig: Eligibility;
  setElig: React.Dispatch<React.SetStateAction<Eligibility>>;
  /** True once we've read localStorage. Callers should render skeletons before this to avoid an SSR/CSR flash. */
  hydrated: boolean;
  /** True when at least one program or category is selected. */
  hasEligibility: boolean;
}

export function useCrsProfile(): CrsProfile {
  const [hydrated, setHydrated] = useState(false);
  const [elig, setElig] = useState<Eligibility>({
    program: null,
    programStance: "none",
    categories: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ELIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Eligibility>;
        setElig({
          program: parsed.program ?? null,
          programStance: parsed.programStance === "unsure" ? "unsure" : "none",
          categories: parsed.categories ?? [],
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

  const hasEligibility = elig.program !== null || elig.categories.length > 0;
  return { elig, setElig, hydrated, hasEligibility };
}

// Filter predicate shared by every "is this draw relevant to me?" surface.
// General rounds always pass when eligibility is set. If the user has no
// eligibility selected, we default to a safe "explore" view: general and
// category-based rounds only — program-specific rounds (which include PNP
// with its 600-point nomination bonus) are excluded because comparing your
// score to a PNP cutoff without a nomination is meaningless.
export function isRelevantDraw(d: Draw, elig: Eligibility): boolean {
  const hasElig = elig.program !== null || elig.categories.length > 0;
  if (!hasElig) {
    return d.round_type !== "program_specific";
  }
  if (d.round_type === "general") return true;
  if (d.round_type === "program_specific") {
    return elig.program !== null && d.program === elig.program;
  }
  if (d.round_type === "category_based") {
    return elig.categories.length > 0 && d.category !== null && elig.categories.includes(d.category);
  }
  return false;
}
