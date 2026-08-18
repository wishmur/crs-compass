import type { Draw } from "@/data/round-types";

const MIN = 300;
const MAX = 800;
const TICKS = [300, 400, 500, 600, 700, 800];

const clampPct = (n: number) => Math.min(100, Math.max(0, ((n - MIN) / (MAX - MIN)) * 100));

export function ScoreScale({
  cutoffDraw,
  score,
  tone = "light",
}: {
  cutoffDraw: Draw;
  score: number | null;
  tone?: "light" | "dark";
}) {
  const cutoffPct = clampPct(cutoffDraw.cutoff_score);
  const scorePct = score != null ? clampPct(score) : null;

  const ruleColor = tone === "dark" ? "rgba(246,241,232,0.35)" : "var(--rule)";
  const cutoffColor = tone === "dark" ? "var(--paper)" : "var(--brand)";
  const tickText = tone === "dark" ? "rgba(246,241,232,0.6)" : "var(--muted-foreground)";
  const dotRing = tone === "dark" ? "var(--brand)" : "var(--paper)";

  return (
    <div className="relative">
      <div className="relative h-px w-full" style={{ backgroundColor: ruleColor }}>
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute top-0 h-1.5 w-px"
            style={{ left: `${clampPct(t)}%`, backgroundColor: ruleColor }}
          />
        ))}

        {/* cutoff marker */}
        <span
          className="absolute -top-1.5 h-3 w-px"
          style={{ left: `${cutoffPct}%`, backgroundColor: cutoffColor }}
        />

        {/* score marker */}
        {scorePct != null && (
          <span
            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border"
            style={{
              left: `${scorePct}%`,
              backgroundColor: "var(--accent)",
              borderColor: dotRing,
            }}
          />
        )}
      </div>

      <div className="relative mt-1 h-3">
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 text-[0.65rem] tabular-nums"
            style={{ left: `${clampPct(t)}%`, color: tickText }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export { MIN as SCALE_MIN, MAX as SCALE_MAX };
