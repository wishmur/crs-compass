import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChipGroup, FilterChip } from "@/components/FilterChip";
import { RoundBadge } from "@/components/RoundBadge";
import { formatDate } from "@/components/DrawMeta";
import { relevantDrawsQuery, drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { CATEGORIES, roundLabel, type Program } from "@/data/round-types";

export const Route = createFileRoute("/would-i-have-made-it")({
  head: () => ({
    meta: [
      { title: "Would I have been invited? — Express Entry CRS score check" },
      {
        name: "description",
        content:
          "Enter your CRS score and the rounds that actually apply to you, and see which past Express Entry rounds you would have cleared.",
      },
      { property: "og:title", content: "Would I have been invited? — CRS Compass" },
      {
        property: "og:description",
        content:
          "Check your CRS score against the Express Entry rounds you were actually eligible for.",
      },
    ],
  }),
  component: Wihbi,
});

const SCORE_KEY = "crsSignal.score";
const ELIG_KEY = "crsSignal.eligibility";

interface Eligibility {
  program: Program | null;
  categories: string[];
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const PROGRAM_CHIPS: { value: Program | null; label: string }[] = [
  { value: null, label: "None of these / not sure" },
  { value: "CEC", label: "I'm inside Canada working full-time (CEC)" },
  { value: "FSW", label: "I'm a Federal Skilled Worker candidate (FSW)" },
  { value: "FST", label: "I'm a Federal Skilled Trades candidate (FST)" },
  { value: "PNP", label: "I hold a provincial nomination (PNP)" },
];

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="figure text-lg text-brand">{n}</span>
      <h2 className="kicker">{title}</h2>
    </div>
  );
}


