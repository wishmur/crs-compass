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
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide uppercase",
        BADGE_TONE_CLASS[badgeTone(draw)],
        size === "lg" ? "px-3.5 py-1.5 text-xs" : "px-2.5 py-1 text-[0.65rem]",
        className,
      )}
    >
      <RoundDot draw={draw} className={size === "lg" ? "h-1.5 w-1.5" : "h-1 w-1"} />
      {roundLabel(draw)}
    </span>
  );
}

