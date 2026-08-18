import { cn } from "@/lib/utils";
import { BADGE_TONE_CLASS, badgeTone, roundLabel, type Draw } from "@/data/round-types";

type Ctx = Pick<Draw, "round_type" | "program" | "category">;

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
        "inline-flex items-center rounded-full font-semibold tracking-tight",
        BADGE_TONE_CLASS[badgeTone(draw)],
        size === "lg" ? "px-4 py-2 text-xl md:text-3xl" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      {roundLabel(draw)}
    </span>
  );
}
