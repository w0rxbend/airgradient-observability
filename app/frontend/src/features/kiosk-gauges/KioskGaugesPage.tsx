import { createMemo, Match, Show, Switch } from "solid-js";
import { GaugeAQI } from "../../components/gauges/GaugeAQI";
import { GaugeCO2 } from "../../components/gauges/GaugeCO2";
import { GaugeDewPoint } from "../../components/gauges/GaugeDewPoint";
import { GaugeHum } from "../../components/gauges/GaugeHum";
import { GaugeNOx } from "../../components/gauges/GaugeNOx";
import { GaugePM25 } from "../../components/gauges/GaugePM25";
import { GaugeTVOC } from "../../components/gauges/GaugeTVOC";
import { GaugeTemp } from "../../components/gauges/GaugeTemp";
import { dewPoint } from "../../lib/gauges";
import { pm25ToAqi } from "../../lib/swag";
import { fetchAllRanges, fetchCurrent } from "../../shared/api/backendClient";
import type { MetricKey } from "../../shared/domain/metrics";
import { createPollingResource } from "../../shared/solid/pollingResource";
import { createClock } from "../../shared/time/clock";
import "../../kiosk-gauges.css";

const refreshMs = 5_000;

export default function KioskGaugesPage() {
  const now = createClock();
  const currentMetrics = createPollingResource(fetchCurrent, refreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), refreshMs);

  const current = currentMetrics.resource;
  const currentData = createMemo(() => currentMetrics.latest());
  const historyData = createMemo(() => history.latest());

  const historyMap = createMemo(() => {
    const values: Partial<Record<MetricKey, number[]>> = {};
    for (const response of historyData() ?? []) {
      values[response.metric] = response.points.map(([_timestamp, value]) => value);
    }
    return values;
  });

  const getValue = (key: MetricKey) =>
    currentData()?.metrics.find((metric) => metric.key === key)?.value ?? null;
  const getSeries = (key: MetricKey) => historyMap()[key] ?? [];

  const pm25Val = () => getValue("pm25");
  const co2Val = () => getValue("co2");
  const vocVal = () => getValue("voc");
  const noxVal = () => getValue("nox");
  const tempVal = () => getValue("temperature");
  const humVal = () => getValue("humidity");

  const aqiVal = () => {
    const value = pm25Val();
    return value !== null ? pm25ToAqi(value) : null;
  };

  const dpVal = () => {
    const temperature = tempVal();
    const humidity = humVal();
    return temperature !== null && humidity !== null ? dewPoint(temperature, humidity) : null;
  };

  const aqiTrend = createMemo(() => getSeries("pm25").map((value) => pm25ToAqi(value)));

  const dpTrend = createMemo(() => {
    const temps = getSeries("temperature");
    const hums = getSeries("humidity");
    const length = Math.min(temps.length, hums.length);
    return Array.from({ length }, (_, index) => dewPoint(temps[index], hums[index]));
  });

  const uplinkAge = () => {
    const timestamp = currentData()?.timestamp;
    if (!timestamp) return "-";
    const seconds = Math.round((Date.now() - timestamp) / 1_000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  };

  const timeStr = () =>
    now().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const dateStr = () =>
    now()
      .toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();

  return (
    <div class="gi-stage">
      <div class="gi-canvas">
        <div class="gi-topbar">
          <div class="gi-brand">
            <span class="gi-brand-mark">AG</span>
            <div class="gi-brand-text">
              <span class="gi-brand-name">AIR ONE - GAUGES</span>
              <span class="gi-brand-sub">
                Live indoor air quality - auto-refresh {refreshMs / 1_000}s
              </span>
            </div>
          </div>

          <div class="gi-topbar-right">
            <Show
              when={!current.error}
              fallback={
                <span class="gi-netpill gi-netpill--offline">
                  <span class="gi-netdot" style={{ background: "var(--gi-g-top)" }} />
                  OFFLINE
                </span>
              }
            >
              <span class="gi-netpill">
                <span class="gi-netdot" />
                LIVE
              </span>
            </Show>

            <Show when={currentData() && !current.error}>
              <span class="gi-uplink">
                UPLINK <strong class="gi-mono">{uplinkAge()}</strong> AGO
              </span>
            </Show>

            <div class="gi-clock">
              <span class="gi-clock-date">{dateStr()}</span>
              <span class="gi-clock-time gi-mono">{timeStr()}</span>
            </div>
          </div>
        </div>

        <Switch>
          <Match when={current.loading && !currentData()}>
            <div class="gi-error">
              <span>Connecting to backend...</span>
            </div>
          </Match>
          <Match when={current.error && !currentData()}>
            <div class="gi-error">
              <span class="gi-error-icon">!</span>
              <span>Backend unavailable - check API connection</span>
              <code>UPLINK ERROR - {String(current.error)}</code>
            </div>
          </Match>
          <Match when={currentData()}>
            <div class="gi-grid">
              <GaugeAQI value={aqiVal()} trend={aqiTrend()} />
              <GaugePM25 value={pm25Val()} trend={getSeries("pm25")} />
              <GaugeCO2 value={co2Val()} trend={getSeries("co2")} />
              <GaugeTemp value={tempVal()} trend={getSeries("temperature")} />
              <GaugeTVOC value={vocVal()} trend={getSeries("voc")} />
              <GaugeNOx value={noxVal()} trend={getSeries("nox")} />
              <GaugeHum value={humVal()} trend={getSeries("humidity")} />
              <GaugeDewPoint value={dpVal()} trend={dpTrend()} />
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}
