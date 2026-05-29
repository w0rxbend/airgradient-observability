import { isMetricKey } from "../domain/metrics";
import { isRangeKey } from "../domain/timeRanges";

const durationPattern = /^\d+[smhd]$/;

type ValidationResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export function validateRangeRequest(searchParams: URLSearchParams): ValidationResult {
  const metric = metricParam(searchParams);
  if (!metric.ok) return metric;

  const range = searchParams.get("range") ?? "24h";
  if (!isRangeKey(range)) return invalid("range must be one of 1h, 6h, 24h, 7d, 30d");

  const step = stepParam(searchParams, "60s");
  if (!step.ok) return step;

  return {
    ok: true,
    path: `/api/metrics/range?${new URLSearchParams({
      metric: metric.value,
      range,
      step: step.value,
    }).toString()}`,
  };
}

export function validateAbsoluteRangeRequest(searchParams: URLSearchParams): ValidationResult {
  const metric = metricParam(searchParams);
  if (!metric.ok) return metric;

  const from = timestampParam(searchParams, "from");
  if (!from.ok) return from;

  const to = timestampParam(searchParams, "to");
  if (!to.ok) return to;

  if (from.value >= to.value) return invalid("from must be earlier than to");

  const step = stepParam(searchParams, "5m");
  if (!step.ok) return step;

  return {
    ok: true,
    path: `/api/metrics/range-absolute?${new URLSearchParams({
      metric: metric.value,
      from: String(from.value),
      to: String(to.value),
      step: step.value,
    }).toString()}`,
  };
}

export function validationErrorResponse(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: {
      "content-type": "application/json",
    },
  });
}

function metricParam(searchParams: URLSearchParams) {
  const metric = searchParams.get("metric") ?? "co2";
  if (!isMetricKey(metric)) {
    return invalid("metric must be one of co2, pm25, voc, nox, temperature, humidity");
  }
  return { ok: true, value: metric } as const;
}

function stepParam(searchParams: URLSearchParams, fallback: string) {
  const step = searchParams.get("step") ?? fallback;
  if (!durationPattern.test(step)) return invalid("step must be a duration like 30s, 5m, 2h, or 1d");
  return { ok: true, value: step } as const;
}

function timestampParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return invalid(`${key} is required`);

  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    return invalid(`${key} must be a Unix millisecond timestamp`);
  }

  return { ok: true, value: timestamp } as const;
}

function invalid(error: string) {
  return { ok: false, error } as const;
}
