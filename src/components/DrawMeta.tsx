import { EVENTS, capture } from "@/lib/analytics";

export function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function SourceLink({
  url,
  from,
  roundNumber,
}: {
  url: string | null;
  from: "latest" | "history" | "wihbi";
  roundNumber: string;
}) {
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() =>
        capture(EVENTS.OFFICIAL_SOURCE_CLICKED, { from, round_number: roundNumber })
      }
      className="text-primary underline underline-offset-4 hover:no-underline"
    >
      Official IRCC announcement
    </a>
  );
}
