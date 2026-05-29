import { createMemo, For, Match, Show, Switch } from "solid-js";
import type { JSX } from "solid-js";
import type { CurrentMetric } from "../../shared/api/backendClient";
import { overallScore, scoreStatus, type Status } from "../../shared/domain/airQuality";
import type { MetricKey } from "../../shared/domain/metrics";
import "./kioskMainMaterial.css";
import { createKioskMainData } from "./createKioskMainData";
import { MaterialIcon } from "./MaterialIcon";
import {
  displayMetricValue,
  findMetric,
  kioskStatusLabel,
  metricIconName,
  metricToneStyle,
  progressPercent,
  shortMetricLabel,
  sortKioskMetrics,
} from "./metricPresentation";

export default function KioskMainPage() {
  const data = createKioskMainData();

  const current = data.current;
  const displayed = data.displayed;
  const metrics = createMemo(() => sortKioskMetrics(displayed()?.metrics ?? []));
  const score = createMemo(() => overallScore(metrics().map((metric) => ({ status: metric.status }))));
  const status = createMemo(() => scoreStatus(score()));

  const temperature = createMemo(() => findMetric(metrics(), "temperature"));
  const humidity = createMemo(() => findMetric(metrics(), "humidity"));
  const co2 = createMemo(() => findMetric(metrics(), "co2"));
  const pm25 = createMemo(() => findMetric(metrics(), "pm25"));
  const voc = createMemo(() => findMetric(metrics(), "voc"));
  const nox = createMemo(() => findMetric(metrics(), "nox"));

  const lastSeen = createMemo(() => formatLastSeen(displayed()?.timestamp));

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

        <div class={`mk-sync ${data.hasStaleCurrent() ? "is-stale" : ""}`}>
          <span class="mk-sync-dot" />
          <div>
            <span>{data.hasStaleCurrent() ? "Last good sample" : "Live sample"}</span>
            <strong>{lastSeen()}</strong>
          </div>
        </div>
      </header>

      <Switch>
        <Match when={current.loading && !displayed()}>
          <LoadingBoard />
        </Match>
        <Match when={current.error && !displayed()}>
          <BackendError />
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
          <span>{kioskStatusLabel(props.status)}</span>
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
      style={metricToneStyle(props.metric)}
    >
      <div class="mk-card-icon">
        <MetricIcon metric={props.metric} />
      </div>
      <div class="mk-large-value">
        <span>{shortMetricLabel(props.metric)}</span>
        <strong>
          {displayMetricValue(props.metric.value)}
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
      style={metricToneStyle(props.metric)}
    >
      <header>
        <div class="mk-card-icon">
          <MetricIcon metric={props.metric} />
        </div>
        <StatusChip status={props.metric.status} compact />
      </header>
      <div class="mk-card-title">{props.metric.label}</div>
      <div class="mk-card-value">
        {displayMetricValue(props.metric.value)}
        <small>{props.metric.unit}</small>
      </div>
      <ProgressBar metric={props.metric} />
    </article>
  );
}

function MetricRow(props: { metric: CurrentMetric }) {
  return (
    <article class="mk-row" style={metricToneStyle(props.metric)}>
      <div class="mk-row-leading">
        <span class="mk-row-icon">
          <MetricIcon metric={props.metric} />
        </span>
        <div>
          <strong>{props.metric.label}</strong>
          <span>{kioskStatusLabel(props.metric.status)}</span>
        </div>
      </div>
      <div class="mk-row-value">
        {displayMetricValue(props.metric.value)}
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
      {kioskStatusLabel(props.status)}
    </span>
  );
}

function ProgressBar(props: { metric: CurrentMetric }) {
  return (
    <div class="mk-progress" aria-hidden="true">
      <span style={{ width: `${Math.round(progressPercent(props.metric) * 100)}%` }} />
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

function BackendError() {
  return (
    <section class="mk-error" role="status">
      <MaterialIcon name="warning" />
      <div>
        <strong>Cannot reach backend</strong>
        <span>Waiting for the next successful sample.</span>
      </div>
    </section>
  );
}

function MetricIcon(props: { metric: CurrentMetric }) {
  return <MaterialIcon name={metricIconName[props.metric.key as MetricKey] ?? "sensors"} />;
}

function formatLastSeen(timestamp: number | null | undefined) {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
