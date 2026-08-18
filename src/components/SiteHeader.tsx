import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Latest" },
  { to: "/history", label: "History" },
  { to: "/would-i-have-made-it", label: "My score" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
      >
        <Link to="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-[0.7rem] font-bold tracking-tight text-primary-foreground transition-transform duration-200 group-hover:-rotate-6"
          >
            CC
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            CRS Compass
          </span>
        </Link>

        <ul className="flex items-center gap-0.5 text-sm">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="nav-pill block rounded-lg px-2.5 py-1.5 text-muted-foreground sm:px-3 [&.active]:bg-surface-sunken [&.active]:font-medium [&.active]:text-foreground"
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
