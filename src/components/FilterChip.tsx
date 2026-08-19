import { cn } from "@/lib/utils";

/** Canonical chip toggle for the whole app.
 *
 * tone="light" (default) — for the cream page surface.
 * tone="dark" — for the deep-green hero surface.
 */
export function FilterChip({
  label,
  selected,
  onClick,
  tone = "light",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3.5 text-[0.8125rem] leading-none transition-colors",
        tone === "light"
          ? selected
            ? "bg-[var(--brand)] text-white"
            : "border border-[var(--rule)] text-muted-foreground hover:text-foreground"
          : selected
            ? "bg-[var(--accent-soft)] font-medium text-[var(--brand)]"
            : "border border-[rgba(246,241,232,0.28)] text-[rgba(246,241,232,0.72)] hover:border-[rgba(246,241,232,0.55)] hover:text-[var(--paper)]",
      )}
    >
      {label}
    </button>
  );
}

export function ChipGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="kicker w-32 shrink-0">{title}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
