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
  "French language": "#c8622a",
  Healthcare: "#a8642a",
  STEM: "#9c7a2e",
  Trades: "#b0552f",
  Transport: "#8a6b34",
  Agriculture: "#6f7a41",
  Education: "#a44a33",
  "Senior managers": "#7d6a4a",
  Physicians: "#93453f",
  Military: "#6a5b3e",
};

export const MAIN_SERIES: SeriesDef[] = [
  {
    key: "general",
    label: "General",
    color: "#6b7280",
    matches: (d) => d.round_type === "general",
  },
  {
    key: "CEC",
    label: "Program-specific · CEC",
    color: "#2f4a3f",
    matches: (d) => d.round_type === "program_specific" && d.program === "CEC",
  },
  {
    key: "FSW",
    label: "Program-specific · FSW",
    color: "#365b60",
    matches: (d) => d.round_type === "program_specific" && d.program === "FSW",
  },
  {
    key: "FST",
    label: "Program-specific · FST",
    color: "#4a5a47",
    matches: (d) => d.round_type === "program_specific" && d.program === "FST",
  },
  ...CATEGORIES.map((c) => ({
    key: `cat:${c}`,
    label: `Category-based · ${c}`,
    color: CATEGORY_COLORS[c] ?? "#c8622a",
    matches: (d: Draw) => d.round_type === "category_based" && d.category === c,
  })),
];

export const PNP_SERIES: SeriesDef = {
  key: "PNP",
  label: "Program-specific · PNP",
  color: "#7b3f5c",
  matches: (d) => d.program === "PNP",
};
