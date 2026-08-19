import { FilterChip } from "@/components/FilterChip";
import { SecondaryLink } from "@/components/CTA";
import { CATEGORIES, type Program } from "@/data/round-types";
import type { Eligibility } from "@/lib/useCrsProfile";

const PROGRAM_CHIPS: {
  value: Program | null;
  stance?: "none" | "unsure";
  label: string;
}[] = [
  { value: null, stance: "none", label: "None of these" },
  { value: null, stance: "unsure", label: "Not sure" },
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
  return (
    <section id="where-you-stand" className="mt-14">
      <p className="kicker">Where you stand</p>
      <h2 className="display mt-2 text-2xl font-semibold text-ink sm:text-[1.75rem]">
        Refine what applies to you.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        General rounds are always included. Select any program you qualify for and every
        category-based round whose criteria you meet — the sections below update to match.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        {/* Program eligibility */}
        <div>
          <label className="kicker">Program eligibility</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROGRAM_CHIPS.map((p) => {
              const selected =
                p.value === null
                  ? elig.program === null && elig.programStance === (p.stance ?? "none")
                  : elig.program === p.value;
              return (
                <FilterChip
                  key={p.label}
                  label={p.label}
                  selected={selected}
                  onClick={() =>
                    setElig((e) => ({
                      ...e,
                      program: p.value,
                      programStance: p.stance ?? "none",
                    }))
                  }
                />
              );
            })}
          </div>
          {elig.program === null && elig.programStance === "unsure" && (
            <div
              className="mt-3 rounded-[var(--radius)] p-3 text-sm leading-relaxed text-ink"
              style={{ backgroundColor: "var(--brand-soft)" }}
            >
              Which program applies depends on your situation. A few quick heuristics: if you
              already work full-time in Canada under a valid work permit, look at{" "}
              <strong>CEC</strong>. If you have a provincial nomination in hand, that&rsquo;s{" "}
              <strong>PNP</strong>. Otherwise, IRCC&rsquo;s official criteria pages are the
              authoritative source.{" "}
              <SecondaryLink
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility.html"
                target="_blank"
                className="text-xs"
              >
                IRCC eligibility &rarr;
              </SecondaryLink>
            </div>
          )}
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

        {/* Category-based eligibility */}
        <div>
          <label className="kicker">Category-based eligibility</label>
          <p className="mt-3 text-sm text-muted-foreground">
            Select every category you meet the official criteria for.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
              Official category criteria on canada.ca →
            </SecondaryLink>
          </p>
        </div>
      </div>
    </section>
  );
}
