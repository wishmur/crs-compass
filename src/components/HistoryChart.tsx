import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PNP_SERIES, type Draw, type SeriesDef } from "@/data/round-types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EVENTS, capture } from "@/lib/analytics";

const MAX_SERIES = 4;

function toPoints(draws: Draw[], series: { key: string; matches: (d: Draw) => boolean }[]) {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const d of draws) {
    const s = series.find((x) => x.matches(d));
    if (!s) continue;
    const row = byDate.get(d.draw_date) ?? { date: d.draw_date };
    row[s.key] = d.cutoff_score;
    byDate.set(d.draw_date, row);
  }
  return [...byDate.values()].sort((a, b) => String(a['date']).localeCompare(String(b['date'])));
}

export function HistoryChart({ draws, series }: { draws: Draw[]; series: SeriesDef[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [showPnp, setShowPnp] = useState(false);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const recent = useMemo(() => draws.filter((d) => d.draw_date >= cutoff), [draws, cutoff]);
  const data = useMemo(() => toPoints(recent, series), [recent, series]);
  const pnpData = useMemo(() => toPoints(recent, [PNP_SERIES]), [recent]);

  const tooMany = series.length > MAX_SERIES;

  const toggle = (key: string) => {
    const next = !hidden[key];
    setHidden((h) => ({ ...h, [key]: next }));
    capture(EVENTS.CHART_SERIES_TOGGLED, { series: key, visible: !next });
  };

  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-label">Cutoffs, last 3 years</h2>
        <div className="flex items-center gap-2">
          <Switch
            id="pnp-toggle"
            checked={showPnp}
            onCheckedChange={(v) => {
              setShowPnp(v);
              capture(EVENTS.CHART_SERIES_TOGGLED, { series: "PNP", visible: v });
            }}
          />
          <Label htmlFor="pnp-toggle" className="text-xs text-muted-foreground">
            Show PNP (separate scale)
          </Label>
        </div>
      </div>

      {tooMany ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Too many series to compare visually — narrow the filter to see the chart, or use the table
          below.
        </p>
      ) : !data.length ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No rounds in the last 3 years match these filters.
        </p>
      ) : (
        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                label={{ value: "CRS cutoff", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                onClick={(e) => toggle(String((e as { dataKey?: string }).dataKey ?? ""))}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  hide={hidden[s.key]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showPnp && pnpData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">
            Program-specific · PNP (includes the automatic 600-point nomination bonus)
          </h3>
          <div className="mt-2 h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnpData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey={PNP_SERIES.key}
                  name={PNP_SERIES.label}
                  stroke={PNP_SERIES.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
