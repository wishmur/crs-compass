import { ABILITIES, type PartialAbilityScores } from "@/lib/crs/types";
import { FilterChip } from "@/components/FilterChip";

export interface AbilityBand {
  value: number;
  label: string;
}

// The four bands here are not a UI simplification — they're the exact
// granularity the IRCC second-official-language and French-bonus tables
// score against, so picking a band loses no precision the formula would
// have used anyway. This is the default when a scenario doesn't pass its
// own `bands`.
export const SECOND_LANGUAGE_BANDS: AbilityBand[] = [
  { value: 4, label: "Below 5" },
  { value: 5, label: "5–6" },
  { value: 7, label: "7–8" },
  { value: 9, label: "9+" },
];

// The FIRST-official-language table (Ministerial Instructions s.13) is
// finer-grained than second-language — 6, 7, 8, 9, and 10+ each score a
// different number of points, where second-language collapses 7-8 and
// 9+ into single bands. Reusing SECOND_LANGUAGE_BANDS here would silently
// lose precision the real formula has.
export const FIRST_LANGUAGE_BANDS: AbilityBand[] = [
  { value: 3, label: "Below 4" },
  { value: 4, label: "4–5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10+" },
];

const ABILITY_LABELS: Record<(typeof ABILITIES)[number], string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
};

interface Props {
  levelLabel: "CLB" | "NCLC";
  value: PartialAbilityScores;
  onChange: (next: PartialAbilityScores) => void;
  bands?: AbilityBand[];
}

/** Chip-rows, one per ability, each picking a CLB/NCLC band. Mirrors
    FilterChip/ChipGroup styling so this reads as the same product as the
    rest of the app, not a bolted-on form. `bands` defaults to the coarser
    second-language/French-bonus granularity; pass FIRST_LANGUAGE_BANDS for
    a first-official-language scenario (English). */
export function AbilityLevelPicker({
  levelLabel,
  value,
  onChange,
  bands = SECOND_LANGUAGE_BANDS,
}: Props) {
  return (
    <div className="space-y-2.5">
      {ABILITIES.map((ability) => (
        <div key={ability} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="w-24 shrink-0 text-sm text-muted-foreground">
            {ABILITY_LABELS[ability]}
          </span>
          <div className="flex flex-wrap gap-2">
            {bands.map((band) => (
              <FilterChip
                key={band.value}
                label={`${levelLabel} ${band.label}`}
                selected={value[ability] === band.value}
                onClick={() => onChange({ ...value, [ability]: band.value })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
