import { ABILITIES, type PartialAbilityScores } from "@/lib/crs/types";
import { FilterChip } from "@/components/FilterChip";

// The four bands here are not a UI simplification — they're the exact
// granularity the IRCC second-official-language and French-bonus tables
// score against, so picking a band loses no precision the formula would
// have used anyway.
const BANDS: { value: number; label: string }[] = [
  { value: 4, label: "Below 5" },
  { value: 5, label: "5–6" },
  { value: 7, label: "7–8" },
  { value: 9, label: "9+" },
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
}

/** Four chip-rows, one per ability, each picking a CLB/NCLC band. Mirrors
    FilterChip/ChipGroup styling so this reads as the same product as the
    rest of the app, not a bolted-on form. */
export function AbilityLevelPicker({ levelLabel, value, onChange }: Props) {
  return (
    <div className="space-y-2.5">
      {ABILITIES.map((ability) => (
        <div key={ability} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="w-24 shrink-0 text-sm text-muted-foreground">
            {ABILITY_LABELS[ability]}
          </span>
          <div className="flex flex-wrap gap-2">
            {BANDS.map((band) => (
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
