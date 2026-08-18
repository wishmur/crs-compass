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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoundBadge } from "@/components/RoundBadge";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { TablePagination } from "@/components/TablePagination";
import { relevantDrawsQuery, drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { roundLabel } from "@/data/round-types";
import type { Eligibility } from "@/lib/useCrsProfile";

// "What the history says" — the result of applying the user's score to the
// rounds their eligibility makes relevant. Renders:
//   - a headline (You would have cleared N of M ...)
//   - a compact chip grid of the last ~20 relevant rounds (✓ / ✕)
//   - a paginated table of every relevant round in the window
//   - a "compare against last 3 years" toggle
//   - an honest zero-callout when nothing has been within reach recently

const TABLE_PAGE_SIZE = 15;

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
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
            <Skeleton className="h-60 w-full" />
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
              {pillGrid.map((r) => (
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
                    {pagedRows.map((d) => (
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
                            style={{
                              backgroundColor: d.would_have_cleared
                                ? "var(--brand-soft)"
                                : "var(--accent-soft)",
                              color: d.would_have_cleared ? "var(--brand)" : "var(--accent)",
                            }}
                          >
                            {d.would_have_cleared ? "Cleared" : "Not cleared"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SourceLink url={d.source_url} from="wihbi" roundNumber={d.round_number} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <ul className="mt-4 space-y-3 md:hidden">
                {pagedRows.map((d) => (
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
                        style={{
                          backgroundColor: d.would_have_cleared
                            ? "var(--brand-soft)"
                            : "var(--accent-soft)",
                          color: d.would_have_cleared ? "var(--brand)" : "var(--accent)",
                        }}
                      >
                        {d.would_have_cleared ? "Cleared" : "Not cleared"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs">
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
            </div>
          </>
        )}
      </section>
    </TooltipProvider>
  );
}
