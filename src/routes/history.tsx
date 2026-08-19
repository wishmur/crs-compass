import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChipGroup, FilterChip } from "@/components/FilterChip";

import { RoundBadge } from "@/components/RoundBadge";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { HistoryChart } from "@/components/HistoryChart";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import {
  CATEGORIES,
  MAIN_SERIES,

  PROGRAMS,
  ROUND_TYPES,
  ROUND_TYPE_LABELS,
  roundLabel,
  type Draw,
  type RoundType,
} from "@/data/round-types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Express Entry draw history — every round since 2015" },
      {
        name: "description",
        content:
          "Filter and sort every Express Entry round since 2015 by year, round type, program and category, with an interactive cutoff chart.",
      },
      { property: "og:title", content: "Express Entry draw history since 2015" },
      {
        property: "og:description",
        content:
          "Every Express Entry round with cutoff scores, invitations and official sources — filterable and sortable.",
      },
    ],
  }),
  component: History,
});

type SortKey = "draw_date" | "invitations_issued" | "cutoff_score";

const PAGE_SIZE = 15;
const YEARS = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => String(2015 + i));

function History() {
  const { data, isLoading } = useQuery(drawsQuery());
  const [years, setYears] = useState<string[]>([]);
  const [types, setTypes] = useState<RoundType[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "draw_date",
    dir: "desc",
  });

  useEffect(() => {
    capture(EVENTS.HISTORY_VIEWED);
  }, []);

  const draws = data ?? [];

  const toggle =
    <T extends string>(
      set: React.Dispatch<React.SetStateAction<T[]>>,
      filter: "year" | "round_type" | "program" | "category",
    ) =>
    (v: T) => {
      set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
      setPage(1);
      capture(EVENTS.HISTORY_FILTER_USED, { filter, value: v });
    };

  const filtered = useMemo(() => {
    const matchesType = (d: Draw) => {
      if (!types.length) return true;
      return types.some((t) => {
        if (t !== d.round_type) return false;
        if (t === "program_specific")
          return !programs.length || (!!d.program && programs.includes(d.program));
        if (t === "category_based")
          return !categories.length || (!!d.category && categories.includes(d.category));
        return true;
      });
    };
    const rows = draws.filter((d) => {
      if (years.length && !years.includes(d.draw_date.slice(0, 4))) return false;
      return matchesType(d);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return av === bv ? 0 : (av > bv ? 1 : -1) * dir;
    });
  }, [draws, years, types, programs, categories, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters =
    years.length + types.length + programs.length + categories.length > 0;
  /** Only round-type/program/category chips narrow which series render; year narrows the data. */
  const seriesFilterActive = types.length + programs.length + categories.length > 0;

  /** One filter state drives both chart and table; with no series filter we show a restrained default. */
  const chartSeries = useMemo(() => {
    const present = MAIN_SERIES.filter((s) => filtered.some((d) => s.matches(d)));
    if (!seriesFilterActive)
      return present.filter((s) => s.key === "general" || s.key === "CEC");
    return present;
  }, [filtered, seriesFilterActive]);

  const clearAll = () => {
    setYears([]);
    setTypes([]);
    setPrograms([]);
    setCategories([]);
    setPage(1);
  };

  const pageItems = (): (number | "…")[] => {
    const items: (number | "…")[] = [];
    for (let p = 1; p <= pageCount; p++) {
      if (p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1) items.push(p);
      else if (items[items.length - 1] !== "…") items.push("…");
    }
    return items;
  };


  const sortBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() =>
        setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))
      }
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sort.key === key ? (
        sort.dir === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:pt-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="max-w-xl">
          <p className="kicker">Explore the data</p>
          <h1 className="display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Draw History
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every Express Entry round since IRCC began publishing them. Filter by year, type,
            program or category — the chart and table update together.
          </p>
        </div>
        {!isLoading && draws.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums sm:mt-[2.4rem]">
            {draws.length.toLocaleString("en-CA")} draws · 2015–{new Date().getFullYear()}
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-[var(--rule)] pt-5">
        <div className="flex items-baseline justify-between gap-4">
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <p className="text-sm text-muted-foreground tabular-nums">
              Showing {filtered.length.toLocaleString("en-CA")} of{" "}
              {draws.length.toLocaleString("en-CA")} rounds
            </p>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <ChipGroup title="Year">
            {YEARS.map((y) => (
              <FilterChip
                key={y}
                label={y}
                selected={years.includes(y)}
                onClick={() => toggle(setYears, "year")(y)}
              />
            ))}
          </ChipGroup>

          <ChipGroup title="Round type">
            {ROUND_TYPES.map((t) => (
              <FilterChip
                key={t}
                label={ROUND_TYPE_LABELS[t]}
                selected={types.includes(t)}
                onClick={() => toggle<RoundType>(setTypes, "round_type")(t)}
              />
            ))}
          </ChipGroup>

          {types.includes("program_specific") && (
            <ChipGroup title="Program">
              {PROGRAMS.map((p) => (
                <FilterChip
                  key={p}
                  label={p}
                  selected={programs.includes(p)}
                  onClick={() => toggle(setPrograms, "program")(p)}
                />
              ))}
            </ChipGroup>
          )}

          {types.includes("category_based") && (
            <ChipGroup title="Category">
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  selected={categories.includes(c)}
                  onClick={() => toggle(setCategories, "category")(c)}
                />
              ))}
            </ChipGroup>
          )}
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : (
          <HistoryChart draws={filtered} series={chartSeries} />
        )}
      </div>



      {isLoading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No rounds match these filters — or data is not available yet (the daily refresh runs at
          ~9am ET).
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface mt-6 hidden overflow-hidden p-2 md:block">
            <Table>
              <caption className="sr-only">Express Entry rounds of invitations</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{sortBtn("draw_date", "Date")}</TableHead>
                  <TableHead scope="col">Round</TableHead>
                  <TableHead scope="col" className="text-right">
                    {sortBtn("invitations_issued", "Invitations")}
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    {sortBtn("cutoff_score", "Cutoff")}
                  </TableHead>
                  <TableHead scope="col">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((d: Draw) => (
                  <TableRow key={d.round_number}>
                    <TableCell className="num whitespace-nowrap text-muted-foreground">{formatDate(d.draw_date)}</TableCell>
                    <TableCell>
                      <RoundBadge draw={d} />
                    </TableCell>
                    <TableCell className="num text-right text-muted-foreground">
                      {d.invitations_issued.toLocaleString("en-CA")}
                    </TableCell>
                    <TableCell className="num text-right font-semibold">{d.cutoff_score}</TableCell>
                    <TableCell className="text-xs">
                      <SourceLink url={d.source_url} from="history" roundNumber={d.round_number} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {pageRows.map((d) => (
              <li key={d.round_number} className="surface p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{formatDate(d.draw_date)}</span>
                  <span className="num font-semibold">{d.cutoff_score} CRS</span>
                </div>
                <div className="mt-2">
                  <RoundBadge draw={d} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {d.invitations_issued.toLocaleString("en-CA")} invitations ·{" "}
                  {roundLabel(d)}
                </div>
                <div className="mt-2 text-xs">
                  <SourceLink url={d.source_url} from="history" roundNumber={d.round_number} />
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center justify-center gap-1 text-sm"
            >
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                ← Prev
              </button>
              {pageItems().map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={
                      p === currentPage
                        ? "num rounded-full bg-[var(--brand)] px-3 py-1.5 text-white"
                        : "num rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
                    }
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Next →
              </button>
            </nav>
          )}
        </>

      )}
    </div>
  );
}
