import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Latest" },
  { to: "/history", label: "History" },
  { to: "/would-i-have-made-it", label: "Would I have been invited?" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4"
      >
        <Link to="/" className="leading-tight">
          <span className="block text-sm font-bold tracking-tight text-foreground">
            CRS<span className="text-primary"> Compass</span>
          </span>
          <span className="block text-xs text-muted-foreground">
            A personalized Express Entry tracker for Canada.
          </span>
        </Link>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="text-muted-foreground transition-colors hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
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
