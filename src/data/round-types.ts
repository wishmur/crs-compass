export type RoundType = "general" | "program_specific" | "category_based";
export type Program = "CEC" | "FSW" | "FST" | "PNP";

export interface Draw {
  round_number: string;
  draw_date: string;
  round_type: RoundType;
  program: Program | null;
  category: string | null;
  invitations_issued: number;
  cutoff_score: number;
  tie_break_timestamp: string | null;
  source_url: string | null;
}

export interface RelevantDraw extends Draw {
  would_have_cleared: boolean;
}

/** Badge style keys map to semantic classes defined in src/styles.css. */
export type BadgeTone = "general" | "cec" | "fsw" | "fst" | "pnp" | "category";

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  general: "General",
  program_specific: "Program-specific",
  category_based: "Category-based",
};

export const PROGRAM_LABELS: Record<Program, string> = {
  CEC: "CEC — Canadian Experience Class",
  FSW: "FSW — Federal Skilled Worker",
  FST: "FST — Federal Skilled Trades",
  PNP: "PNP — Provincial Nominee Program",
};

export const PROGRAM_SHORT: Record<Program, string> = {
  CEC: "CEC",
  FSW: "FSW",
  FST: "FST",
  PNP: "PNP",
};

export const CATEGORIES = [
  "French language",
  "Healthcare",
  "STEM",
  "Trades",
  "Transport",
  "Agriculture",
  "Education",
  "Senior managers",
  "Physicians",
  "Military",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PROGRAMS: Program[] = ["CEC", "FSW", "FST", "PNP"];

export const ROUND_TYPES: RoundType[] = ["general", "program_specific", "category_based"];

export function badgeTone(draw: Pick<Draw, "round_type" | "program">): BadgeTone {
  if (draw.round_type === "program_specific" && draw.program) {
    return draw.program.toLowerCase() as BadgeTone;
  }
  if (draw.round_type === "category_based") return "category";
  return "general";
}

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  general: "badge-general",
  cec: "badge-cec",
  fsw: "badge-fsw",
  fst: "badge-fst",
  pnp: "badge-pnp",
  category: "badge-category",
};

/** Human label that always carries round-type context, e.g. "Category-based · STEM". */
export function roundLabel(draw: Pick<Draw, "round_type" | "program" | "category">): string {
  if (draw.round_type === "program_specific") {
    return `Program-specific · ${draw.program ?? "—"}`;
  }
  if (draw.round_type === "category_based") {
    return `Category-based · ${draw.category ?? "—"}`;
  }
  return "General";
}

/** Chart series: one line per round type / category family (PNP kept separate). */
export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  matches: (d: Draw) => boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "French language": "var(--series-cat-1)",
  Healthcare: "var(--series-cat-2)",
  STEM: "var(--series-cat-3)",
  Trades: "var(--series-cat-4)",
  Transport: "var(--series-cat-5)",
  Agriculture: "var(--series-cat-6)",
  Education: "var(--series-cat-7)",
  "Senior managers": "var(--series-cat-8)",
  Physicians: "var(--series-cat-9)",
  Military: "var(--series-cat-10)",
};

export const MAIN_SERIES: SeriesDef[] = [
  {
    key: "general",
    label: "General",
    color: "var(--series-general)",
    matches: (d) => d.round_type === "general",
  },
  {
    key: "CEC",
    label: "Program-specific · CEC",
    color: "var(--series-cec)",
    matches: (d) => d.round_type === "program_specific" && d.program === "CEC",
  },
  {
    key: "FSW",
    label: "Program-specific · FSW",
    color: "var(--series-fsw)",
    matches: (d) => d.round_type === "program_specific" && d.program === "FSW",
  },
  {
    key: "FST",
    label: "Program-specific · FST",
    color: "var(--series-fst)",
    matches: (d) => d.round_type === "program_specific" && d.program === "FST",
  },
  ...CATEGORIES.map((c) => ({
    key: `cat:${c}`,
    label: `Category-based · ${c}`,
    color: CATEGORY_COLORS[c] ?? "var(--series-cat-1)",
    matches: (d: Draw) => d.round_type === "category_based" && d.category === c,
  })),
];

export const PNP_SERIES: SeriesDef = {
  key: "PNP",
  label: "Program-specific · PNP",
  color: "var(--series-pnp)",
  matches: (d) => d.program === "PNP",
};
