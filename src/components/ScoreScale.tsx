import { RoundBadge } from "@/components/RoundBadge";
import type { Draw } from "@/data/round-types";

const MIN = 300;
const MAX = 800;
const TICKS = [300, 400, 500, 600, 700, 800];

const clampPct = (n: number) => Math.min(100, Math.max(0, ((n - MIN) / (MAX - MIN)) * 100));

export function ScoreScale({ cutoffDraw, score }: { cutoffDraw: Draw; score: number | null }) {
  const cutoffPct = clampPct(cutoffDraw.cutoff_score);
  const scorePct = score != null ? clampPct(score) : null;

  return (
    <div className="pt-8">
      <div className="relative">
        <div className="relative h-px w-full bg-rule">
          {/* ticks */}
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-0 h-1.5 w-px bg-rule"
              style={{ left: `${clampPct(t)}%` }}
            />
          ))}

          {/* cutoff marker */}
          <span
            className="absolute -top-2 h-4 w-0.5 bg-brand"
            style={{ left: `${cutoffPct}%` }}
          />
          {scorePct != null && (
            <span
              className="absolute -top-2 h-4 w-0.5"
              style={{ left: `${scorePct}%`, backgroundColor: "var(--accent)" }}
            />
          )}
        </div>

        <div className="relative mt-2 h-4">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[0.65rem] text-muted-foreground tabular-nums"
              style={{ left: `${clampPct(t)}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RoundBadge draw={cutoffDraw} />
          <span className="text-xs text-muted-foreground">latest round</span>
        </div>
      </div>
    </div>
  );
}

export { MIN as SCALE_MIN, MAX as SCALE_MAX };
