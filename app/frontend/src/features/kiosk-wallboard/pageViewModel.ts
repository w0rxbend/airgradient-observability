import type { CurrentResponse, RangeResponse } from "../../shared/api/backendClient";
import type { MetricKey } from "../../shared/domain/metrics";

export type RequiredKioskMetrics = {
  pm25: number;
  co2: number;
  voc: number;
  nox: number;
  temperature: number;
  humidity: number;
};

export type WallboardStatus = {
  txt: string;
  color: string;
  step: number;
};

export type WeekRow = { day: string; hours: number[] };
export type FlatCell = { type: "label"; day: string } | { type: "cell"; v: number };

const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function completeCurrentMetrics(current: CurrentResponse | undefined): RequiredKioskMetrics | null {
  if (!current) return null;

  const pm25 = metricValue(current, "pm25");
  const co2 = metricValue(current, "co2");
  const voc = metricValue(current, "voc");
  const nox = metricValue(current, "nox");
  const temperature = metricValue(current, "temperature");
  const humidity = metricValue(current, "humidity");

  if (
    pm25 === null ||
    co2 === null ||
    voc === null ||
    nox === null ||
    temperature === null ||
    humidity === null
  ) {
    return null;
  }

  return { pm25, co2, voc, nox, temperature, humidity };
}

export function metricHistoryMap(history: RangeResponse[] | undefined) {
  const values: Partial<Record<MetricKey, number[]>> = {};
  for (const response of history ?? []) {
    values[response.metric] = response.points.map(([_timestamp, value]) => value);
  }
  return values;
}

export function buildPm25WeekMatrix(raw: RangeResponse | undefined, now = Date.now()): WeekRow[] {
  const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  if (raw) {
    const weekAgo = now - 7 * 24 * 3_600_000;
    for (const [timestamp, value] of raw.points) {
      if (timestamp < weekAgo) continue;

      const date = new Date(timestamp);
      const dayIndex = (date.getDay() + 6) % 7;
      const hour = date.getHours();
      sums[dayIndex][hour] += value;
      counts[dayIndex][hour] += 1;
    }
  }

  return weekDays.map((day, dayIndex) => ({
    day,
    hours: Array.from({ length: 24 }, (_, hour) =>
      counts[dayIndex][hour] > 0 ? sums[dayIndex][hour] / counts[dayIndex][hour] : 0
    ),
  }));
}

export function pm25WallboardStatus(value: number | null | undefined): WallboardStatus {
  if (value === null || value === undefined) return unavailableStatus();
  if (value < 12) return { txt: "GOOD", color: "var(--ks-g)", step: 1 };
  if (value < 25) return { txt: "MOD", color: "var(--ks-y)", step: 2 };
  if (value < 40) return { txt: "HIGH", color: "var(--ks-o)", step: 4 };
  return { txt: "VERY HIGH", color: "var(--ks-r)", step: 5 };
}

export function vocWallboardStatus(value: number | null | undefined): WallboardStatus {
  if (value === null || value === undefined) return unavailableStatus();
  if (value < 100) return { txt: "OK", color: "var(--ks-signal)", step: 2 };
  if (value < 300) return { txt: "MOD", color: "var(--ks-amber)", step: 3 };
  return { txt: "HIGH", color: "var(--ks-r)", step: 4 };
}

export function noxWallboardStatus(value: number | null | undefined): WallboardStatus {
  if (value === null || value === undefined) return unavailableStatus();
  if (value < 100) return { txt: "LOW", color: "var(--ks-green)", step: 1 };
  if (value < 300) return { txt: "MOD", color: "var(--ks-amber)", step: 3 };
  return { txt: "HIGH", color: "var(--ks-r)", step: 5 };
}

function metricValue(current: CurrentResponse, key: MetricKey) {
  return current.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function unavailableStatus(): WallboardStatus {
  return { txt: "NO DATA", color: "var(--ks-paper-2)", step: 0 };
}
