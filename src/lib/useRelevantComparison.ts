import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { relevantDrawsQuery } from "@/lib/queries";
import type { Eligibility } from "@/lib/useCrsProfile";
import type { RelevantDraw } from "@/data/round-types";

// Shared "is this draw relevant to me, and did my score clear it?" logic —
// used by Home's "What the history says" and the Plan page's before/after
// comparison, so the two surfaces can never quietly disagree about what
// "applies to you" means.

export function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export type CutoffComparison = "above" | "matched" | "below";

/** Three-state comparison — precise about "above" vs "matched exactly"
    (which triggers the tie-break rule), unlike the RPC's own
    would_have_cleared flag (score >= cutoff), which lumps matches with
    above. */
export function compareToCutoff(score: number | null, cutoff: number): CutoffComparison {
  if (score === null) return "below";
  if (score > cutoff) return "above";
  if (score < cutoff) return "below";
  return "matched";
}

export interface RelevantComparison {
  results: RelevantDraw[] | undefined;
  isLoading: boolean;
  above: number;
  matched: number;
  total: number;
}

export function useRelevantComparison(
  score: number | null,
  elig: Eligibility,
  since: string,
): RelevantComparison {
  const validScore = score !== null && score >= 0 && score <= 1200;

  // Round type selection — mirrors isRelevantDraw. General and category-based
  // are always included (categories default to "All categories"); program-
  // specific is only included when a specific program is picked.
  const roundTypes = useMemo(() => {
    const t = ["general", "category_based"];
    if (elig.programs.length > 0) t.push("program_specific");
    return t;
  }, [elig]);

  // When a program filter is passed, include the ANY_GENERAL sentinel so
  // general rounds (which have d.program IS NULL) also match — otherwise a
  // CEC user would silently miss any historical general round they were
  // eligible for. Same trick for categories via ANY_NONCATEGORY.
  const params = validScore
    ? {
        score: score!,
        roundTypes,
        programs: elig.programs.length ? [...elig.programs, "ANY_GENERAL"] : null,
        categories: elig.categories.length ? [...elig.categories, "ANY_NONCATEGORY"] : null,
        since,
      }
    : null;

  const { data: results, isLoading } = useQuery(relevantDrawsQuery(params));

  const above =
    results?.filter((r) => compareToCutoff(score, r.cutoff_score) === "above").length ?? 0;
  const matched =
    results?.filter((r) => compareToCutoff(score, r.cutoff_score) === "matched").length ?? 0;
  const total = results?.length ?? 0;

  return { results, isLoading, above, matched, total };
}
