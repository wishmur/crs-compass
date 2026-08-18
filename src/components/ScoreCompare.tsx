import { cn } from "@/lib/utils";

/**
 * The signature motif: a horizontal rule on which a cutoff sits as a tick and
 * the user's score sits as a marker. Purely presentational.
 */
export function ScoreCompare({
  cutoff,
  score,
  min = 400,
  max = 620,
  size = "md",
  cutoffLabel,
  className,
}: {
  cutoff: number;
  score?: number | null;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  cutoffLabel?: string;
  className?: string;
}) {
  const lo = Math.min(min, cutoff - 10, score ?? cutoff);
  const hi = Math.max(max, cutoff + 10, score ?? cutoff);
  const span = Math.max(1, hi - lo);
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  const cleared = score != null && score >= cutoff;
  const h = size === "sm" ? "h-px" : "h-0.5";

  return (
    <div className={cn("relative w-full", size === "sm" ? "pt-3 pb-3" : "pt-6 pb-7", className)}>
      <div className={cn("w-full rounded-full bg-track", h)} />

      {/* span between score and cutoff */}
      {score != null && (
        <div
          className={cn("absolute", h, size === "sm" ? "top-3" : "top-6")}
          style={{
            left: `${Math.min(pos(score), pos(cutoff))}%`,
            width: `${Math.abs(pos(score) - pos(cutoff))}%`,
            backgroundColor: cleared ? "var(--result-pass)" : "var(--result-fail)",
          }}
        />
      )}

      {/* cutoff tick */}
      <div
        className="absolute -translate-x-1/2"
        style={{ left: `${pos(cutoff)}%`, top: 0, bottom: 0 }}
      >
        <span
          aria-hidden
          className={cn("absolute left-1/2 w-px -translate-x-1/2 bg-foreground/70", size === "sm" ? "top-1 h-5" : "top-2 h-9")}
        />
        <span
          className={cn(
            "num absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.65rem] tracking-wide text-muted-foreground",
            size === "sm" ? "bottom-0" : "bottom-0",
          )}
        >
          {cutoffLabel ?? `cutoff ${cutoff}`}
        </span>
      </div>

      {/* score marker */}
      {score != null && (
        <div className="absolute -translate-x-1/2" style={{ left: `${pos(score)}%`, top: 0 }}>
          <span
            aria-hidden
            className={cn(
              "block rounded-full ring-2 ring-background",
              size === "sm" ? "mt-2 h-2.5 w-2.5" : "mt-4.5 h-3.5 w-3.5",
            )}
            style={{ backgroundColor: cleared ? "var(--result-pass)" : "var(--result-fail)" }}
          />
          <span className="num absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1 text-[0.7rem] font-medium text-foreground">
            you {score}
          </span>
        </div>
      )}
    </div>
  );
}
