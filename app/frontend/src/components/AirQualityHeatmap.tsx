import { createMemo, createSignal, For, Show } from "solid-js";
import type { DailyScore } from "../lib/backend";
import { toDateStr } from "../lib/backend";

type Props = {
  scores: DailyScore[];
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  weeks?: number;
};

type Cell = {
  date: Date;
  dateStr: string;
  dow: number;     // 0 = Mon … 6 = Sun
  weekIdx: number; // column index
  isFuture: boolean;
};

const DOW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const CELL = 13; // px
const GAP  = 3;  // px
const STEP = CELL + GAP;

export function AirQualityHeatmap(props: Props) {
  const weeksToShow = () => props.weeks ?? 14;
  let wrapRef: HTMLDivElement | undefined;

  const [tooltip, setTooltip] = createSignal<{
    text: string; x: number; y: number;
  } | null>(null);

  // Build grid cells (oldest Mon → newest Sun)
  const cells = createMemo<Cell[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Mon-first DOW: Sun(0)→6, Mon(1)→0, …
    const todayDow = ((today.getDay() + 6) % 7);
    const gridStart = new Date(today);
    // rewind to the Monday of the oldest week
    gridStart.setDate(today.getDate() - todayDow - (weeksToShow() - 1) * 7);

    const list: Cell[] = [];
    for (let wi = 0; wi < weeksToShow(); wi++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + wi * 7 + dow);
        list.push({
          date: d,
          dateStr: toDateStr(d),
          dow,
          weekIdx: wi,
          isFuture: d > today,
        });
      }
    }
    return list;
  });

  // Score lookup map
  const scoreMap = createMemo(() => {
    const m = new Map<string, DailyScore>();
    for (const s of props.scores) m.set(s.dateStr, s);
    return m;
  });

  // Month label positions
  const monthLabels = createMemo(() => {
    const seen = new Set<string>();
    const labels: Array<{ month: string; x: number }> = [];
    for (const cell of cells()) {
      if (cell.dow !== 0) continue;
      const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        labels.push({
          month: cell.date.toLocaleDateString([], { month: "short", year: cell.weekIdx < 2 ? "numeric" : undefined }),
          x: cell.weekIdx * STEP,
        });
      }
    }
    return labels;
  });

  const isSelected = (dateStr: string) => {
    if (!props.selected) return false;
    return toDateStr(props.selected) === dateStr;
  };

  function handleClick(cell: Cell) {
    if (cell.isFuture) return;
    const alreadySelected = isSelected(cell.dateStr);
    props.onSelect(alreadySelected ? null : cell.date);
    setTooltip(null);
  }

  function handleEnter(e: MouseEvent, cell: Cell) {
    if (cell.isFuture || !wrapRef) return;
    const score = scoreMap().get(cell.dateStr);
    const label = cell.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const scoreText = score ? `${score.score}/100` : "No data";
    const cellEl = e.currentTarget as HTMLElement;
    const cr = cellEl.getBoundingClientRect();
    const wr = wrapRef.getBoundingClientRect();
    setTooltip({
      text: `${label} — AQ ${scoreText}`,
      x: cr.left - wr.left + CELL / 2,
      y: cr.top  - wr.top  - 6,
    });
  }

  const gridWidth = () => weeksToShow() * STEP - GAP;
  const gridHeight = 7 * STEP - GAP;

  return (
    <div class="heatmap-wrap glass-card">
      <div class="heatmap-header">
        <div>
          <p class="heatmap-eyebrow">Air quality history</p>
          <p class="heatmap-subtitle">Click a day to view detailed data</p>
        </div>
        <HeatmapLegend />
      </div>

      <div class="heatmap-scroll">
        <div class="heatmap-layout">
          {/* Day-of-week labels */}
          <div
            class="heatmap-dow-col"
            style={{ height: `${gridHeight}px` }}
          >
            <For each={DOW_LABELS}>
              {(label) => (
                <div class="heatmap-dow-label" style={{ height: `${CELL}px`, "margin-bottom": `${GAP}px` }}>
                  {label}
                </div>
              )}
            </For>
          </div>

          {/* Grid area */}
          <div style={{ position: "relative" }} ref={wrapRef}>
            {/* Month labels */}
            <div class="heatmap-months" style={{ width: `${gridWidth()}px` }}>
              <For each={monthLabels()}>
                {(lbl) => (
                  <span
                    class="heatmap-month-label"
                    style={{ left: `${lbl.x}px` }}
                  >
                    {lbl.month}
                  </span>
                )}
              </For>
            </div>

            {/* Cells */}
            <div
              class="heatmap-cells"
              style={{
                display: "grid",
                "grid-template-rows": `repeat(7, ${CELL}px)`,
                "grid-auto-flow": "column",
                "grid-auto-columns": `${CELL}px`,
                gap: `${GAP}px`,
              }}
              onMouseLeave={() => setTooltip(null)}
              aria-label="Air quality calendar"
              role="grid"
            >
              <For each={cells()}>
                {(cell) => {
                  const score = () => scoreMap().get(cell.dateStr);
                  return (
                    <div
                      role="gridcell"
                      class={[
                        "heatmap-cell",
                        cell.isFuture ? "future" : "",
                        isSelected(cell.dateStr) ? "selected" : "",
                      ].filter(Boolean).join(" ")}
                      style={{
                        background: cell.isFuture
                          ? "rgba(255,255,255,0.02)"
                          : scoreToColor(score()?.score ?? -1),
                        cursor: cell.isFuture ? "default" : "pointer",
                      }}
                      aria-label={cell.date.toLocaleDateString([], {
                        weekday: "long", month: "long", day: "numeric"
                      })}
                      aria-selected={isSelected(cell.dateStr)}
                      onClick={() => handleClick(cell)}
                      onMouseEnter={(e) => handleEnter(e, cell)}
                    />
                  );
                }}
              </For>
            </div>

            {/* Tooltip */}
            <Show when={tooltip()}>
              <div
                class="heatmap-tooltip"
                style={{
                  left: `${tooltip()!.x}px`,
                  top: `${tooltip()!.y}px`,
                }}
              >
                {tooltip()!.text}
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div class="heatmap-legend" aria-label="Color legend">
      <span class="heatmap-legend-label">Poor</span>
      <div class="heatmap-legend-swatch" style={{ background: scoreToColor(5)   }} />
      <div class="heatmap-legend-swatch" style={{ background: scoreToColor(30)  }} />
      <div class="heatmap-legend-swatch" style={{ background: scoreToColor(55)  }} />
      <div class="heatmap-legend-swatch" style={{ background: scoreToColor(80)  }} />
      <div class="heatmap-legend-swatch" style={{ background: scoreToColor(100) }} />
      <span class="heatmap-legend-label">Good</span>
      <div class="heatmap-legend-swatch" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span class="heatmap-legend-label">No data</span>
    </div>
  );
}

// score=-1 → no data; score=0-100 → color
function scoreToColor(score: number): string {
  if (score < 0) return "rgba(255,255,255,0.06)";
  if (score === 0) return "rgba(239,68,68,0.55)";
  // hue: 0(red) at score=0 → 120(green) at score=100
  const hue = (score / 100) * 120;
  const sat = 72;
  const lit = score > 60 ? 38 : 42;
  const alpha = 0.55 + (score / 100) * 0.3;
  return `hsla(${hue.toFixed(0)}, ${sat}%, ${lit}%, ${alpha.toFixed(2)})`;
}
