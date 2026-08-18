import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SecondaryLink } from "@/components/CTA";
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
import { formatDate, SourceLink } from "@/components/DrawMeta";
import { TablePagination } from "@/components/TablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relevantDrawsQuery, drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { CATEGORIES, roundLabel, type Program, type RelevantDraw } from "@/data/round-types";

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
const TABLE_PAGE_SIZE = 15;

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
  { value: "CEC", label: "Canadian Experience Class (CEC)" },
  { value: "FSW", label: "Federal Skilled Worker (FSW)" },
  { value: "FST", label: "Federal Skilled Trades (FST)" },
  { value: "PNP", label: "I hold a provincial nomination (PNP)" },
];

function ResultPill({ draw, score }: { draw: RelevantDraw; score: number }) {
  const atCutoff = score === draw.cutoff_score;
  const label = atCutoff
    ? "At cutoff · tie-break applies"
    : draw.would_have_cleared
      ? "Cleared"
      : "Not cleared";
  const bg = atCutoff
    ? "var(--muted)"
    : draw.would_have_cleared
      ? "var(--brand-soft)"
      : "var(--accent-soft)";
  const fg = atCutoff
    ? "var(--muted-foreground)"
    : draw.would_have_cleared
      ? "var(--brand)"
      : "var(--accent)";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
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

  const tableRows = useMemo(
    () => [...(results ?? [])].sort((a, b) => b.draw_date.localeCompare(a.draw_date)),
    [results],
  );

  const [tablePage, setTablePage] = useState(1);
  const tablePageCount = Math.max(1, Math.ceil(tableRows.length / TABLE_PAGE_SIZE));
  const currentTablePage = Math.min(tablePage, tablePageCount);
  const pagedRows = tableRows.slice(
    (currentTablePage - 1) * TABLE_PAGE_SIZE,
    currentTablePage * TABLE_PAGE_SIZE,
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
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:pt-10">
      <div className="mx-auto w-full max-w-[960px]">
        {/* Header */}
        <p className="kicker">Your position</p>
        <h1 className="display mt-2 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.125rem]">
          Would I have been invited?
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
          Enter a CRS score, tell us which rounds actually apply to you, and see what recent history
          says.
        </p>

        {/* PROFILE block */}
        <div className="mt-8 rounded-[var(--radius)] border border-[var(--rule)] bg-card p-5 sm:p-6">
          {/* Score input */}
          <div>
            <label htmlFor="crs-score" className="kicker">
              Your CRS score
            </label>
            <div className="mt-3 max-w-[9rem] border-b border-[var(--rule)] pb-1">
              <input
                id="crs-score"
                inputMode="numeric"
                autoComplete="off"
                placeholder="486"
                value={score}
                onChange={(e) => setScore(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="display w-full bg-transparent text-[3rem] leading-none text-ink outline-none placeholder:text-[var(--rule)] sm:text-[3.5rem]"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Saved on this device only.</p>
          </div>

          <div className="my-6 h-px bg-[var(--rule)]" />

          {/* Eligibility — two columns on md+, stacked on mobile */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
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
        </div>

        {/* RESULT block */}
        <div className="mt-6 rounded-[var(--radius)] bg-[var(--paper)] p-5 sm:p-6">
          <p className="kicker">What the history says</p>

          {!validScore ? (
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              Enter a score above to see how many of the last {windowMonths} months of relevant rounds
              it would have cleared.
            </p>
          ) : isLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : total === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No relevant rounds found since {formatDate(since)} for these selections — or data is not
              available yet (the daily refresh runs at ~9am ET).
            </p>
          ) : (
            <>
              <h2 className="display mt-4 text-[1.5rem] leading-[1.2] text-ink sm:text-[1.75rem]">
                You would have cleared{" "}
                <span
                  className="figure text-[2.75rem] leading-none sm:text-[3.25rem]"
                  style={{ color: figureColor }}
                >
                  {cleared}
                </span>{" "}
                of {total} relevant rounds in the last {windowMonths} months.
              </h2>

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

        {/* Relevant round history */}
        {validScore && !isLoading && total > 0 && (
          <section className="mt-12">
            <p className="kicker">Relevant round history</p>
            <h2 className="display mt-2 text-[1.35rem] leading-[1.2] text-ink">
              Every relevant round in this window
            </h2>

            {/* Desktop table */}
            <div className="surface mt-5 hidden overflow-hidden p-2 md:block">
              <Table>
                <caption className="sr-only">
                  Express Entry rounds relevant to your eligibility selections
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Round</TableHead>
                    <TableHead scope="col" className="text-right">
                      Invitations
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Cutoff
                    </TableHead>
                    <TableHead scope="col">Result</TableHead>
                    <TableHead scope="col">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((d) => (
                    <TableRow key={d.round_number}>
                      <TableCell className="num whitespace-nowrap text-muted-foreground">
                        {formatDate(d.draw_date)}
                      </TableCell>
                      <TableCell>
                        <RoundBadge draw={d} />
                      </TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {d.invitations_issued.toLocaleString("en-CA")}
                      </TableCell>
                      <TableCell className="num text-right font-semibold">
                        {d.cutoff_score}
                      </TableCell>
                      <TableCell>
                        <ResultPill draw={d} score={numericScore} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <SourceLink
                          url={d.source_url}
                          from="wihbi"
                          roundNumber={d.round_number}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="mt-5 space-y-3 md:hidden">
              {pagedRows.map((d) => (
                <li key={d.round_number} className="surface p-4">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{formatDate(d.draw_date)}</span>
                    <span className="num font-semibold">{d.cutoff_score} CRS</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RoundBadge draw={d} />
                    <ResultPill draw={d} score={numericScore} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{d.invitations_issued.toLocaleString("en-CA")} invitations</span>
                    <SourceLink url={d.source_url} from="wihbi" roundNumber={d.round_number} />
                  </div>
                </li>
              ))}
            </ul>

            <TablePagination
              currentPage={currentTablePage}
              pageCount={tablePageCount}
              onChange={setTablePage}
            />
          </section>
        )}

        <p className="mt-10">
          <SecondaryLink to="/history">Explore full history →</SecondaryLink>
        </p>

        {/* PostHog survey target */}
        <div id="wihbi-survey-slot" className="mt-8" />
      </div>
      </div>
    </TooltipProvider>
  );
}
