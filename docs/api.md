# API Reference

The Go backend owns the public JSON API. In production, Nginx proxies `/api/` to the backend.

Local base URL:

```text
http://localhost:8080
```

Production base URL:

```text
https://YOUR_DOMAIN
```

Production examples include Basic Auth because the current Nginx config protects `/api/`.

## Health

```http
GET /healthz
GET /api/healthz
```

`/healthz` is useful inside the Docker network or when running the backend directly. `/api/healthz` is useful through Nginx.

Response:

```json
{"status":"ok"}
```

Example:

```bash
curl -u airgradient:'CHANGE_ME' 'https://YOUR_DOMAIN/api/healthz'
```

## Current Metrics

```http
GET /api/metrics/current
```

Returns one object for each configured normalized metric.

Example:

```bash
curl -u airgradient:'CHANGE_ME' \
  'https://YOUR_DOMAIN/api/metrics/current'
```

Response:

```json
{
  "metrics": [
    {
      "key": "co2",
      "label": "CO2",
      "unit": "ppm",
      "value": 612,
      "timestamp": 1710000000000,
      "min": 400,
      "max": 3000,
      "goodBelow": 801,
      "warnBelow": 1501,
      "status": "good"
    }
  ],
  "timestamp": 1710000000000,
  "cached": false
}
```

Field notes:

| Field | Meaning |
|---|---|
| `metrics` | ordered list from backend metric catalog |
| `value` | current value, or `null` when no series/sample exists |
| `timestamp` | Unix timestamp in milliseconds, or `null` |
| `min` / `max` | display range metadata |
| `goodBelow` / `warnBelow` | optional threshold metadata |
| `status` | `good`, `warning`, `critical`, or `empty` |
| `cached` | `true` when served from backend process cache |

## Relative Range

```http
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

Query parameters:

| Parameter | Default | Validation | Examples |
|---|---|---|---|
| `metric` | `co2` | configured metric key | `co2`, `pm25`, `voc`, `nox`, `temperature`, `humidity` |
| `range` | `24h` | `^\d+[hd]$` | `1h`, `6h`, `24h`, `7d`, `30d`, `90d` |
| `step` | `60s` | `^\d+[smh]$` | `30s`, `60s`, `5m`, `1h` |

Example:

```bash
curl -u airgradient:'CHANGE_ME' \
  'https://YOUR_DOMAIN/api/metrics/range?metric=co2&range=24h&step=5m'
```

Response:

```json
{
  "metric": "co2",
  "label": "CO2",
  "unit": "ppm",
  "range": "24h",
  "step": "5m",
  "points": [[1710000000000, 610]],
  "cached": false
}
```

`points` is an array of `[timestampMs, value]`.

## Absolute Range

```http
GET /api/metrics/range-absolute?metric=co2&from=1710000000000&to=1710086400000&step=5m
```

Query parameters:

| Parameter | Required | Validation | Meaning |
|---|---:|---|---|
| `metric` | no | configured metric key | defaults to `co2` |
| `from` | yes | Unix milliseconds | inclusive start time |
| `to` | yes | Unix milliseconds | end time; must be greater than `from` |
| `step` | no | `^\d+[smh]$` | defaults to `5m` |

Example:

```bash
curl -u airgradient:'CHANGE_ME' \
  'https://YOUR_DOMAIN/api/metrics/range-absolute?metric=pm25&from=1710000000000&to=1710086400000&step=5m'
```

Response shape matches the relative range endpoint. The `range` field is formatted as:

```text
<fromMs>-<toMs>
```

## Metrics

Supported metric keys:

| Key | Label | Unit |
|---|---|---|
| `co2` | `CO2` | `ppm` |
| `pm25` | `PM2.5` | `ug/m3` |
| `voc` | `TVOC` | `index` |
| `nox` | `NOx` | `index` |
| `temperature` | `Temperature` | `C` |
| `humidity` | `Humidity` | `%` |

## Errors

Error response:

```json
{"error":"invalid metric: unknown"}
```

Status codes:

| Status | Meaning |
|---:|---|
| `400` | invalid metric, range, step, or absolute time range |
| `502` | VictoriaMetrics returned an error or unexpected warning |
| `504` | VictoriaMetrics query timeout |

Examples:

```bash
curl -i 'http://localhost:8080/api/metrics/range?metric=unknown'
curl -i 'http://localhost:8080/api/metrics/range?metric=co2&range=bad'
curl -i 'http://localhost:8080/api/metrics/range-absolute?from=2&to=1'
```

## Caching

The backend response body includes a `cached` boolean. It does not currently set `X-Cache` headers.

Default TTLs:

- current metrics: `10s`
- range metrics: `30s`

## Compatibility Notes

The API is intentionally small and stable. If multiple AirGradient devices are added, the current API must change or receive an additional device/location selector because the backend currently rejects multi-series query results.
