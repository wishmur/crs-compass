import { useEffect, useRef, useState } from "react";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { calculatePnpScenario } from "@/lib/crs/engine";
import type { Eligibility } from "@/lib/useCrsProfile";

const DIVIDER_STYLE = { borderColor: "color-mix(in srgb, var(--brand) 14%, transparent)" };
const PANEL_STYLE = {
  backgroundColor: "var(--brand-soft)",
  borderColor: "color-mix(in srgb, var(--brand) 12%, transparent)",
};

interface Props {
  baseScore: number;
  elig: Eligibility;
}

/** Provincial nomination scenario: a single yes/no question, not a
    multi-step accordion — a nomination adds a flat 600 points with no
    skill-transferability interaction, so there's nothing else to ask.
    Renders the same two-panel shape as the French flow (questions, then a
    separate result panel) for visual consistency across scenarios. */
export function PnpScenarioFlow({ baseScore, elig }: Props) {
  const [hasNomination, setHasNomination] = useState<boolean | null>(null);

  const result = hasNomination === true ? calculatePnpScenario(baseScore) : null;

  const hasResult = result !== null;
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hasResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hasResult]);

  return (
    <>
      <section className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8" style={PANEL_STYLE}>
        <p className="kicker">Provincial nomination</p>
        <p className="mt-3 font-medium text-ink">
          Do you have a provincial or territorial nomination?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          A nomination adds a flat 600 points on top of your current score, with no effect on any
          other factor.
        </p>
        <div className="mt-3 flex gap-2">
          <FilterChip
            label="Yes"
            selected={hasNomination === true}
            onClick={() => setHasNomination(true)}
          />
          <FilterChip
            label="No"
            selected={hasNomination === false}
            onClick={() => setHasNomination(false)}
          />
        </div>
        {hasNomination === false && (
          <p className="mt-4 text-sm text-muted-foreground">
            Without a nomination, this scenario doesn&rsquo;t change your score.
          </p>
        )}
      </section>

      {result && (
        <section
          ref={resultRef}
          className="mt-4 rounded-[var(--radius)] border p-6 sm:p-8"
          style={PANEL_STYLE}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            <div>
              <p className="kicker">Your planned score</p>
              <p className="display mt-3 text-[1.75rem] leading-[1.15] text-ink sm:text-[2.25rem]">
                {result.baseScore}{" "}
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>{" "}
                <span style={{ color: "var(--brand)" }}>{result.projectedScore}</span>
              </p>
              <p className="figure mt-1 text-xl" style={{ color: "var(--brand)" }}>
                +{result.delta} CRS
              </p>

              <div className="mt-6 space-y-3">
                {result.breakdown.map((line) => (
                  <div key={line.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="num text-ink">
                      {line.before} → {line.after}{" "}
                      <span className="text-muted-foreground">
                        ({line.delta >= 0 ? "+" : ""}
                        {line.delta})
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                Calculated using CRS rules verified {result.ruleset.verifiedAt}.{" "}
                <a
                  href={result.ruleset.sources[0]?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  See the official criteria →
                </a>
              </p>
            </div>

            <div className="md:border-l md:pl-10" style={DIVIDER_STYLE}>
              <PlanHistoricalComparison
                currentScore={result.baseScore}
                plannedScore={result.projectedScore}
                elig={elig}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
