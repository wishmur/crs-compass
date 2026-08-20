import { useEffect, useMemo, useState } from "react";
import { AbilityLevelPicker } from "@/components/plan/AbilityLevelPicker";
import { PlanHistoricalComparison } from "@/components/plan/PlanHistoricalComparison";
import { FilterChip } from "@/components/FilterChip";
import { usePlannerProfile } from "@/lib/usePlannerProfile";
import { calculateFrenchScenario } from "@/lib/crs/engine";
import { EMPTY_PARTIAL_ABILITIES, isComplete, type PartialAbilityScores } from "@/lib/crs/types";
import type { Eligibility } from "@/lib/useCrsProfile";

const EMPTY_ZERO = { speaking: 0, listening: 0, reading: 0, writing: 0 };

interface Props {
  baseScore: number;
  elig: Eligibility;
}

/** French-language scenario: the one fully-implemented planner flow. Every
    other scenario card on /plan is a visible placeholder — this is the real
    thing, end to end. */
export function FrenchScenarioFlow({ baseScore, elig }: Props) {
  const { profile, setProfile, hydrated } = usePlannerProfile();

  const [spouse, setSpouse] = useState(false);
  const [englishMode, setEnglishMode] = useState<"none" | "has" | null>(null);
  const [englishClb, setEnglishClb] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [hasCurrentFrench, setHasCurrentFrench] = useState(false);
  const [currentFrench, setCurrentFrench] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);
  const [target, setTarget] = useState<PartialAbilityScores>(EMPTY_PARTIAL_ABILITIES);

  // Seed from the persisted planner profile once it's hydrated, so a
  // returning user doesn't re-answer questions this scenario already knows.
  useEffect(() => {
    if (!hydrated) return;
    setSpouse(profile.hasSpouseOrPartner);
    setEnglishMode(profile.hasEnglishResults ? "has" : "none");
    setEnglishClb(profile.englishClb);
    const hadFrench = Object.values(profile.currentFrenchNclc).some((v) => v > 0);
    setHasCurrentFrench(hadFrench);
    if (hadFrench) setCurrentFrench(profile.currentFrenchNclc);
    // Intentionally runs once, when hydration flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const englishReady = englishMode === "none" || (englishMode === "has" && isComplete(englishClb));
  const currentFrenchReady = !hasCurrentFrench || isComplete(currentFrench);
  const canCalculate = englishReady && currentFrenchReady && isComplete(target);

  const result = useMemo(() => {
    if (!canCalculate) return null;
    return calculateFrenchScenario(baseScore, {
      hasSpouseOrPartner: spouse,
      hasEnglishResults: englishMode === "has",
      englishClb: englishMode === "has" && isComplete(englishClb) ? englishClb : EMPTY_ZERO,
      currentFrenchNclc: hasCurrentFrench && isComplete(currentFrench) ? currentFrench : EMPTY_ZERO,
      targetFrenchNclc: isComplete(target) ? target : EMPTY_ZERO,
    });
  }, [
    canCalculate,
    baseScore,
    spouse,
    englishMode,
    englishClb,
    hasCurrentFrench,
    currentFrench,
    target,
  ]);

  const persist = (next: {
    spouse?: boolean;
    englishMode?: "none" | "has";
    englishClb?: PartialAbilityScores;
    currentFrench?: PartialAbilityScores;
  }) => {
    setProfile((p) => ({
      hasSpouseOrPartner: next.spouse ?? p.hasSpouseOrPartner,
      hasEnglishResults: next.englishMode ? next.englishMode === "has" : p.hasEnglishResults,
      englishClb: next.englishClb && isComplete(next.englishClb) ? next.englishClb : p.englishClb,
      currentFrenchNclc:
        next.currentFrench && isComplete(next.currentFrench)
          ? next.currentFrench
          : p.currentFrenchNclc,
    }));
  };

  return (
    <div className="mt-8 space-y-8">
      {/* Q1 — spouse */}
      <div>
        <p className="font-medium text-ink">
          Do you have a spouse or partner coming with you to Canada?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The point tables — and caps — differ with and without a spouse or common-law partner.
        </p>
        <div className="mt-3 flex gap-2">
          <FilterChip
            label="Yes"
            selected={spouse}
            onClick={() => {
              setSpouse(true);
              persist({ spouse: true });
            }}
          />
          <FilterChip
            label="No"
            selected={!spouse}
            onClick={() => {
              setSpouse(false);
              persist({ spouse: false });
            }}
          />
        </div>
      </div>

      {/* Q2 — current English */}
      <div>
        <p className="font-medium text-ink">What&rsquo;s your current English result?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The French bonus depends on how strong your English is, not just your French.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip
            label="I haven't taken an English test"
            selected={englishMode === "none"}
            onClick={() => {
              setEnglishMode("none");
              persist({ englishMode: "none" });
            }}
          />
          <FilterChip
            label="I have English results"
            selected={englishMode === "has"}
            onClick={() => setEnglishMode("has")}
          />
        </div>
        {englishMode === "has" && (
          <div className="mt-4">
            <AbilityLevelPicker
              levelLabel="CLB"
              value={englishClb}
              onChange={(next) => {
                setEnglishClb(next);
                persist({ englishMode: "has", englishClb: next });
              }}
            />
          </div>
        )}
      </div>

      {/* Q3 — current French */}
      <div>
        <p className="font-medium text-ink">Do you already have French test results?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip
            label="Not yet"
            selected={!hasCurrentFrench}
            onClick={() => setHasCurrentFrench(false)}
          />
          <FilterChip
            label="Yes, I have results"
            selected={hasCurrentFrench}
            onClick={() => setHasCurrentFrench(true)}
          />
        </div>
        {hasCurrentFrench && (
          <div className="mt-4">
            <AbilityLevelPicker
              levelLabel="NCLC"
              value={currentFrench}
              onChange={(next) => {
                setCurrentFrench(next);
                persist({ currentFrench: next });
              }}
            />
          </div>
        )}
      </div>

      {/* Q4 — target */}
      <div>
        <p className="font-medium text-ink">What French result are you aiming for?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your target as NCLC levels. If you know a TEF Canada or TCF Canada score instead,
          convert it first using{" "}
          <a
            href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            IRCC&rsquo;s official comparison chart
          </a>
          .
        </p>
        <div className="mt-4">
          <AbilityLevelPicker levelLabel="NCLC" value={target} onChange={setTarget} />
        </div>
      </div>

      {result && (
        <div className="rounded-[var(--radius)] border border-[var(--rule)] p-5 sm:p-6">
          <p className="kicker">Result</p>
          <h3 className="display mt-2 text-[1.5rem] leading-[1.2] text-ink sm:text-[1.85rem]">
            {result.baseScore} →{" "}
            <span style={{ color: result.delta >= 0 ? "var(--brand)" : "var(--accent)" }}>
              {result.projectedScore}
            </span>
          </h3>
          <p
            className="figure mt-1 text-2xl"
            style={{ color: result.delta >= 0 ? "var(--brand)" : "var(--accent)" }}
          >
            {result.delta >= 0 ? "+" : ""}
            {result.delta} CRS
          </p>

          <div className="mt-5 space-y-2">
            {result.breakdown.map((line) => (
              <div key={line.label} className="flex items-center justify-between text-sm">
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

          <p className="mt-5 text-xs text-muted-foreground">
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
          <p className="mt-2 text-xs text-muted-foreground">
            This assumes English is your first official language and French your second — the common
            case. If French is actually your stronger language, other CRS factors could also shift
            and this number would understate the effect.
          </p>

          <div className="mt-6">
            <PlanHistoricalComparison
              currentScore={result.baseScore}
              plannedScore={result.projectedScore}
              elig={elig}
            />
          </div>
        </div>
      )}
    </div>
  );
}
