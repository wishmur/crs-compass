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
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
        Data: IRCC ·{" "}
        {pretty
          ? `Last updated: ${pretty}`
          : "Data not available yet — the daily refresh runs at ~9am ET"}{" "}
        · Not immigration advice.
      </div>
    </footer>
  );
}
