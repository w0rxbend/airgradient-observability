# Architecture

## Overview

The project separates collection, storage, query normalization, and visualization.

```text
AirGradient ONE
  http://airgradient_xxx.local/metrics
        |
        | Prometheus scrape on LAN
        v
vmagent
  buffers samples in vmagentdata
        |
        | remote_write HTTPS + Basic Auth
        v
Nginx on OCI
  /api/v1/write -> VictoriaMetrics
        |
        v
VictoriaMetrics
  stores all time-series data
        |
        +-- Grafana datasource
        +-- Go backend API
```

The frontend is a downstream consumer of the Go backend API, but frontend implementation is not covered here.

## Components

| Component | Runtime | Responsibility |
|---|---|---|
| AirGradient ONE | LAN device | emits Prometheus-compatible metrics at `/metrics` |
| `vmagent` | LAN edge host | scrapes the device, adds static labels, buffers locally, remote-writes to OCI |
| Nginx | OCI Docker Compose | terminates TLS, enforces Basic Auth, routes public paths |
| VictoriaMetrics | OCI Docker Compose | stores all metric samples |
| Grafana | OCI Docker Compose | explores and visualizes VictoriaMetrics data |
| Go backend | OCI Docker Compose or local dev | normalizes metric names, applies label filters, caches responses, serves app API |
| mock server | local dev | simulates the backend API without VictoriaMetrics |

## Data Ownership

VictoriaMetrics is the only durable metrics store.

The Go backend owns:

- backend API contract
- VictoriaMetrics query credentials when used
- metric key to PromQL-name mapping
- label-filter behavior
- threshold status calculation
- current/range cache behavior

Grafana owns:

- dashboard panels and variables
- exploratory PromQL queries
- visual operational checks

`vmagent` owns:

- scrape interval
- scrape target
- static labels such as `device` and `location`
- remote-write buffering and retry

## Network Boundaries

The LAN edge host must reach:

- `http://airgradient_xxx.local:80/metrics`
- `https://YOUR_DOMAIN/api/v1/write`

The OCI host publishes:

- `80/tcp`: redirect or certificate workflow
- `443/tcp`: HTTPS entry point

The OCI Docker network keeps these internal:

- VictoriaMetrics: `victoriametrics:8428`
- Grafana: `grafana:3000`
- Go backend: `backend:8080`
- frontend service: `frontend:3000`

## Public Routes

Nginx routes:

| Public path | Upstream | Purpose |
|---|---|---|
| `/api/v1/write` | `victoriametrics:8428` | `vmagent` remote write |
| `/api/` | `backend:8080` | normalized app/backend API |
| `/grafana/` | `grafana:3000` | Grafana UI and API |
| `/victoriametrics/` | `victoriametrics:8428` | optional debug/query access |
| `/` | frontend service | UI surface, not covered in these docs |

Every public route is behind Nginx TLS and Basic Auth in the current scaffold.

## Query Model

The backend catalog maps stable API keys to VictoriaMetrics metric names:

| API key | Metric name |
|---|---|
| `co2` | `airgradient_co2_ppm` |
| `pm25` | `airgradient_pm2d5_ugm3` |
| `voc` | `airgradient_tvoc_index` |
| `nox` | `airgradient_nox_index` |
| `temperature` | `airgradient_temperature_celsius` |
| `humidity` | `airgradient_humidity_percent` |

For simple metric names, the backend appends `AIRGRADIENT_LABEL_FILTER`, defaulting to:

```promql
{device="airgradient_one"}
```

If a configured `METRIC_*` value already contains `{...}` or is not a bare metric name, the backend sends it unchanged. Use this only when you intentionally provide a full PromQL selector or expression.

## Caching And Freshness

The backend uses process-local TTL caches:

- current metrics: `CACHE_TTL`, default `10s`
- range metrics: `RANGE_CACHE_TTL`, default `30s`

Concurrent identical cache misses are coalesced with `singleflight`. Failed VictoriaMetrics requests are not cached. There is no stale-cache fallback yet.

## Failure Domains

| Failure | Expected effect |
|---|---|
| AirGradient offline | `vmagent` scrape errors; VictoriaMetrics keeps historical data |
| LAN edge offline | no new samples remote-written; backend range queries still return old samples |
| remote write auth/TLS failure | `vmagent` logs errors and buffers until disk/retention pressure |
| VictoriaMetrics unavailable | backend metric endpoints return `502` or `504`; Grafana has no datasource data |
| backend unavailable | Grafana remains usable; app/backend API fails |
| Grafana unavailable | backend API and storage continue working |

## Design Tradeoffs

- A single-node VictoriaMetrics deployment is simpler than a clustered setup and appropriate for one home sensor.
- Nginx is containerized so the OCI host can stay Docker-only.
- Basic Auth is intentionally simple; stronger auth can be added later at the reverse proxy or network layer.
- Metric catalog lives in Go code to keep the backend API stable even if device metric names change.
