# API Reference

The Go backend owns the public app API.

Base URL in local backend development:

```text
http://localhost:8080
```

In production, Nginx should proxy `/api/` to the backend so browser calls can stay same-origin.

## Health

```http
GET /healthz
GET /api/healthz
```

`/healthz` is mainly useful inside the Docker network or when running the backend directly. `/api/healthz` is available through the reverse proxy.

Response:

```json
{"status":"ok"}
```

## Current Metrics

```http
GET /api/metrics/current
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
      "max": 2000,
      "goodBelow": 800,
      "warnBelow": 1200,
      "status": "good"
    }
  ],
  "timestamp": 1710000000000,
  "cached": false
}
```

Valid statuses:

- `good`
- `warning`
- `critical`
- `empty`

## Range Metrics

```http
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

Query params:

| Param | Default | Valid examples |
|---|---:|---|
| `metric` | `co2` | `co2`, `pm25`, `voc`, `nox`, `temperature`, `humidity` |
| `range` | `24h` | `1h`, `6h`, `24h`, `7d`, `30d` |
| `step` | `60s` | `15s`, `60s`, `5m`, `15m`, `1h` |

Response:

```json
{
  "metric": "co2",
  "label": "CO2",
  "unit": "ppm",
  "range": "24h",
  "step": "60s",
  "points": [[1710000000000, 610]],
  "cached": false
}
```

## Errors

VictoriaMetrics errors are returned as `502`:

```json
{"error":"Post \"http://localhost:8428/api/v1/query\": dial tcp [::1]:8428: connect: connection refused"}
```

Implemented hardening:

- invalid metric/range/step returns `400`
- backend VictoriaMetrics query timeout returns `504`

Planned API hardening:

- stale cache fallback
- `X-Cache` response headers
