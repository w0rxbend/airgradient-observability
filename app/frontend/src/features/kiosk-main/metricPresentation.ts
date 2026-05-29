import type { JSX } from "solid-js";
import type { CurrentMetric } from "../../shared/api/backendClient";
import {
  formatMetricValue,
  metricValuePercent,
  sortByMetricOrder,
  type MetricKey,
} from "../../shared/domain/metrics";
import type { Status } from "../../shared/domain/airQuality";

const kioskMetricOrder: MetricKey[] = ["co2", "pm25", "voc", "nox", "temperature", "humidity"];

const metricTone: Record<MetricKey, string> = {
  co2: "#9db7df",
  pm25: "#e6d98f",
  voc: "#b9a1d8",
  nox: "#d9a07c",
  temperature: "#d98ca3",
  humidity: "#8fc8bd",
};

export const metricIconName: Record<MetricKey, string> = {
  co2: "cloud",
  pm25: "grain",
  voc: "bubble",
  nox: "bolt",
  temperature: "thermostat",
  humidity: "water",
};

export function sortKioskMetrics(metrics: CurrentMetric[]) {
  return sortByMetricOrder(metrics, kioskMetricOrder);
}

export function findMetric(metrics: CurrentMetric[], key: MetricKey) {
  return metrics.find((metric) => metric.key === key);
}

export function metricToneStyle(metric: CurrentMetric) {
  return { "--metric-tone": metricTone[metric.key] ?? metricTone.co2 } as JSX.CSSProperties;
}

export function progressPercent(metric: CurrentMetric) {
  return metricValuePercent(metric);
}

export function displayMetricValue(value: number | null) {
  return formatMetricValue(value);
}

export function shortMetricLabel(metric: CurrentMetric) {
  if (metric.key === "temperature") return "Temperature";
  if (metric.key === "humidity") return "Humidity";
  return metric.label;
}

export function kioskStatusLabel(status: Status) {
  if (status === "good") return "Good";
  if (status === "warning") return "Watch";
  if (status === "critical") return "Alert";
  return "No data";
}
