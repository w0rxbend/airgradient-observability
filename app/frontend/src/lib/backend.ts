import type { MetricKey } from "./metrics";
import type { RangeKey } from "../components/RangeSelector";

export type CurrentMetric = {
  key: MetricKey;
  label: string;
  unit: string;
  value: number | null;
  timestamp: number | null;
  min: number;
  max: number;
  goodBelow?: number;
  warnBelow?: number;
  status: "good" | "warning" | "critical" | "empty";
};

export type CurrentResponse = {
  metrics: CurrentMetric[];
  timestamp: number | null;
  cached?: boolean;
};

export type RangePoint = [number, number];

export type RangeResponse = {
  metric: MetricKey;
  label: string;
  unit: string;
  range: string;
  step: string;
  points: RangePoint[];
  cached?: boolean;
};

export async function fetchCurrent() {
  return fetchJson<CurrentResponse>("/api/metrics/current", "Unable to load current metrics");
}

export async function fetchRange(metric: MetricKey, range: RangeKey) {
  const step = range === "30d" ? "15m" : range === "7d" ? "5m" : "60s";
  const params = new URLSearchParams({ metric, range, step });
  return fetchJson<RangeResponse>(
    `/api/metrics/range?${params.toString()}`,
    "Unable to load historical metrics"
  );
}

async function fetchJson<T>(url: string, fallback: string) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  if (!contentType.includes("application/json")) {
    throw new Error(`${fallback}: expected JSON, received ${contentType || "unknown content"}`);
  }
  return (await response.json()) as T;
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}
