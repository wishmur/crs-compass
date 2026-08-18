import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoundBadge } from "@/components/RoundBadge";
import { formatDate } from "@/components/DrawMeta";
import { relevantDrawsQuery, drawsQuery } from "@/lib/queries";
import { EVENTS, capture } from "@/lib/analytics";
import { CATEGORIES, PROGRAM_LABELS, roundLabel, type Program } from "@/data/round-types";

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
const CATEGORY_HINT =
  "You should only check this if you meet IRCC's specific criteria for that category — see the official list.";

interface Eligibility {
  program: Program | null;
  categories: string[];
}

function twoYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

function Wihbi() {
  const [hydrated, setHydrated] = useState(false);
  const [score, setScore] = useState<string>("");
  const [elig, setElig] = useState<Eligibility>({ program: null, categories: [] });
  const since = useMemo(twoYearsAgo, []);

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

  // Persist + debounced score event
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SCORE_KEY, score);
    if (timer.current) clearTimeout(timer.current);
    const n = Number(score);
    if (score !== "" && Number.isFinite(n)) {
      timer.current = setTimeout(() => capture(EVENTS.WIHBI_SCORE_ENTERED, { score: n }), 800);
    }
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
  const validScore = score !== "" && Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= 1200;

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

  useEffect(() => {
    if (results && results.length >= 0 && validScore && !isLoading) {
      capture(EVENTS.WIHBI_RESULT_VIEWED, { cleared, total, since });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, isLoading]);

  const lastTwelve = useMemo(
    () =>
      [...(results ?? [])]
        .sort((a, b) => b.draw_date.localeCompare(a.draw_date))
        .slice(0, 12)
        .reverse(),
    [results],
  );

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  }, []);

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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Would I have been invited?</h1>
        <p className="mt-2 text-muted-foreground">
          Enter a CRS score you already know, tell us which rounds actually apply to you, and see
          what the history says.
        </p>

        {/* Step 1 */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
              Step 1 — Your CRS score
            </h2>
            <div className="mt-3 max-w-40">
              <Label htmlFor="score" className="sr-only">
                CRS score
              </Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={1200}
                inputMode="numeric"
                placeholder="e.g. 486"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            {score !== "" && !validScore && (
              <p className="mt-2 text-sm text-destructive">Enter a score between 0 and 1200.</p>
            )}
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
              Step 2 — What actually applies to you?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              General rounds are always included — everyone in the pool is eligible when they run.
            </p>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Program</legend>
              <RadioGroup
                className="mt-3 space-y-2"
                value={elig.program ?? "none"}
                onValueChange={(v) =>
                  setElig((e) => ({ ...e, program: v === "none" ? null : (v as Program) }))
                }
              >
                {[
                  { v: "none", label: "None of these / not sure" },
                  { v: "CEC", label: "I'm inside Canada working full-time (CEC)" },
                  { v: "FSW", label: "I'm a Federal Skilled Worker candidate (FSW)" },
                  { v: "FST", label: "I'm a Federal Skilled Trades candidate (FST)" },
                  { v: "PNP", label: "I hold a provincial nomination (PNP)" },
                ].map((o) => (
                  <div key={o.v} className="flex items-start gap-2">
                    <RadioGroupItem value={o.v} id={`prog-${o.v}`} className="mt-1" />
                    <Label htmlFor={`prog-${o.v}`} className="font-normal">
                      {o.label}
                      {o.v === "PNP" && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Only check this if you actually hold a nomination. PNP cutoffs include the
                          automatic 600-point bonus, so they are meaningless without one.
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {elig.program && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Comparing against: {PROGRAM_LABELS[elig.program]}
                </p>
              )}
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-sm font-medium">Category-based rounds</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${c}`}
                      checked={elig.categories.includes(c)}
                      onCheckedChange={() =>
                        setElig((e) => ({
                          ...e,
                          categories: e.categories.includes(c)
                            ? e.categories.filter((x) => x !== c)
                            : [...e.categories, c],
                        }))
                      }
                    />
                    <Label htmlFor={`cat-${c}`} className="font-normal">
                      {c}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label={`About the ${c} category`}>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{CATEGORY_HINT}</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs">
                <a
                  className="text-primary underline underline-offset-4 hover:no-underline"
                  href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Official category criteria on canada.ca
                </a>
              </p>
            </fieldset>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
              Step 3 — Result
            </h2>

            {!validScore ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Enter your score above to see your results.
              </p>
            ) : isLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-6 w-72" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : total === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No relevant rounds found since {formatDate(since)} for these selections — or data is
                not available yet (the daily refresh runs at ~9am ET).
              </p>
            ) : (
              <div className="mt-3">
                <p className="text-base">
                  You would have cleared{" "}
                  <strong>
                    {cleared} of {total}
                  </strong>{" "}
                  relevant rounds since {formatDate(since)}.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {lastTwelve.map((r) => (
                    <Tooltip key={r.round_number}>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="h-8 w-8 rounded-full"
                          style={{
                            backgroundColor: r.would_have_cleared
                              ? "var(--result-pass-bg)"
                              : "var(--result-fail-bg)",
                          }}
                          aria-label={`${formatDate(r.draw_date)} — ${roundLabel(r)} — cutoff ${r.cutoff_score} — ${r.would_have_cleared ? "cleared" : "did not clear"}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {formatDate(r.draw_date)} · {roundLabel(r)} · cutoff {r.cutoff_score}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last {lastTwelve.length} relevant rounds — green means your score cleared the
                  cutoff.
                </p>

                {!clearedRecently && (
                  <p className="mt-5 rounded-md border border-border bg-muted/50 p-4 text-sm">
                    No relevant rounds have been within your reach in the last 6 months.
                    {topUncheckedFamilies.length > 0 && (
                      <>
                        {" "}
                        In {new Date().getFullYear()}, most invitations went to{" "}
                        {topUncheckedFamilies.join(" and ")} category rounds.
                      </>
                    )}
                  </p>
                )}

                <ul className="mt-6 space-y-2">
                  {[...(results ?? [])]
                    .sort((a, b) => b.draw_date.localeCompare(a.draw_date))
                    .slice(0, 12)
                    .map((r) => (
                      <li
                        key={r.round_number}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                      >
                        <span className="flex flex-wrap items-center gap-3">
                          <span className="text-muted-foreground">{formatDate(r.draw_date)}</span>
                          <RoundBadge draw={r} />
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-tight ${
                            r.would_have_cleared ? "pill-pass" : "pill-fail"
                          }`}
                        >
                          {r.cutoff_score} CRS · {r.would_have_cleared ? "cleared" : "missed"}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* PostHog survey target */}
            <div id="wihbi-survey-slot" className="mt-8" />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
