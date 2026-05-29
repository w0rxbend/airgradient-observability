import type { CurrentResponse, RangeResponse } from "../../shared/api/backendClient";
import { dewPoint, pm25ToAqi } from "../../shared/domain/airQuality";
import type { MetricKey } from "../../shared/domain/metrics";

export function metricHistoryMap(history: RangeResponse[] | undefined) {
  const values: Partial<Record<MetricKey, number[]>> = {};
  for (const response of history ?? []) {
    values[response.metric] = response.points.map(([_timestamp, value]) => value);
  }
  return values;
}

export function currentMetricValue(current: CurrentResponse | undefined, key: MetricKey) {
  return current?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

export function aqiFromPm25(pm25: number | null) {
  return pm25 !== null ? pm25ToAqi(pm25) : null;
}

export function dewPointValue(temperature: number | null, humidity: number | null) {
  return temperature !== null && humidity !== null ? dewPoint(temperature, humidity) : null;
}

export function dewPointTrend(temperatures: number[], humidity: number[]) {
  const length = Math.min(temperatures.length, humidity.length);
  return Array.from({ length }, (_, index) => dewPoint(temperatures[index], humidity[index]));
}
