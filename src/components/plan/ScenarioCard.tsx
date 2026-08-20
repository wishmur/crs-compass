import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string | undefined;
  badge?: string | undefined;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

/** Card used for both the goal step (PR / Citizenship) and the "what are you
    considering?" scenario picker. A disabled card is a real, visible part of
    the information architecture — not hidden — it just isn't wired up yet. */
export function ScenarioCard({ title, description, badge, selected, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-start gap-1 rounded-[var(--radius)] border p-4 text-left transition-colors sm:p-5",
        disabled
          ? "cursor-not-allowed border-[var(--rule)] opacity-50"
          : selected
            ? "border-[var(--brand)] bg-[var(--brand-soft)]"
            : "border-[var(--rule)] hover:border-[var(--brand)]",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-medium text-ink">{title}</span>
        {badge && (
          <span className="shrink-0 rounded-full border border-[var(--rule)] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
      )}
    </button>
  );
}
