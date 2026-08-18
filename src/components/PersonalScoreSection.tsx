import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterChip } from "@/components/FilterChip";
import { RoundBadge } from "@/components/RoundBadge";
import { SecondaryLink } from "@/components/CTA";
import { formatDate } from "@/components/DrawMeta";
import { relevantDrawsQuery, drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { CATEGORIES, roundLabel, type Program } from "@/data/round-types";

// The personalized "where you stand" experience — eligibility inputs plus
// live results. Score is supplied by the caller (typically read from the
// homepage hero's input). Eligibility state is local to this component and
// persisted to localStorage.
//
// This component used to be its own /would-i-have-made-it page. It now lives
// inline on Home because the personalized answer is the core value of the
// product; hiding it one nav-click away meant users had to type their score
// twice. The standalone route redirects here.

const ELIG_KEY = "crsSignal.eligibility";

interface Eligibility {
  program: Program | null;
  categories: string[];
}

const PROGRAM_CHIPS: { value: Program | null; label: string }[] = [
  { value: null, label: "None of these / not sure" },
  { value: "CEC", label: "Canadian Experience Class (CEC)" },
  { value: "FSW", label: "Federal Skilled Worker (FSW)" },
  { value: "FST", label: "Federal Skilled Trades (FST)" },
  { value: "PNP", label: "I hold a provincial nomination (PNP)" },
];

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

interface Props {
  /** Parsed numeric CRS score from the hero input, or null if empty/invalid. */
  score: number | null;
}

export function PersonalScoreSection({ score }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [elig, setElig] = useState<Eligibility>({ program: null, categories: [] });
  const [windowMonths, setWindowMonths] = useState<24 | 36>(24);
  const since = useMemo(() => monthsAgo(windowMonths), [windowMonths]);

  // Restore eligibility from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ELIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Eligibility>;
        setElig({ program: parsed.program ?? null, categories: parsed.categories ?? [] });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist eligibility on change.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ELIG_KEY, JSON.stringify(elig));
    capture(EVENTS.WIHBI_ELIGIBILITY_CHANGED, {
      programs: elig.program ? [elig.program] : [],
      categories: elig.categories,
    });
  }, [elig, hydrated]);

  const validScore = score !== null && score >= 0 && score <= 1200;

  const roundTypes = useMemo(() => {
    const t = ["general"];
    if (elig.program) t.push("program_specific");
    if (elig.categories.length) t.push("category_based");
    return t;
  }, [elig]);

  const params = validScore
    ? {
        score: score!,
        roundTypes,
        programs: elig.program ? [elig.program] : null,
        categories: elig.categories.length ? elig.categories : null,
        since,
      }
    : null;

  const { data: results, isLoading } = useQuery(relevantDrawsQuery(params));
  const { data: allDraws } = useQuery(drawsQuery());

  const cleared = results?.filter((r) => r.would_have_cleared).length ?? 0;
  const total = results?.length ?? 0;
  const ratio = total ? cleared / total : 0;
  const figureColor =
    cleared === 0 ? "var(--muted-foreground)" : ratio >= 0.5 ? "var(--brand)" : "var(--accent)";

  const analyticsFired = useRef<string>("");
  useEffect(() => {
    if (!results || !validScore || isLoading) return;
    const key = `${score}-${elig.program}-${elig.categories.join(",")}-${windowMonths}`;
    if (analyticsFired.current === key) return;
    analyticsFired.current = key;
    capture(EVENTS.WIHBI_RESULT_VIEWED, { cleared, total, since });
  }, [results, validScore, isLoading, score, elig, windowMonths, cleared, total, since]);

  const recent = useMemo(
    () =>
      [...(results ?? [])]
        .sort((a, b) => b.draw_date.localeCompare(a.draw_date))
        .slice(0, 20)
        .reverse(),
    [results],
  );

  const sixMonthsAgo = useMemo(() => monthsAgo(6), []);
  const clearedRecently = (results ?? []).some(
    (r) => r.would_have_cleared && r.draw_date >= sixMonthsAgo,
  );

  const currentYear = new Date().getFullYear().toString();

  const topUncheckedFamilies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of allDraws ?? []) {
      if (!d.draw_date.startsWith(currentYear)) continue;
      if (d.round_type !== "category_based" || !d.category) continue;
      if (elig.categories.includes(d.category)) continue;
      counts.set(d.category, (counts.get(d.category) ?? 0) + d.invitations_issued);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([c]) => c);
  }, [allDraws, elig.categories, currentYear]);

  return (
    <TooltipProvider>
      <section id="where-you-stand" className="mt-14">
        <p className="kicker">Where you stand</p>
        <h2 className="display mt-2 text-2xl font-semibold text-ink sm:text-[1.75rem]">
          Refine what applies to you.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          General rounds are always included. Select any program you qualify for and every
          category-based round whose criteria you meet.
        </p>

        {/* Eligibility — two columns on md+, stacked on mobile */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/* Program eligibility */}
          <div>
            <label className="kicker">Program eligibility</label>
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
                PNP cutoffs include an automatic 600-point nomination bonus. Only select this if
                you actually hold a nomination — otherwise the comparison against PNP cutoffs will
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

        {/* Result */}
        <div className="mt-10 rounded-[var(--radius)] bg-[var(--paper)] p-5 sm:p-6">
          <p className="kicker">What the history says</p>

          {!validScore ? (
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              Enter your CRS score in the hero above to see how many of the last {windowMonths}{" "}
              months of relevant rounds it would have cleared.
            </p>
          ) : isLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No relevant rounds found since {formatDate(since)} for these selections — or data is
              not available yet (the daily refresh runs at ~9am ET).
            </p>
          ) : (
            <>
              <h3 className="display mt-4 text-[1.5rem] leading-[1.2] text-ink sm:text-[1.75rem]">
                You would have cleared{" "}
                <span
                  className="figure text-[2.75rem] leading-none sm:text-[3.25rem]"
                  style={{ color: figureColor }}
                >
                  {cleared}
                </span>{" "}
                of {total} relevant rounds in the last {windowMonths} months.
              </h3>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <Tooltip key={r.round_number}>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs"
                        style={{
                          backgroundColor: r.would_have_cleared
                            ? "var(--brand-soft)"
                            : "var(--accent-soft)",
                          color: r.would_have_cleared ? "var(--brand)" : "var(--accent)",
                        }}
                        aria-label={`${formatDate(r.draw_date)} — ${roundLabel(r)} — cutoff ${r.cutoff_score} — ${r.would_have_cleared ? "cleared" : "did not clear"}`}
                      >
                        {r.would_have_cleared ? "✓" : "✕"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <span className="flex items-center gap-2">
                        {formatDate(r.draw_date)} · cutoff {r.cutoff_score}
                        <RoundBadge draw={r} />
                      </span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last {recent.length} relevant rounds, oldest to newest.
              </p>

              {!clearedRecently && (
                <div
                  className="mt-5 rounded-[var(--radius)] p-4 text-sm leading-relaxed text-ink"
                  style={{ backgroundColor: "var(--accent-soft)" }}
                >
                  No relevant rounds have been within your reach in the last 6 months.
                  {topUncheckedFamilies.length > 0 && (
                    <>
                      {" "}
                      In {currentYear}, most invitations went to{" "}
                      {topUncheckedFamilies.join(" and ")} category rounds.
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setWindowMonths((w) => (w === 24 ? 36 : 24))}
                className="mt-6 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {windowMonths === 24
                  ? "Compare against the last 3 years instead →"
                  : "Back to the last 24 months →"}
              </button>
            </>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
