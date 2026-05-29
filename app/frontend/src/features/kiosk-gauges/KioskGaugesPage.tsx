import { createMemo, Match, Show, Switch } from "solid-js";
import type { MetricKey } from "../../shared/domain/metrics";
import { createClock } from "../../shared/time/clock";
import {
  createKioskGaugesData,
  gaugesRefreshMs,
} from "./createKioskGaugesData";
import {
  aqiFromPm25,
  currentMetricValue,
  dewPointTrend,
  dewPointValue,
  metricHistoryMap,
} from "./pageViewModel";
import { GaugeAQI } from "./components/GaugeAQI";
import { GaugeCO2 } from "./components/GaugeCO2";
import { GaugeDewPoint } from "./components/GaugeDewPoint";
import { GaugeHum } from "./components/GaugeHum";
import { GaugeNOx } from "./components/GaugeNOx";
import { GaugePM25 } from "./components/GaugePM25";
import { GaugeTVOC } from "./components/GaugeTVOC";
import { GaugeTemp } from "./components/GaugeTemp";
import "./kioskGauges.css";

export default function KioskGaugesPage() {
  const now = createClock();
  const data = createKioskGaugesData();

  const current = data.current;
  const currentData = data.currentData;
  const historyMap = createMemo(() => metricHistoryMap(data.historyData()));

  const getValue = (key: MetricKey) =>
    currentMetricValue(currentData(), key);
  const getSeries = (key: MetricKey) => historyMap()[key] ?? [];

  const pm25Val = () => getValue("pm25");
  const co2Val = () => getValue("co2");
  const vocVal = () => getValue("voc");
  const noxVal = () => getValue("nox");
  const tempVal = () => getValue("temperature");
  const humVal = () => getValue("humidity");

  const aqiVal = () => aqiFromPm25(pm25Val());
  const dpVal = () => dewPointValue(tempVal(), humVal());

  const aqiTrend = createMemo(() => getSeries("pm25").map((value) => aqiFromPm25(value) ?? 0));
  const dpTrend = createMemo(() => dewPointTrend(getSeries("temperature"), getSeries("humidity")));

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
                Live indoor air quality - auto-refresh {gaugesRefreshMs / 1_000}s
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
