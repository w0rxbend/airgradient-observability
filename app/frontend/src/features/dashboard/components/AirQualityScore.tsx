import { createMemo, For } from "solid-js";
import type { CurrentMetric } from "../../../shared/api/backendClient";
import {
  overallScore,
  scoreStatus,
  airQualityRecommendation,
  statusLabel,
  type Status,
} from "../../../shared/domain/airQuality";
import { StatusPill } from "../../../shared/ui/StatusPill";

type Props = { metrics: CurrentMetric[] };

const ACCENT_COLOR: Record<Status, string> = {
  good:     "var(--c-good)",
  warning:  "var(--c-warning)",
  critical: "var(--c-critical)",
  empty:    "var(--c-muted)",
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
  const color  = createMemo(() => ACCENT_COLOR[status()]);

  const recommendation = createMemo(() =>
    airQualityRecommendation(props.metrics.map((m) => ({ key: m.key, status: m.status as Status })))
  );

  return (
    <div
      class="aq-hero"
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${color()} 16%, transparent) 0%, color-mix(in srgb, ${color()} 5%, transparent) 55%, transparent 100%)`,
        "border-top": `1px solid color-mix(in srgb, ${color()} 22%, transparent)`,
      }}
    >
      {/* Decorative glow blob */}
      <div
        class="aq-hero-blob"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${color()} 34%, transparent) 0%, transparent 70%)`,
        }}
      />

      {/* Header row */}
      <div class="aq-hero-header">
        <span class="aq-hero-eyebrow">AQI Score</span>
        <div
          class="aq-hero-icon-wrap"
          style={{
            background: `color-mix(in srgb, ${color()} 14%, transparent)`,
            "border-color": `color-mix(in srgb, ${color()} 25%, transparent)`,
          }}
        >
          <span class="aq-hero-icon">{STATUS_ICON[status()]}</span>
        </div>
      </div>

      {/* Score */}
      <div class="aq-hero-score-row">
        <span class="aq-hero-score" style={{ color: color() }}>
          {score()}
        </span>
        <div class="aq-hero-score-meta">
          <span class="aq-hero-max">/100</span>
          <span class="aq-hero-desc" style={{ color: color() }}>
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
