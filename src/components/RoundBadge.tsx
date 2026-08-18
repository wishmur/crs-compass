import { cn } from "@/lib/utils";
import { BADGE_TONE_CLASS, badgeTone, roundLabel, type Draw } from "@/data/round-types";

type Ctx = Pick<Draw, "round_type" | "program" | "category">;

const DOT_TONE_CLASS: Record<string, string> = {
  general: "dot-general",
  cec: "dot-cec",
  fsw: "dot-fsw",
  fst: "dot-fst",
  pnp: "dot-pnp",
  category: "dot-category",
};

export function RoundDot({ draw, className }: { draw: Ctx; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("h-2 w-2 shrink-0 rounded-full", DOT_TONE_CLASS[badgeTone(draw)], className)}
    />
  );
}

export function RoundBadge({
  draw,
  size = "sm",
  className,
}: {
  draw: Ctx;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium tracking-tight",
        BADGE_TONE_CLASS[badgeTone(draw)],
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
        className,
      )}
    >
      <RoundDot draw={draw} className={size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5"} />
      {roundLabel(draw)}
    </span>
  );
}
