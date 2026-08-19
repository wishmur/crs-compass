import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lastUpdatedQuery } from "@/lib/queries";

const links = [
  { to: "/", label: "Home" },
  { to: "/history", label: "History" },
  { to: "/plan", label: "Plan" },
  { to: "/about", label: "About" },
] as const;

function formatShort(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { dateStyle: "medium" });
}

export function SiteHeader() {
  const { data: lastUpdated } = useQuery(lastUpdatedQuery());
  const pretty = formatShort(lastUpdated ?? null);

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-3.5"
      >
        {/* Left cluster: wordmark + freshness readout.
            Mobile: stacked (no separator). Desktop: inline with a subtle | between. */}
        <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <Link to="/" className="display text-[20px] leading-none text-brand">
            <span className="font-bold">CRS</span>{" "}
            <span className="font-medium">Compass</span>
          </Link>
          {pretty && (
            <>
              <span aria-hidden className="hidden text-hairline sm:inline">
                |
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                Data checked: {pretty}
              </span>
            </>
          )}
        </div>

        {/* Right: nav */}
        <ul className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="block rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-ink sm:px-3 [&.active]:bg-[var(--brand-soft)] [&.active]:font-medium [&.active]:text-brand"
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
