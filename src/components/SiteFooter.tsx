import { useQuery } from "@tanstack/react-query";
import { lastUpdatedQuery } from "@/lib/queries";

function formatDateShort(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { dateStyle: "medium" });
}

export function SiteFooter() {
  const { data: lastUpdated } = useQuery(lastUpdatedQuery());
  const pretty = formatDateShort(lastUpdated ?? null);

  return (
    <footer className="mt-24 hairline-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-5 py-10 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">CRS Compass</span>
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
            ? `IRCC data updated ${pretty}`
            : "Data not available yet — the daily refresh runs at ~9am ET"}
        </span>
        <span aria-hidden className="text-hairline">
          /
        </span>
        <span>Historical results, not predictions.</span>
        <span aria-hidden className="text-hairline">
          /
        </span>
        <span>Not immigration advice.</span>
      </div>
    </footer>
  );
}
