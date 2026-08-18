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
    <div className="relative">
      <div className="relative h-px w-full bg-rule">
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute top-0 h-1.5 w-px bg-rule"
            style={{ left: `${clampPct(t)}%` }}
          />
        ))}

        {/* cutoff marker */}
        <span
          className="absolute -top-1.5 h-3 w-px bg-brand"
          style={{ left: `${cutoffPct}%` }}
        />

        {/* score marker */}
        {scorePct != null && (
          <span
            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border border-[var(--paper)]"
            style={{ left: `${scorePct}%`, backgroundColor: "var(--accent)" }}
          />
        )}
      </div>

      <div className="relative mt-1 h-3">
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
    </div>
  );
}

export { MIN as SCALE_MIN, MAX as SCALE_MAX };