function Wihbi() {
  const [hydrated, setHydrated] = useState(false);
  const [score, setScore] = useState<string>("");
  const [elig, setElig] = useState<Eligibility>({ program: null, categories: [] });
  const [windowMonths, setWindowMonths] = useState<24 | 36>(24);
  const since = useMemo(() => monthsAgo(windowMonths), [windowMonths]);

  useEffect(() => {
    capture(EVENTS.WIHBI_STARTED);
    try {
      const s = localStorage.getItem(SCORE_KEY);
      if (s) setScore(s);
      const e = localStorage.getItem(ELIG_KEY);
      if (e) {
        const parsed = JSON.parse(e) as Partial<Eligibility>;
        setElig({ program: parsed.program ?? null, categories: parsed.categories ?? [] });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Debounced persistence + score event
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(SCORE_KEY, score);
      const n = Number(score);
      if (score !== "" && Number.isFinite(n)) {
        capture(EVENTS.WIHBI_SCORE_ENTERED, { score: n });
      }
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [score, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ELIG_KEY, JSON.stringify(elig));
    capture(EVENTS.WIHBI_ELIGIBILITY_CHANGED, {
      programs: elig.program ? [elig.program] : [],
      categories: elig.categories,
    });
  }, [elig, hydrated]);

  const numericScore = Number(score);
  const validScore =
    score !== "" && Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= 1200;

  const roundTypes = useMemo(() => {
    const t = ["general"];
    if (elig.program) t.push("program_specific");
    if (elig.categories.length) t.push("category_based");
    return t;
  }, [elig]);

  const params = validScore
    ? {
        score: numericScore,
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

  useEffect(() => {
    if (results && validScore && !isLoading) {
      capture(EVENTS.WIHBI_RESULT_VIEWED, { cleared, total, since });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, isLoading]);

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

  const topUncheckedFamilies = useMemo(() => {
    const year = new Date().getFullYear().toString();
    const counts = new Map<string, number>();
    for (const d of allDraws ?? []) {
      if (!d.draw_date.startsWith(year)) continue;
      if (d.round_type !== "category_based" || !d.category) continue;
      if (elig.categories.includes(d.category)) continue;
      counts.set(d.category, (counts.get(d.category) ?? 0) + d.invitations_issued);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([c]) => c);
  }, [allDraws, elig.categories]);

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-[880px] px-4 pt-10 pb-16 sm:pt-14">
        <p className="kicker">Would I have been invited?</p>
        <h1 className="display mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Check your score against the rounds that applied to you
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          A cutoff only means something next to the round type it came from. Tell us what you are
          eligible for, and we compare your score against those rounds only.
        </p>

        <div className="mt-10 flex flex-col divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
          {/* 1 — score */}
          <section className="py-8">
            <StepHeading n={1} title="Your CRS score" />
            <div className="mt-5 max-w-xs border-b border-rule pb-1">
              <label htmlFor="crs-score" className="sr-only">
                Your CRS score
              </label>
              <input
                id="crs-score"
                inputMode="numeric"
                autoComplete="off"
                placeholder="486"
                value={score}
                onChange={(e) => setScore(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="figure w-full bg-transparent text-6xl text-ink outline-none placeholder:text-rule md:text-7xl"
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your score is saved on this device only.
            </p>
          </section>

          {/* 2 — program */}
          <section className="py-8">
            <StepHeading n={2} title="Program eligibility" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Pick the one program stream you are actually in — program-specific rounds only apply
              to candidates in that stream.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
                className="mt-4 rounded-lg p-4 text-sm leading-relaxed text-ink"
                style={{ backgroundColor: "var(--accent-soft)" }}
              >
                PNP cutoffs include an automatic 600-point nomination bonus. Only select this if you
                actually hold a provincial nomination — otherwise the comparison will be misleading.
              </div>
            )}
          </section>

          {/* 3 — categories */}
          <section className="py-8">
            <StepHeading n={3} title="Category-based eligibility" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Select every category you meet the official criteria for.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
            <p className="mt-4 text-xs">
              <a
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html"
                target="_blank"
                rel="noreferrer noopener"
              >
                Official category criteria on canada.ca →
              </a>
            </p>
          </section>

          {/* 4 — result */}
          <section className="py-8">
            <StepHeading n={4} title="Result" />

            {!validScore ? (
              <p className="display mt-5 max-w-[36ch] text-2xl leading-snug text-muted-foreground">
                Enter a score above to see how many of the last {windowMonths} months of relevant
                rounds it would have cleared.
              </p>
            ) : isLoading ? (
              <div className="mt-5 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : total === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                No relevant rounds found since {formatDate(since)} for these selections — or data is
                not available yet (the daily refresh runs at ~9am ET).
              </p>
            ) : (
              <>
                <h3 className="display mt-5 text-[2rem] leading-[1.15] text-ink md:text-[2.5rem]">
                  You would have cleared{" "}
                  <span
                    className="figure text-[3.5rem] leading-none md:text-[4.5rem]"
                    style={{ color: figureColor }}
                  >
                    {cleared}
                  </span>{" "}
                  of {total} relevant rounds in the last {windowMonths} months.
                </h3>

                <div className="mt-8 flex flex-wrap gap-1.5">
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
                <p className="mt-3 text-xs text-muted-foreground">
                  Last {recent.length} relevant rounds, oldest to newest.
                </p>

                {!clearedRecently && (
                  <div
                    className="mt-8 rounded-lg p-5 text-sm leading-relaxed text-ink"
                    style={{ backgroundColor: "var(--accent-soft)" }}
                  >
                    No relevant rounds have been within your reach in the last 6 months.
                    {topUncheckedFamilies.length > 0 && (
                      <>
                        {" "}
                        In {new Date().getFullYear()}, most invitations went to{" "}
                        {topUncheckedFamilies.join(" and ")} category rounds.
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setWindowMonths((w) => (w === 24 ? 36 : 24))}
                  className="mt-8 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {windowMonths === 24
                    ? "Compare against the last 3 years instead →"
                    : "Back to the last 24 months →"}
                </button>
              </>
            )}

            {/* PostHog survey target */}
            <div id="wihbi-survey-slot" className="mt-10" />
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

