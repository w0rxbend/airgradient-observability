export type MetricKey = "co2" | "pm25" | "temperature" | "humidity" | "voc" | "nox";

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  goodBelow?: number;
  warnBelow?: number;
};

export const metricKeys: MetricKey[] = ["co2", "pm25", "voc", "nox", "temperature", "humidity"];

export const defaultMetricKeys: MetricKey[] = [
  "temperature",
  "humidity",
  "pm25",
  "voc",
  "co2",
  "nox",
];

export const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  co2: {
    key: "co2",
    label: "CO2",
    unit: "ppm",
    min: 400,
    max: 3000,
    goodBelow: 801,
    warnBelow: 1501,
  },
  pm25: {
    key: "pm25",
    label: "PM2.5",
    unit: "ug/m3",
    min: 0,
    max: 75,
    goodBelow: 12,
    warnBelow: 35,
  },
  voc: {
    key: "voc",
    label: "TVOC",
    unit: "index",
    min: 0,
    max: 500,
    goodBelow: 100,
    warnBelow: 300,
  },
  nox: {
    key: "nox",
    label: "NOx",
    unit: "index",
    min: 0,
    max: 500,
    goodBelow: 100,
    warnBelow: 300,
  },
  temperature: {
    key: "temperature",
    label: "Temperature",
    unit: "C",
    min: 10,
    max: 35,
  },
  humidity: {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    min: 0,
    max: 100,
    goodBelow: 60,
    warnBelow: 70,
  },
};

export const metrics = metricDefinitions;

export function isMetricKey(key: string): key is MetricKey {
  return key in metricDefinitions;
}

export function getMetric(key: string | null): MetricDefinition {
  if (key && isMetricKey(key)) return metricDefinitions[key];
  return metricDefinitions.co2;
}

export function sortByMetricOrder<T extends { key: MetricKey }>(
  items: T[],
  order: MetricKey[] = metricKeys
) {
  return [...items].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export function metricValuePercent(metric: { value: number | null; min: number; max: number }) {
  if (metric.value === null) return 0;
  const range = metric.max - metric.min || 1;
  return Math.max(0, Math.min(1, (metric.value - metric.min) / range));
}

export function formatMetricValue(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

export function formatMetricNumber(value: number | null, decimals = 1): string {
  if (value === null) return "-";
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(decimals);
}
