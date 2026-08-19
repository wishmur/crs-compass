import { FilterChip } from "@/components/FilterChip";
import { SecondaryLink } from "@/components/CTA";
import { CATEGORIES, type Program } from "@/data/round-types";
import type { Eligibility } from "@/lib/useCrsProfile";

// Program chips. "General only" is a virtual selection for program === null:
// it means the view excludes program-specific rounds entirely (no PNP/CEC/
// FSW/FST). Any specific program pill picks that program.
const PROGRAM_CHIPS: { value: Program | null; label: string }[] = [
  { value: null, label: "General only" },
  { value: "CEC", label: "Canadian Experience Class (CEC)" },
  { value: "FSW", label: "Federal Skilled Worker (FSW)" },
  { value: "FST", label: "Federal Skilled Trades (FST)" },
  { value: "PNP", label: "I hold a provincial nomination (PNP)" },
];

interface Props {
  elig: Eligibility;
  setElig: React.Dispatch<React.SetStateAction<Eligibility>>;
}

export function EligibilityInputs({ elig, setElig }: Props) {
  const allCategoriesSelected = elig.categories.length === 0;

  return (
    <section id="where-you-stand" className="mt-14">
      <p className="kicker">Your eligibility</p>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        {/* Program */}
        <div>
          <label className="kicker">Program</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROGRAM_CHIPS.map((p) => (
              <FilterChip
                key={p.label}
                label={p.label}
                selected={elig.program === p.value}
                onClick={() => setElig((e) => ({ ...e, program: p.value }))}
              />
            ))}
          </div>
          {elig.program === "PNP" && (
            <div
              className="mt-3 rounded-[var(--radius)] p-3 text-sm leading-relaxed text-ink"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              PNP cutoffs include an automatic 600-point nomination bonus. Only select this if you
              actually hold a nomination &mdash; otherwise the comparison against PNP cutoffs will
              be misleading.
            </div>
          )}
        </div>

        {/* Category — "All categories" is a virtual pill (selected when the
            categories array is empty). Picking a specific category deselects
            "All categories"; deselecting the last specific category returns
            to "All categories". */}
        <div>
          <label className="kicker">Category-based</label>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip
              label="All categories"
              selected={allCategoriesSelected}
              onClick={() => setElig((e) => ({ ...e, categories: [] }))}
            />
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                label={c}
                selected={elig.categories.includes(c)}
                onClick={() =>
                  setElig((e) => ({
                    ...e,
                    categories: e.categories.includes(c)
                      ? e.categories.filter((x) => x !== c)
                      : [...e.categories, c],
                  }))
                }
              />
            ))}
          </div>
          <p className="mt-3">
            <SecondaryLink
              href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html"
              target="_blank"
              className="text-xs"
            >
              Official category criteria on canada.ca &rarr;
            </SecondaryLink>
          </p>
        </div>
      </div>
    </section>
  );
}
