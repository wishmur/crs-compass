import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RoundBadge } from "@/components/RoundBadge";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { TablePagination } from "@/components/TablePagination";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { roundLabel } from "@/data/round-types";
import type { Eligibility } from "@/lib/useCrsProfile";
import { compareToCutoff, monthsAgo, useRelevantComparison } from "@/lib/useRelevantComparison";

// "What the history says" — the result of applying the user's score to the
// rounds their eligibility makes relevant. Renders:
//   - a headline (Your score was at or above the cutoff in N of M ...)
//   - a compact chip grid of the last ~20 relevant rounds (✓ / ✕)
//   - a paginated table of every relevant round in the window
//   - a "compare against last 3 years" toggle
//   - an honest zero-callout when nothing has been within reach recently

const TABLE_PAGE_SIZE = 15;

function formatTieBreak(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

/** Pill / row treatment for the three comparison states. */
function stateStyle(state: "above" | "matched" | "below") {
  if (state === "above")
    return {
      bg: "var(--brand-soft)",
      fg: "var(--brand)",
      mark: "✓",
      label: "Above cutoff",
    };
  if (state === "matched")
    return {
      bg: "var(--muted)",
      fg: "var(--muted-foreground)",
      mark: "=",
      label: "Matched cutoff · tie-break applies",
    };
  return {
    bg: "var(--accent-soft)",
    fg: "var(--accent)",
    mark: "✕",
    label: "Below cutoff",
  };
}

interface Props {
  /** Parsed numeric CRS score from the hero input, or null if empty/invalid. */
  score: number | null;
  elig: Eligibility;
}

export function PersonalScoreSection({ score, elig }: Props) {
  const [windowMonths, setWindowMonths] = useState<24 | 36>(24);
  const since = useMemo(() => monthsAgo(windowMonths), [windowMonths]);

  const validScore = score !== null && score >= 0 && score <= 1200;

  const { results, isLoading, above, matched, total } = useRelevantComparison(score, elig, since);
  const { data: allDraws } = useQuery(drawsQuery());

  const compare = (cutoff: number) => compareToCutoff(score, cutoff);
  const ratio = total ? above / total : 0;
  const figureColor =
    above === 0 ? "var(--muted-foreground)" : ratio >= 0.5 ? "var(--brand)" : "var(--accent)";

  // Median, highest, and lowest cutoff of the relevant rounds. Together they
  // give the user a comparative baseline the raw "cleared N of M" number
  // doesn't provide — how tight the range was, and where they sit in it.
  const cutoffStats = useMemo(() => {
    if (!results || results.length === 0) return null;
    const sorted = results.map((r) => r.cutoff_score).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
    return { median, lowest: sorted[0]!, highest: sorted[sorted.length - 1]! };
  }, [results]);

  // Average gap between consecutive relevant rounds in the window — sets
  // expectations about how often a round like this actually comes up,
  // without predicting when the next one lands.
  const cadenceDays = useMemo(() => {
    if (!results || results.length < 2) return null;
    const dates = results.map((r) => new Date(r.draw_date).getTime()).sort((a, b) => a - b);
    const span = dates[dates.length - 1]! - dates[0]!;
    return Math.round(span / (dates.length - 1) / (1000 * 60 * 60 * 24));
  }, [results]);

  // Human-readable summary of what the calculation is based on — so the user
  // never has to wonder what N/M actually includes.
  const profileSummary = useMemo(() => {
    const parts: string[] = [`CRS ${score}`];
    parts.push(elig.programs.length ? elig.programs.join(", ") : "General only");
    parts.push(elig.categories.length ? elig.categories.join(", ") : "All categories");
    return parts.join(" · ");
  }, [score, elig]);

  const analyticsFired = useRef<string>("");
  useEffect(() => {
    if (!results || !validScore || isLoading) return;
    const key = `${score}-${elig.programs.join(",")}-${elig.categories.join(",")}-${windowMonths}`;
    if (analyticsFired.current === key) return;
    analyticsFired.current = key;
    capture(EVENTS.WIHBI_RESULT_VIEWED, { cleared: above, total, since });
  }, [results, validScore, isLoading, score, elig, windowMonths, above, total, since]);

  // Oldest → newest for the pill grid so the eye reads left-to-right through
  // time and stops on "most recent" at the right edge.
  const pillGrid = useMemo(
    () =>
      [...(results ?? [])]
        .sort((a, b) => b.draw_date.localeCompare(a.draw_date))
        .slice(0, 20)
        .reverse(),
    [results],
  );

  // Full paginated table — newest first.
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
      <section id="what-the-history-says" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="kicker">What the history says</p>
          {validScore && (
            <p className="text-[0.7rem] tabular-nums text-muted-foreground/80">{profileSummary}</p>
          )}
        </div>

        {!validScore ? (
          <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
            Enter your CRS score in the hero above to see how it compares against the last{" "}
            {windowMonths} months of relevant rounds.
          </p>
        ) : isLoading ? (
          <div className="mt-5 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : total === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No relevant rounds found since {formatDate(since)} for these selections — or data is not
            available yet (the daily refresh runs at ~9am ET).
          </p>
        ) : (
          <>
            {/* PRIMARY: the answer */}
            <h3 className="display mt-5 text-[1.5rem] leading-[1.2] text-ink sm:text-[1.85rem]">
              Your score was above the cutoff in{" "}
              <span
                className="figure text-[2.75rem] leading-none sm:text-[3.25rem]"
                style={{ color: figureColor }}
              >
                {above}
              </span>{" "}
              of {total} relevant rounds in the last {windowMonths} months.
            </h3>

            {/* SECONDARY: supporting stats collapsed into one quiet line
                (two on mobile). Individually smaller and lighter so they
                don't compete with the answer above. */}
            {cutoffStats !== null && (
              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Range{" "}
                  <span className="tabular-nums text-ink">
                    {cutoffStats.lowest}–{cutoffStats.highest}
                  </span>
                </span>
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
                <span>
                  Median <span className="tabular-nums text-ink">{cutoffStats.median}</span>
                </span>
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
                <span>
                  You{" "}
                  <span
                    className="font-medium tabular-nums"
                    style={{
                      color: score! - cutoffStats.median >= 0 ? "var(--brand)" : "var(--accent)",
                    }}
                  >
                    {score! - cutoffStats.median >= 0 ? "+" : ""}
                    {score! - cutoffStats.median}
                  </span>{" "}
                  {score! >= cutoffStats.median ? "above" : "below"} median
                </span>
                {matched > 0 && (
                  <>
                    <span aria-hidden className="text-muted-foreground/50">
                      ·
                    </span>
                    <span>
                      <span className="tabular-nums text-ink">{matched}</span> matched exactly
                      (tie-break)
                    </span>
                  </>
                )}
                {cadenceDays !== null && (
                  <>
                    <span aria-hidden className="text-muted-foreground/50">
                      ·
                    </span>
                    <span>
                      Rounds ~<span className="tabular-nums text-ink">{cadenceDays}</span> days
                      apart
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Pill grid — more air, isolated from the numbers above */}
            <div className="mt-8 flex flex-wrap gap-2">
              {pillGrid.map((r) => {
                const state = compare(r.cutoff_score);
                const s = stateStyle(state);
                const tieBreak = formatTieBreak(r.tie_break_timestamp);
                return (
                  <Tooltip key={r.round_number}>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium"
                        style={{ backgroundColor: s.bg, color: s.fg }}
                        aria-label={`${formatDate(r.draw_date)} — ${roundLabel(r)} — cutoff ${r.cutoff_score} — ${s.label}`}
                      >
                        {s.mark}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <div className="flex items-center gap-2">
                        {formatDate(r.draw_date)} · cutoff {r.cutoff_score}
                        <RoundBadge draw={r} />
                      </div>
                      <div className="mt-1 font-medium" style={{ color: s.fg }}>
                        {s.label}
                      </div>
                      {state === "matched" && tieBreak && (
                        <div className="mt-1 text-muted-foreground">Tie-break: {tieBreak}</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground/80">
              Last {pillGrid.length} relevant rounds, oldest to newest.
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
                    In {currentYear}, most invitations went to {topUncheckedFamilies.join(" and ")}{" "}
                    category rounds.
                  </>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem]">
              <button
                type="button"
                onClick={() => setWindowMonths((w) => (w === 24 ? 36 : 24))}
                className="text-muted-foreground/80 underline underline-offset-4 hover:text-foreground"
              >
                {windowMonths === 24
                  ? "Compare against the last 3 years instead →"
                  : "Back to the last 24 months →"}
              </button>
              <a
                href="/about"
                className="text-muted-foreground/80 underline underline-offset-4 hover:text-foreground"
              >
                How this works →
              </a>
            </div>

            {/* Full paginated table of every relevant round in the window */}
            <div className="mt-10">
              <p className="kicker">Every relevant round in this window</p>

              {/* Desktop / tablet table */}
              <div className="mt-4 hidden overflow-hidden rounded-[var(--radius)] border border-[var(--rule)] md:block">
                <Table>
                  <caption className="sr-only">
                    Express Entry rounds relevant to your eligibility, with cleared / not-cleared
                    against your score
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
                      <TableHead scope="col">Your result</TableHead>
                      <TableHead scope="col">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((d) => {
                      const state = compare(d.cutoff_score);
                      const s = stateStyle(state);
                      const tieBreak = formatTieBreak(d.tie_break_timestamp);
                      return (
                        <TableRow key={d.round_number}>
                          <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatDate(d.draw_date)}
                          </TableCell>
                          <TableCell>
                            <RoundBadge draw={d} />
                          </TableCell>
                          <TableCell className="num text-right">
                            {d.invitations_issued.toLocaleString("en-CA")}
                          </TableCell>
                          <TableCell className="num text-right font-semibold">
                            {d.cutoff_score}
                          </TableCell>
                          <TableCell>
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: s.bg, color: s.fg }}
                            >
                              {state === "above"
                                ? "Above"
                                : state === "matched"
                                  ? "Matched"
                                  : "Below"}
                            </span>
                            {state === "matched" && tieBreak && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Tie-break: {tieBreak}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <SourceLink
                              url={d.source_url}
                              from="wihbi"
                              roundNumber={d.round_number}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <ul className="mt-4 space-y-3 md:hidden">
                {pagedRows.map((d) => {
                  const state = compare(d.cutoff_score);
                  const s = stateStyle(state);
                  const tieBreak = formatTieBreak(d.tie_break_timestamp);
                  return (
                    <li
                      key={d.round_number}
                      className="rounded-[var(--radius)] border border-[var(--rule)] p-4"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatDate(d.draw_date)}
                        </span>
                        <span className="num font-semibold">{d.cutoff_score} CRS</span>
                      </div>
                      <div className="mt-2">
                        <RoundBadge draw={d} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {d.invitations_issued.toLocaleString("en-CA")} invitations
                        </span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: s.bg, color: s.fg }}
                        >
                          {state === "above" ? "Above" : state === "matched" ? "Matched" : "Below"}
                        </span>
                      </div>
                      {state === "matched" && tieBreak && (
                        <p className="mt-2 text-xs text-muted-foreground">Tie-break: {tieBreak}</p>
                      )}
                      <div className="mt-2 text-xs">
                        <SourceLink url={d.source_url} from="wihbi" roundNumber={d.round_number} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <TablePagination
                currentPage={currentTablePage}
                pageCount={tablePageCount}
                onChange={setTablePage}
              />
            </div>
          </>
        )}
      </section>
    </TooltipProvider>
  );
}
