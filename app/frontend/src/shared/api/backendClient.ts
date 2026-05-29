import {
  classifyMetricStatus,
  overallScore,
  scoreStatus,
  type Status,
} from "../domain/airQuality";
import { metricKeys, type MetricKey } from "../domain/metrics";
import { absoluteStep, rangeToStep, type RangeKey } from "../domain/timeRanges";

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
  status: Status;
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

export type DailyScore = {
  dateStr: string;
  score: number;
  status: Status;
};

export async function fetchCurrent() {
  return fetchJson<CurrentResponse>("/api/metrics/current", "Unable to load current metrics");
}

export async function fetchRange(metric: MetricKey, range: RangeKey) {
  const step = rangeToStep(range);
  const params = new URLSearchParams({ metric, range, step });

  return fetchJson<RangeResponse>(
    `/api/metrics/range?${params.toString()}`,
    "Unable to load historical metrics"
  );
}

export async function fetchRangeAbsolute(metric: MetricKey, from: number, to: number) {
  const step = absoluteStep(to - from);
  const params = new URLSearchParams({ metric, from: String(from), to: String(to), step });

  return fetchJson<RangeResponse>(
    `/api/metrics/range-absolute?${params.toString()}`,
    "Unable to load historical metrics"
  );
}

export async function fetchRangeRaw(metric: MetricKey, range: string, step: string) {
  const params = new URLSearchParams({ metric, range, step });

  return fetchJson<RangeResponse>(
    `/api/metrics/range?${params.toString()}`,
    "Unable to load metric range"
  );
}

export async function fetchAllRanges(range: RangeKey): Promise<RangeResponse[]> {
  return Promise.all(metricKeys.map((metric) => fetchRange(metric, range)));
}

export async function fetchAllRangesAbsolute(from: number, to: number): Promise<RangeResponse[]> {
  return Promise.all(metricKeys.map((metric) => fetchRangeAbsolute(metric, from, to)));
}

export async function fetchDailyScores(days: number): Promise<DailyScore[]> {
  if (!Number.isFinite(days) || days < 1) return [];

  const requestedDays = Math.min(365, Math.max(1, Math.floor(days)));
  const range = `${requestedDays}d`;
  const responses = await Promise.all(
    metricKeys.map((metric) => fetchRangeRaw(metric, range, "6h").catch(() => null))
  );

  const valuesByDate = new Map<string, Map<MetricKey, number[]>>();

  responses.forEach((response, index) => {
    if (!response) return;
    const metricKey = metricKeys[index];

    for (const [timestamp, value] of response.points) {
      const dateStr = toDateStr(new Date(timestamp));
      if (!valuesByDate.has(dateStr)) valuesByDate.set(dateStr, new Map());

      const valuesByMetric = valuesByDate.get(dateStr)!;
      if (!valuesByMetric.has(metricKey)) valuesByMetric.set(metricKey, []);
      valuesByMetric.get(metricKey)!.push(value);
    }
  });

  const results: DailyScore[] = [];
  valuesByDate.forEach((valuesByMetric, dateStr) => {
    const statuses = metricKeys.flatMap((metricKey) => {
      const values = valuesByMetric.get(metricKey);
      if (!values || values.length === 0) return [];

      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return [classifyMetricStatus(metricKey, average)];
    });

    if (statuses.length === 0) return;

    const score = overallScore(statuses.map((status) => ({ status })));
    results.push({ dateStr, score, status: scoreStatus(score) });
  });

  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function fetchJson<T>(url: string, fallback: string): Promise<T> {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  if (!contentType.includes("application/json")) {
    throw new Error(`${fallback}: expected JSON, got ${contentType || "unknown"}`);
  }

  return response.json() as Promise<T>;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}
