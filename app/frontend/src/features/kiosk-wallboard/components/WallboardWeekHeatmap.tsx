import { For } from "solid-js";
import type { WeekRow, FlatCell } from "../pageViewModel";

type Props = { matrix: WeekRow[] };

export function WallboardWeekHeatmap(props: Props) {
  function pmColor(v: number): string {
    if (v === 0) return "rgba(255,255,255,0.04)";
    if (v < 12)  return "var(--ks-aqi-1)";
    if (v < 25)  return "var(--ks-aqi-2)";
    if (v < 40)  return "var(--ks-aqi-3)";
    if (v < 60)  return "var(--ks-aqi-4)";
    if (v < 90)  return "var(--ks-aqi-5)";
    return "var(--ks-aqi-6)";
  }

  function cellOpacity(v: number): number {
    return v === 0 ? 1 : 0.25 + Math.min(0.75, v / 80);
  }

  // Flatten rows so CSS grid sees all cells as direct children.
  const flat = (): FlatCell[] => {
    const out: FlatCell[] = [];
    for (const row of props.matrix) {
      out.push({ type: "label", day: row.day });
      for (const v of row.hours) out.push({ type: "cell", v });
    }
    return out;
  };

  const totalObs = () =>
    props.matrix.reduce((sum, r) => sum + r.hours.filter(v => v > 0).length, 0);

  const avgPm25 = () => {
    const vals = props.matrix.flatMap(r => r.hours.filter(v => v > 0));
    return vals.length
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : "—";
  };

  return (
    <div class="ks-card ks-week">
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title"><span class="ks-index">/ 11</span> 7-day · hourly PM2.5</div>
        <span class="ks-card-eyebrow">µg/m³ · 7d</span>
      </div>

      <div class="ks-heatmap">
        <For each={flat()}>
          {(cell) =>
            cell.type === "label"
              ? <div class="ks-heatmap-label">{cell.day}</div>
              : <div
                  class="ks-heatmap-cell"
                  style={{ background: pmColor(cell.v), opacity: String(cellOpacity(cell.v)) }}
                />
          }
        </For>
      </div>

      <div class="ks-heatmap-hours">
        <For each={[0, 3, 6, 9, 12, 15, 18, 21]}>
          {(h) => <span>{String(h).padStart(2, "0")}</span>}
        </For>
      </div>

      <div class="ks-heatmap-legend">
        <div class="ks-legend-row">
          <For each={[1, 2, 3, 4, 5, 6] as const}>
            {(i) => (
              <span class="ks-legend-item">
                <span style={{
                  display: "inline-block",
                  width: "10px", height: "10px",
                  "border-radius": "2px",
                  background: `var(--ks-aqi-${i})`,
                }} />
                {["0", "12", "25", "40", "60", "90+"][i - 1]}
              </span>
            )}
          </For>
        </div>
        <span class="ks-heatmap-count">{totalObs()} obs · avg {avgPm25()} µg/m³</span>
      </div>
    </div>
  );
}
