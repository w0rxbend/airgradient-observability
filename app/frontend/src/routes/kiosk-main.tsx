import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import type { JSX } from "solid-js";
import type { CurrentMetric, CurrentResponse } from "../lib/backend";
import { fetchCurrent } from "../lib/backend";
import { overallScore, scoreStatus, type Status } from "../lib/thresholds";
import "../kiosk-main-material.css";

const REFRESH_MS = 5_000;
const METRIC_ORDER = ["co2", "pm25", "voc", "nox", "temperature", "humidity"];

const METRIC_TONE: Record<string, string> = {
  co2: "#3f6fd9",
  pm25: "#b26a00",
  voc: "#7750a6",
  nox: "#9c4328",
  temperature: "#ba1a1a",
  humidity: "#006a6a",
};

const METRIC_ICON: Record<string, string> = {
  co2: "cloud",
  pm25: "grain",
  voc: "bubble",
  nox: "bolt",
  temperature: "thermostat",
  humidity: "water",
};

export default function KioskMain() {
  const [tick, setTick] = createSignal(0);
  const [latest, setLatest] = createSignal<CurrentResponse>();

  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));

  const [current] = createResource(tick, () => fetchCurrent());

  createEffect(() => {
    const next = current();
    if (next) setLatest(next);
  });

  const displayed = createMemo(() => latest());
  const degraded = createMemo(() => Boolean(current.error && displayed()));
  const metrics = createMemo(() => sortMetrics(displayed()?.metrics ?? []));
  const score = createMemo(() =>
    overallScore(metrics().map((metric) => ({ status: metric.status as Status })))
  );
  const status = createMemo(() => scoreStatus(score()));
  const temperature = createMemo(() => findMetric(metrics(), "temperature"));
  const humidity = createMemo(() => findMetric(metrics(), "humidity"));
  const co2 = createMemo(() => findMetric(metrics(), "co2"));
  const pm25 = createMemo(() => findMetric(metrics(), "pm25"));
  const voc = createMemo(() => findMetric(metrics(), "voc"));
  const nox = createMemo(() => findMetric(metrics(), "nox"));

  const lastSeen = createMemo(() => {
    const ts = displayed()?.timestamp;
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  return (
    <main class="mk-shell" aria-label="AirGradient kiosk overview">
      <header class="mk-topbar">
        <div class="mk-brand">
          <span class="mk-brand-mark" aria-hidden="true">
            <MaterialIcon name="dashboard" />
          </span>
          <div>
            <p class="mk-label">AirGradient ONE</p>
            <h1>Indoor Air Dashboard</h1>
          </div>
        </div>

        <div class={`mk-sync ${degraded() ? "is-stale" : ""}`}>
          <span class="mk-sync-dot" />
          <div>
            <span>{degraded() ? "Last good sample" : "Live sample"}</span>
            <strong>{lastSeen()}</strong>
          </div>
        </div>
      </header>

      <Switch>
        <Match when={current.loading && !displayed()}>
          <LoadingBoard />
        </Match>
        <Match when={current.error && !displayed()}>
          <section class="mk-error" role="status">
            <MaterialIcon name="warning" />
            <div>
              <strong>Cannot reach backend</strong>
              <span>Waiting for the next successful sample.</span>
            </div>
          </section>
        </Match>
        <Match when={displayed()}>
          <section class="mk-layout">
            <ScorePanel score={score()} status={status()} />

            <section class="mk-column mk-comfort" aria-label="Comfort readings">
              <SectionHeader icon="home" label="Comfort" title="Room conditions" />
              <div class="mk-split">
                <Show when={temperature()}>{(metric) => <LargeMetric metric={metric()} />}</Show>
                <Show when={humidity()}>{(metric) => <LargeMetric metric={metric()} />}</Show>
              </div>
            </section>

            <section class="mk-column mk-pollutants" aria-label="Pollutant readings">
              <SectionHeader icon="science" label="Pollutants" title="Air composition" />
              <div class="mk-pollutant-grid">
                <Show when={co2()}>{(metric) => <MetricCard metric={metric()} prominent />}</Show>
                <Show when={pm25()}>{(metric) => <MetricCard metric={metric()} />}</Show>
                <Show when={voc()}>{(metric) => <MetricCard metric={metric()} />}</Show>
                <Show when={nox()}>{(metric) => <MetricCard metric={metric()} />}</Show>
              </div>
            </section>

            <section class="mk-column mk-all" aria-label="All current readings">
              <SectionHeader icon="sensors" label="Sensors" title="Current metrics" />
              <div class="mk-list">
                <For each={metrics()}>{(metric) => <MetricRow metric={metric} />}</For>
              </div>
            </section>
          </section>
        </Match>
      </Switch>
    </main>
  );
}

function ScorePanel(props: { score: number; status: Status }) {
  return (
    <section class={`mk-score-card ${props.status}`}>
      <div class="mk-score-head">
        <SectionHeader icon="air" label="Overall" title="Air quality" />
        <StatusChip status={props.status} />
      </div>

      <div
        class="mk-score-ring"
        style={{ "--score": `${props.score}%` } as JSX.CSSProperties}
        aria-label={`Air score ${props.score}`}
      >
        <div class="mk-score-ring-inner">
          <strong>{props.score}</strong>
          <span>{statusText(props.status)}</span>
        </div>
      </div>

      <div class="mk-score-scale" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function LargeMetric(props: { metric: CurrentMetric }) {
  return (
    <article
      class={`mk-large-card ${props.metric.status}`}
      style={toneStyle(props.metric)}
    >
      <div class="mk-card-icon">
        <MetricIcon metric={props.metric} />
      </div>
      <div class="mk-large-value">
        <span>{shortLabel(props.metric)}</span>
        <strong>
          {formatValue(props.metric.value)}
          <small>{props.metric.unit}</small>
        </strong>
      </div>
      <ProgressBar metric={props.metric} />
    </article>
  );
}

function MetricCard(props: { metric: CurrentMetric; prominent?: boolean }) {
  return (
    <article
      class={`mk-card ${props.metric.status} ${props.prominent ? "is-prominent" : ""}`}
      style={toneStyle(props.metric)}
    >
      <header>
        <div class="mk-card-icon">
          <MetricIcon metric={props.metric} />
        </div>
        <StatusChip status={props.metric.status as Status} compact />
      </header>
      <div class="mk-card-title">{props.metric.label}</div>
      <div class="mk-card-value">
        {formatValue(props.metric.value)}
        <small>{props.metric.unit}</small>
      </div>
      <ProgressBar metric={props.metric} />
    </article>
  );
}

function MetricRow(props: { metric: CurrentMetric }) {
  return (
    <article class="mk-row" style={toneStyle(props.metric)}>
      <div class="mk-row-leading">
        <span class="mk-row-icon">
          <MetricIcon metric={props.metric} />
        </span>
        <div>
          <strong>{props.metric.label}</strong>
          <span>{statusText(props.metric.status as Status)}</span>
        </div>
      </div>
      <div class="mk-row-value">
        {formatValue(props.metric.value)}
        <small>{props.metric.unit}</small>
      </div>
    </article>
  );
}

function SectionHeader(props: { icon: string; label: string; title: string }) {
  return (
    <header class="mk-section-header">
      <span class="mk-section-icon" aria-hidden="true">
        <MaterialIcon name={props.icon} />
      </span>
      <div>
        <span>{props.label}</span>
        <strong>{props.title}</strong>
      </div>
    </header>
  );
}

function StatusChip(props: { status: Status; compact?: boolean }) {
  return (
    <span class={`mk-chip ${props.status} ${props.compact ? "compact" : ""}`}>
      {statusText(props.status)}
    </span>
  );
}

function ProgressBar(props: { metric: CurrentMetric }) {
  return (
    <div class="mk-progress" aria-hidden="true">
      <span style={{ width: `${Math.round(percent(props.metric) * 100)}%` }} />
    </div>
  );
}

function LoadingBoard() {
  return (
    <section class="mk-loading" aria-busy="true">
      <For each={Array.from({ length: 8 })}>{() => <div />}</For>
    </section>
  );
}

function MetricIcon(props: { metric: CurrentMetric }) {
  return <MaterialIcon name={METRIC_ICON[props.metric.key] ?? "sensors"} />;
}

function MaterialIcon(props: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <Switch fallback={<path d="M5 12h14M12 5v14" />}>
        <Match when={props.name === "dashboard"}>
          <path d="M4 5a1 1 0 0 1 1-1h6v7H4zM13 4h6a1 1 0 0 1 1 1v4h-7zM4 13h7v7H5a1 1 0 0 1-1-1zM13 11h7v8a1 1 0 0 1-1 1h-6z" />
        </Match>
        <Match when={props.name === "air"}>
          <path d="M4 8h10a3 3 0 1 0-3-3" />
          <path d="M3 12h16a3 3 0 1 1-3 3" />
          <path d="M5 17h7a2 2 0 1 1-2 2" />
        </Match>
        <Match when={props.name === "home"}>
          <path d="m3 11 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </Match>
        <Match when={props.name === "science"}>
          <path d="M10 3h4M11 3v5l-6 10a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3L13 8V3" />
          <path d="M8 15h8" />
        </Match>
        <Match when={props.name === "sensors"}>
          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
          <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
        </Match>
        <Match when={props.name === "warning"}>
          <path d="M12 3 2 21h20z" />
          <path d="M12 9v5M12 17h.01" />
        </Match>
        <Match when={props.name === "thermostat"}>
          <path d="M10 4a2 2 0 0 1 4 0v8.2a5 5 0 1 1-4 0z" />
          <path d="M12 7v8" />
        </Match>
        <Match when={props.name === "water"}>
          <path d="M12 3C8 8 6 11 6 15a6 6 0 0 0 12 0c0-4-2-7-6-12z" />
        </Match>
        <Match when={props.name === "cloud"}>
          <path d="M6 18h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.2 1.8A3.2 3.2 0 0 0 6 18z" />
        </Match>
        <Match when={props.name === "grain"}>
          <circle cx="7" cy="8" r="1.5" />
          <circle cx="14" cy="6" r="1.5" />
          <circle cx="17" cy="13" r="1.5" />
          <circle cx="8" cy="16" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
        </Match>
        <Match when={props.name === "bubble"}>
          <circle cx="8" cy="14" r="4" />
          <circle cx="15" cy="8" r="3" />
          <circle cx="17" cy="17" r="2" />
        </Match>
        <Match when={props.name === "bolt"}>
          <path d="m13 2-8 12h6l-1 8 9-13h-6z" />
        </Match>
      </Switch>
    </svg>
  );
}

function sortMetrics(metrics: CurrentMetric[]) {
  return [...metrics].sort((a, b) => METRIC_ORDER.indexOf(a.key) - METRIC_ORDER.indexOf(b.key));
}

function findMetric(metrics: CurrentMetric[], key: string) {
  return metrics.find((metric) => metric.key === key);
}

function percent(metric: CurrentMetric) {
  if (metric.value === null) return 0;
  const range = metric.max - metric.min || 1;
  return Math.max(0, Math.min(1, (metric.value - metric.min) / range));
}

function toneStyle(metric: CurrentMetric) {
  return { "--metric-tone": METRIC_TONE[metric.key] ?? "#3f6fd9" } as JSX.CSSProperties;
}

function formatValue(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function shortLabel(metric: CurrentMetric) {
  if (metric.key === "temperature") return "Temperature";
  if (metric.key === "humidity") return "Humidity";
  return metric.label;
}

function statusText(status: Status | CurrentMetric["status"]) {
  if (status === "good") return "Good";
  if (status === "warning") return "Watch";
  if (status === "critical") return "Alert";
  return "No data";
}
