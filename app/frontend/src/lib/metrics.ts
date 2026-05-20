export type MetricKey = "co2" | "pm25" | "temperature" | "humidity" | "voc" | "nox";

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  unit: string;
  goodBelow?: number;
  warnBelow?: number;
};

export const metrics: Record<MetricKey, MetricDefinition> = {
  co2: {
    key: "co2",
    label: "CO2",
    unit: "ppm",
    goodBelow: 800,
    warnBelow: 1200
  },
  pm25: {
    key: "pm25",
    label: "PM2.5",
    unit: "ug/m3",
    goodBelow: 12,
    warnBelow: 35
  },
  temperature: {
    key: "temperature",
    label: "Temperature",
    unit: "C"
  },
  humidity: {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    goodBelow: 60,
    warnBelow: 70
  },
  voc: {
    key: "voc",
    label: "VOC",
    unit: "ppb",
    goodBelow: 220,
    warnBelow: 660
  },
  nox: {
    key: "nox",
    label: "NOx",
    unit: "index",
    goodBelow: 100,
    warnBelow: 300
  }
};

export const defaultMetricKeys: MetricKey[] = ["temperature", "humidity", "pm25", "voc", "co2", "nox"];

export function getMetric(key: string | null): MetricDefinition {
  if (key && key in metrics) return metrics[key as MetricKey];
  return metrics.co2;
}
