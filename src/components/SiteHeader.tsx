import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Latest" },
  { to: "/history", label: "History" },
  { to: "/would-i-have-made-it", label: "My Score" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-background/90 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-baseline justify-between gap-6 px-5 py-3.5"
      >
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="display text-[1.35rem] text-foreground">CRS</span>
          <span className="display text-[1.35rem] italic text-teal transition-colors group-hover:text-burnt">
            Compass
          </span>
        </Link>

        <ul className="flex items-center gap-4 text-[0.82rem] sm:gap-6">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="nav-pill relative block py-1 text-muted-foreground [&.active]:font-medium [&.active]:text-foreground [&.active]:after:absolute [&.active]:after:-bottom-0.5 [&.active]:after:left-0 [&.active]:after:h-px [&.active]:after:w-full [&.active]:after:bg-burnt"
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
