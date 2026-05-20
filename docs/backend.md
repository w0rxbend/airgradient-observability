# Backend API

The backend is a small Go service using Gin. It is the only custom application component that talks to VictoriaMetrics.

Browser clients should call the backend, not VictoriaMetrics.

## Run Locally

```bash
cd app/backend
VM_URL=http://localhost:8428 go run ./cmd/server
```

The default address is `:8080`.

## Endpoints

```http
GET /healthz
GET /api/healthz
GET /api/metrics/current
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

## Current Metrics Response

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

## Range Response

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

## Cache

The backend has a process-local in-memory TTL cache:

- current metrics: `CACHE_TTL`, default `10s`
- range metrics: `RANGE_CACHE_TTL`, default `30s`

Successful responses are cached. Failed VictoriaMetrics requests return `502`.

Planned hardening:

- stale cache fallback
- `X-Cache` headers
- request coalescing with `singleflight`
- focused unit tests around cache behavior

## Metric Catalog

The backend catalog lives in `app/backend/internal/metrics/definitions.go`.

This catalog controls:

- backend query names
- frontend gauge range metadata
- threshold status calculation

Use `METRIC_*` environment variables if real AirGradient metric names differ.
