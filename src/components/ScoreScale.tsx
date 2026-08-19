import { useMemo } from "react";
import type { Draw } from "@/data/round-types";

// The scale zooms to whichever range is actually interesting — a tight
// window around (cutoff, score) when both are present, or the full pool
// range when no score is entered. Bounds stay within [ABS_MIN, ABS_MAX] so
// the reading never becomes misleading.

const ABS_MIN = 300;
const ABS_MAX = 800;
const MIN_RANGE = 100; // never zoom tighter than 100 CRS points

interface View {
  min: number;
  max: number;
  ticks: number[];
}

function computeView(score: number | null, cutoff: number): View {
  if (score === null) {
    return { min: ABS_MIN, max: ABS_MAX, ticks: [300, 400, 500, 600, 700, 800] };
  }

  const lo = Math.min(score, cutoff);
  const hi = Math.max(score, cutoff);
  const gap = hi - lo;

  // Target visible range: at least MIN_RANGE, otherwise ~3x the gap so the
  // markers sit near the middle with breathing room on both sides.
  const targetRange = Math.max(MIN_RANGE, gap * 3);
  const center = (lo + hi) / 2;

  let rawMin = center - targetRange / 2;
  let rawMax = center + targetRange / 2;

  // Clamp to absolute bounds but push the opposite edge outward to preserve
  // the visible range where possible.
  if (rawMin < ABS_MIN) {
    rawMax = Math.min(ABS_MAX, rawMax + (ABS_MIN - rawMin));
    rawMin = ABS_MIN;
  }
  if (rawMax > ABS_MAX) {
    rawMin = Math.max(ABS_MIN, rawMin - (rawMax - ABS_MAX));
    rawMax = ABS_MAX;
  }

  // Round to clean tick boundaries (multiples of 25).
  const min = Math.max(ABS_MIN, Math.floor(rawMin / 25) * 25);
  const max = Math.min(ABS_MAX, Math.ceil(rawMax / 25) * 25);

  const range = max - min;
  const step = range >= 400 ? 100 : range >= 200 ? 50 : 25;
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= max; t += step) ticks.push(t);

  return { min, max, ticks };
}

export function ScoreScale({
  cutoffDraw,
  score,
  tone = "light",
}: {
  cutoffDraw: Draw;
  score: number | null;
  tone?: "light" | "dark";
}) {
  const view = useMemo(
    () => computeView(score, cutoffDraw.cutoff_score),
    [score, cutoffDraw.cutoff_score],
  );

  const toPct = (v: number) =>
    Math.min(100, Math.max(0, ((v - view.min) / (view.max - view.min)) * 100));

  const cutoffPct = toPct(cutoffDraw.cutoff_score);
  const scorePct = score != null ? toPct(score) : null;

  const ruleColor = tone === "dark" ? "rgba(246,241,232,0.35)" : "var(--rule)";
  const cutoffColor = tone === "dark" ? "var(--paper)" : "var(--brand)";
  const tickText = tone === "dark" ? "rgba(246,241,232,0.6)" : "var(--muted-foreground)";
  const dotRing = tone === "dark" ? "var(--brand)" : "var(--paper)";

  return (
    <div className="relative">
      <div className="relative h-px w-full" style={{ backgroundColor: ruleColor }}>
        {view.ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 h-1.5 w-px"
            style={{ left: `${toPct(t)}%`, backgroundColor: ruleColor }}
          />
        ))}

        {/* cutoff marker */}
        <span
          className="absolute -top-1.5 h-3 w-px transition-[left] duration-300 ease-out"
          style={{ left: `${cutoffPct}%`, backgroundColor: cutoffColor }}
        />

        {/* score marker */}
        {scorePct != null && (
          <span
            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border transition-[left] duration-300 ease-out"
            style={{
              left: `${scorePct}%`,
              backgroundColor: "var(--accent)",
              borderColor: dotRing,
            }}
          />
        )}
      </div>

      <div className="relative mt-1 h-3">
        {view.ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 text-[0.65rem] tabular-nums"
            style={{ left: `${toPct(t)}%`, color: tickText }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export { ABS_MIN as SCALE_MIN, ABS_MAX as SCALE_MAX };
