import { cn } from "@/lib/utils";

/** Canonical chip toggle for the whole app. */
export function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3.5 text-[0.8125rem] leading-none transition-colors",
        selected
          ? "bg-[var(--brand)] text-white"
          : "border border-[var(--rule)] text-muted-foreground hover:text-foreground",
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
