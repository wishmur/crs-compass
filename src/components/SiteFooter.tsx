import { useQuery } from "@tanstack/react-query";
import { lastUpdatedQuery } from "@/lib/queries";

export function formatDateTime(ts: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

export function SiteFooter() {
  const { data: lastUpdated } = useQuery(lastUpdatedQuery());
  const pretty = formatDateTime(lastUpdated ?? null);

  return (
    <footer className="mt-14 rule-t">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-10 text-xs text-muted-foreground">
        <span className="display text-base text-foreground">CRS Compass</span>
        <span aria-hidden className="text-hairline">
          /
        </span>
        <span>Data: IRCC</span>
        <span aria-hidden className="text-hairline">
          /
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: pretty ? "var(--result-pass)" : "var(--track)" }}
          />
          {pretty
            ? `Last updated ${pretty}`
            : "Data not available yet — the daily refresh runs at ~9am ET"}
        </span>
        <span aria-hidden className="text-hairline">
          /
        </span>
        <span>Not immigration advice.</span>
      </div>
    </footer>
  );
}
