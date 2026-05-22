import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { DailyScore } from "../lib/backend";
import { toDateStr } from "../lib/backend";

type Props = {
  scores: DailyScore[];
  selected: Date | null;
  onSelect: (date: Date | null) => void;
};

type Cell = {
  date: Date;
  dateStr: string;
  dow: number;
  weekIdx: number;
  isFuture: boolean;
  isToday: boolean;
};

type TooltipState = {
  dateLabel: string;
  score: number | null;
  status: string | null;
  x: number;
  y: number;
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CELL = 22;
const GAP  = 4;
const STEP = CELL + GAP;
const DOW_COL_PX = 36;

export function AirQualityHeatmap(props: Props) {
  let scrollRef: HTMLDivElement | undefined;
  let wrapRef: HTMLDivElement | undefined;

  const [availableWidth, setAvailableWidth] = createSignal(0);
  const [tooltip, setTooltip] = createSignal<TooltipState | null>(null);

  onMount(() => {
    if (!scrollRef) return;
    setAvailableWidth(scrollRef.clientWidth);
    const ro = new ResizeObserver((entries) => {
      setAvailableWidth(entries[0].contentRect.width);
    });
    ro.observe(scrollRef);
    onCleanup(() => ro.disconnect());
  });

  const weeksToShow = createMemo(() => {
    const w = availableWidth();
    if (w <= 0) return 14;
    return Math.max(4, Math.floor((w - DOW_COL_PX) / STEP));
  });

  const cells = createMemo<Cell[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);
    const todayDow = (today.getDay() + 6) % 7;
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - todayDow - (weeksToShow() - 1) * 7);

    const list: Cell[] = [];
    for (let wi = 0; wi < weeksToShow(); wi++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + wi * 7 + dow);
        const ds = toDateStr(d);
        list.push({
          date: d,
          dateStr: ds,
          dow,
          weekIdx: wi,
          isFuture: d > today,
          isToday: ds === todayStr,
        });
      }
    }
    return list;
  });

  const scoreMap = createMemo(() => {
    const m = new Map<string, DailyScore>();
    for (const s of props.scores) m.set(s.dateStr, s);
    return m;
  });

  const monthLabels = createMemo(() => {
    const seen = new Set<string>();
    const labels: Array<{ month: string; x: number }> = [];
    for (const cell of cells()) {
      if (cell.dow !== 0) continue;
      const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        labels.push({
          month: cell.date.toLocaleDateString([], {
            month: "short",
            year: cell.weekIdx < 2 ? "numeric" : undefined,
          }),
          x: cell.weekIdx * STEP,
        });
      }
    }
    return labels;
  });

  const stats = createMemo(() => {
    const s = props.scores;
    if (s.length === 0) return null;
    const avg = Math.round(s.reduce((a, b) => a + b.score, 0) / s.length);
    return { count: s.length, avg };
  });

  const isSelected = (ds: string) =>
    props.selected ? toDateStr(props.selected) === ds : false;

  function handleClick(cell: Cell) {
    if (cell.isFuture) return;
    props.onSelect(isSelected(cell.dateStr) ? null : cell.date);
    setTooltip(null);
  }

  function handleEnter(e: MouseEvent, cell: Cell) {
    if (cell.isFuture || !wrapRef) return;
    const entry = scoreMap().get(cell.dateStr);
    const cellEl = e.currentTarget as HTMLElement;
    const cr = cellEl.getBoundingClientRect();
    const wr = wrapRef.getBoundingClientRect();
    setTooltip({
      dateLabel: cell.date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      score: entry?.score ?? null,
      status: entry?.status ?? null,
      x: cr.left - wr.left + CELL / 2,
      y: cr.top - wr.top - 8,
    });
  }

  const gridWidth = () => weeksToShow() * STEP - GAP;
  const gridHeight = 7 * STEP - GAP;

  return (
    <div class="heatmap-wrap glass-card">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div class="heatmap-header">
        <div class="heatmap-header-left">
          <p class="heatmap-eyebrow">Air quality history</p>
          <div class="heatmap-header-meta">
            <Show when={stats()} fallback={<span class="heatmap-subtitle">Click a day to view details</span>}>
              <span class="heatmap-subtitle">
                <span class="heatmap-stat">{stats()!.count}</span> days tracked
                {" · "}avg score{" "}
                <span
                  class="heatmap-stat"
                  style={{ color: scoreToColor(stats()!.avg) }}
                >
                  {stats()!.avg}
                </span>
              </span>
            </Show>
          </div>
        </div>
        <HeatmapLegend />
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      <div class="heatmap-scroll" ref={scrollRef}>
        <div class="heatmap-layout">
          {/* DOW labels */}
          <div class="heatmap-dow-col" style={{ height: `${gridHeight}px` }}>
            <For each={DOW_LABELS}>
              {(label) => (
                <div
                  class="heatmap-dow-label"
                  style={{ height: `${CELL}px`, "margin-bottom": `${GAP}px` }}
                >
                  {label}
                </div>
              )}
            </For>
          </div>

          {/* Grid area */}
          <div style={{ position: "relative", flex: "1 1 0" }} ref={wrapRef}>
            {/* Month labels */}
            <div class="heatmap-months" style={{ width: `${gridWidth()}px` }}>
              <For each={monthLabels()}>
                {(lbl) => (
                  <span class="heatmap-month-label" style={{ left: `${lbl.x}px` }}>
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
                width: `${gridWidth()}px`,
              }}
              onMouseLeave={() => setTooltip(null)}
              aria-label="Air quality calendar"
              role="grid"
            >
              <For each={cells()}>
                {(cell) => {
                  const entry = () => scoreMap().get(cell.dateStr);
                  const cellColor = () =>
                    cell.isFuture
                      ? "rgba(255,255,255,0.025)"
                      : scoreToColor(entry()?.score ?? -1);

                  return (
                    <div
                      role="gridcell"
                      class={[
                        "heatmap-cell",
                        cell.isToday ? "today" : "",
                        isSelected(cell.dateStr) ? "selected" : "",
                        cell.isFuture ? "future" : "",
                        !entry() && !cell.isFuture ? "empty" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        background: cellColor(),
                        "--cell-glow": cellColor(),
                      } as any}
                      aria-label={cell.date.toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
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
              {(t) => (
                <div
                  class="heatmap-tooltip"
                  style={{ left: `${t().x}px`, top: `${t().y}px` }}
                >
                  <div class="heatmap-tooltip-date">{t().dateLabel}</div>
                  <div class="heatmap-tooltip-score">
                    {t().score !== null ? (
                      <>
                        <span
                          class="heatmap-tooltip-dot"
                          style={{ background: scoreToColor(t().score!) }}
                        />
                        <span>{t().score}/100</span>
                        <span class="heatmap-tooltip-status">{t().status}</span>
                      </>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>No data</span>
                    )}
                  </div>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div class="heatmap-legend">
      <span class="heatmap-legend-label">Less</span>
      {([-1, 18, 42, 68, 90] as const).map((s) => (
        <div class="heatmap-legend-dot" style={{ background: scoreToColor(s) }} />
      ))}
      <span class="heatmap-legend-label">More</span>
    </div>
  );
}

export function scoreToColor(score: number): string {
  if (score < 0) return "rgba(255,255,255,0.06)";
  if (score === 0) return "hsla(0, 85%, 42%, 0.88)";
  const hue = (score / 100) * 118;
  const sat = 78;
  const lit = 37 + (score / 100) * 5;
  const alpha = 0.62 + (score / 100) * 0.28;
  return `hsla(${hue.toFixed(0)}, ${sat}%, ${lit.toFixed(0)}%, ${alpha.toFixed(2)})`;
}
