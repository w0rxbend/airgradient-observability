import { createMemo, For } from "solid-js";
import type { CurrentMetric } from "../lib/backend";
import {
  overallScore,
  scoreStatus,
  airQualityRecommendation,
  statusLabel,
  type Status,
} from "../lib/thresholds";
import { StatusPill } from "./StatusPill";

type Props = { metrics: CurrentMetric[] };

// Raw hex so we can build CSS gradients without `var()`
const ACCENT_HEX: Record<Status, string> = {
  good:     "#22c55e",
  warning:  "#f59e0b",
  critical: "#ef4444",
  empty:    "#475569",
};

const STATUS_ICON: Record<Status, string> = {
  good:     "🌿",
  warning:  "💨",
  critical: "🚨",
  empty:    "📡",
};

const STATUS_DESC: Record<Status, string> = {
  good:     "Healthy air",
  warning:  "Moderate",
  critical: "Poor air",
  empty:    "No data",
};

export function AirQualityScore(props: Props) {
  const score  = createMemo(() => overallScore(props.metrics.map((m) => ({ status: m.status as Status }))));
  const status = createMemo(() => scoreStatus(score()));
  const hex    = createMemo(() => ACCENT_HEX[status()]);

  const recommendation = createMemo(() =>
    airQualityRecommendation(props.metrics.map((m) => ({ key: m.key, status: m.status as Status })))
  );

  return (
    <div
      class="aq-hero"
      style={{
        background: `linear-gradient(145deg, ${hex()}28 0%, ${hex()}0c 55%, transparent 100%)`,
        "border-top": `1px solid ${hex()}30`,
      }}
    >
      {/* Decorative glow blob */}
      <div
        class="aq-hero-blob"
        style={{
          background: `radial-gradient(circle, ${hex()}55 0%, transparent 70%)`,
        }}
      />

      {/* Header row */}
      <div class="aq-hero-header">
        <span class="aq-hero-eyebrow">AQI Score</span>
        <div class="aq-hero-icon-wrap" style={{ background: `${hex()}22`, "border-color": `${hex()}40` }}>
          <span class="aq-hero-icon">{STATUS_ICON[status()]}</span>
        </div>
      </div>

      {/* Score */}
      <div class="aq-hero-score-row">
        <span class="aq-hero-score" style={{ color: hex() }}>
          {score()}
        </span>
        <div class="aq-hero-score-meta">
          <span class="aq-hero-max">/100</span>
          <span class="aq-hero-desc" style={{ color: hex() }}>
            {STATUS_DESC[status()]}
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <p class="aq-hero-rec">{recommendation()}</p>

      {/* Per-metric pills */}
      <div class="aq-hero-pills">
        <For each={props.metrics}>
          {(m) => <StatusPill status={m.status as Status} label={m.label} />}
        </For>
      </div>
    </div>
  );
}
