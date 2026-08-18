import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RoundBadge } from "@/components/RoundBadge";
import { SourceLink, formatDate } from "@/components/DrawMeta";
import { HistoryChart } from "@/components/HistoryChart";
import { drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import {
  CATEGORIES,
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

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
  labelFor,
}: {
  title: string;
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  labelFor?: (v: T) => string;
}) {
  return (
    <fieldset className="min-w-[10rem]">
      <legend className="text-xs font-semibold text-muted-foreground uppercase">{title}</legend>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
            {labelFor ? labelFor(o) : o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function History() {
  const { data, isLoading } = useQuery(drawsQuery());
  const [years, setYears] = useState<string[]>([]);
  const [types, setTypes] = useState<RoundType[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "draw_date",
    dir: "desc",
  });

  useEffect(() => {
    capture(EVENTS.HISTORY_VIEWED);
  }, []);

  const draws = data ?? [];
  const allYears = useMemo(
    () => [...new Set(draws.map((d) => d.draw_date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [draws],
  );

  const toggle =
    <T extends string>(
      set: React.Dispatch<React.SetStateAction<T[]>>,
      filter: "year" | "round_type" | "program" | "category",
    ) =>
    (v: T) => {
      set((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
      capture(EVENTS.HISTORY_FILTER_USED, { filter, value: v });
    };

  const filtered = useMemo(() => {
    const rows = draws.filter((d) => {
      if (years.length && !years.includes(d.draw_date.slice(0, 4))) return false;
      if (types.length && !types.includes(d.round_type)) return false;
      if (programs.length && (!d.program || !programs.includes(d.program))) return false;
      if (categories.length && (!d.category || !categories.includes(d.category))) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return av === bv ? 0 : (av > bv ? 1 : -1) * dir;
    });
  }, [draws, years, types, programs, categories, sort]);

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Draw history</h1>
      <p className="mt-2 text-muted-foreground">Every Express Entry round since 2015.</p>

      <div className="mt-8">
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : (
          <HistoryChart draws={draws} />
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-8 rounded-lg border border-border p-4">
        <FilterGroup title="Year" options={allYears} selected={years} onToggle={toggle(setYears, "year")} />
        <FilterGroup
          title="Round type"
          options={ROUND_TYPES}
          selected={types}
          onToggle={toggle<RoundType>(setTypes, "round_type")}
          labelFor={(t) => ROUND_TYPE_LABELS[t]}
        />
        <FilterGroup
          title="Program"
          options={PROGRAMS}
          selected={programs}
          onToggle={toggle(setPrograms, "program")}
        />
        <FilterGroup
          title="Category"
          options={CATEGORIES}
          selected={categories}
          onToggle={toggle(setCategories, "category")}
        />
        {(years.length || types.length || programs.length || categories.length) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYears([]);
              setTypes([]);
              setPrograms([]);
              setCategories([]);
            }}
          >
            Clear filters
          </Button>
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
          <div className="mt-6 hidden md:block">
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
                {filtered.map((d: Draw) => (
                  <TableRow key={d.round_number}>
                    <TableCell className="whitespace-nowrap">{formatDate(d.draw_date)}</TableCell>
                    <TableCell>
                      <RoundBadge draw={d} />
                    </TableCell>
                    <TableCell className="text-right">
                      {d.invitations_issued.toLocaleString("en-CA")}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{d.cutoff_score}</TableCell>
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
            {filtered.map((d) => (
              <li key={d.round_number} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{formatDate(d.draw_date)}</span>
                  <span className="font-semibold">{d.cutoff_score} CRS</span>
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
        </>
      )}
    </div>
  );
}
