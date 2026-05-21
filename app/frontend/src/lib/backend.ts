import type { MetricKey } from "./metrics";
import type { RangeKey } from "../components/RangeSelector";
import { overallScore, scoreStatus } from "./thresholds";
import type { Status } from "./thresholds";

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

export type DailyScore = {
  dateStr: string; // "YYYY-MM-DD"
  score: number;   // 0–100
  status: Status;
};

// Thresholds that match backend definitions.go exactly
const DAILY_THRESHOLDS: Record<MetricKey, { goodBelow?: number; warnBelow?: number }> = {
  co2:         { goodBelow: 801,  warnBelow: 1501 },
  pm25:        { goodBelow: 12,   warnBelow: 35   },
  voc:         { goodBelow: 100,  warnBelow: 300  },
  nox:         { goodBelow: 100,  warnBelow: 300  },
  temperature: {},
  humidity:    { goodBelow: 60,   warnBelow: 70   },
};

const ALL_METRIC_KEYS: MetricKey[] = ["co2", "pm25", "voc", "nox", "temperature", "humidity"];

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

// Unconstrained range/step for internal use (heatmap, etc.)
export async function fetchRangeRaw(metric: MetricKey, range: string, step: string) {
  const params = new URLSearchParams({ metric, range, step });
  return fetchJson<RangeResponse>(
    `/api/metrics/range?${params.toString()}`,
    "Unable to load metric range"
  );
}

export async function fetchAllRanges(range: RangeKey): Promise<RangeResponse[]> {
  return Promise.all(ALL_METRIC_KEYS.map(k => fetchRange(k, range)));
}

export async function fetchAllRangesAbsolute(from: number, to: number): Promise<RangeResponse[]> {
  return Promise.all(ALL_METRIC_KEYS.map(k => fetchRangeAbsolute(k, from, to)));
}

export async function fetchDailyScores(): Promise<DailyScore[]> {
  const responses = await Promise.all(
    ALL_METRIC_KEYS.map(k => fetchRangeRaw(k, "90d", "6h").catch(() => null))
  );

  // Group values by date per metric
  const byDate = new Map<string, Map<MetricKey, number[]>>();

  responses.forEach((resp, i) => {
    if (!resp) return;
    const key = ALL_METRIC_KEYS[i];
    for (const [ts, val] of resp.points) {
      const d = new Date(ts);
      const dateStr = toDateStr(d);
      if (!byDate.has(dateStr)) byDate.set(dateStr, new Map());
      const dm = byDate.get(dateStr)!;
      if (!dm.has(key)) dm.set(key, []);
      dm.get(key)!.push(val);
    }
  });

  const results: DailyScore[] = [];
  byDate.forEach((metricMap, dateStr) => {
    const statuses: Status[] = [];
    for (const key of ALL_METRIC_KEYS) {
      const vals = metricMap.get(key);
      if (!vals || vals.length === 0) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const def = DAILY_THRESHOLDS[key];
      let s: Status = "good";
      if (def.warnBelow !== undefined && avg >= def.warnBelow) s = "critical";
      else if (def.goodBelow !== undefined && avg >= def.goodBelow) s = "warning";
      statuses.push(s);
    }
    if (statuses.length === 0) return;
    const score = overallScore(statuses.map(s => ({ status: s })));
    results.push({ dateStr, score, status: scoreStatus(score) });
  });

  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// ─── helpers ──────────────────────────────────────────────────────

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeToStep(range: RangeKey): string {
  switch (range) {
    case "1h":  return "30s";
    case "6h":  return "2m";
    case "24h": return "5m";
    case "7d":  return "30m";
    case "30d": return "2h";
  }
}

function absoluteStep(ms: number): string {
  const h = ms / 3_600_000;
  if (h <= 2)   return "30s";
  if (h <= 12)  return "2m";
  if (h <= 48)  return "5m";
  if (h <= 336) return "30m";
  return "2h";
}

async function fetchJson<T>(url: string, fallback: string): Promise<T> {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  if (!ct.includes("application/json"))
    throw new Error(`${fallback}: expected JSON, got ${ct || "unknown"}`);
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const p = (await res.json()) as { error?: string };
    return p.error ?? fallback;
  } catch {
    return fallback;
  }
}
