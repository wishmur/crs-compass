import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Latest" },
  { to: "/history", label: "History" },
  { to: "/would-i-have-made-it", label: "My Score" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5"
      >
        <Link to="/" className="display text-[20px] leading-none text-brand">
          <span className="font-bold">CRS</span>{" "}
          <span className="font-medium">Compass</span>
        </Link>

        <ul className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="block rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-ink sm:px-3 [&.active]:font-medium [&.active]:text-ink"
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
