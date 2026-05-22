# Backend

The backend is a small Go service that exposes a stable JSON API over VictoriaMetrics. It is the only custom service that should query VictoriaMetrics for application data.

## Source Layout

```text
app/backend/
  cmd/server/main.go                 # HTTP server, routing, error mapping
  internal/config/config.go          # environment parsing
  internal/cache/cache.go            # generic in-memory TTL cache
  internal/metrics/definitions.go    # metric catalog and thresholds
  internal/metrics/service.go        # VictoriaMetrics queries and response shaping
  Dockerfile
  go.mod
```

## Runtime Responsibilities

The backend:

- maps stable API keys to AirGradient metric names
- appends a label filter to bare metric names
- queries VictoriaMetrics using Prometheus-compatible APIs
- normalizes current and range responses
- calculates status values from thresholds
- applies per-request VictoriaMetrics timeouts
- caches successful responses in process memory
- coalesces identical concurrent cache misses with `singleflight`

It does not:

- store durable data
- scrape the device
- remote-write samples
- manage Grafana dashboards
- implement alerting rules

## Run Locally

With local VictoriaMetrics:

```bash
cd app/backend
VM_URL=http://localhost:8428 go run ./cmd/server
```

With VictoriaMetrics through authenticated Nginx:

```bash
cd app/backend
VM_URL=https://YOUR_DOMAIN/victoriametrics \
VM_USER=airgradient \
VM_PASSWORD='CHANGE_ME' \
go run ./cmd/server
```

Default listen address:

```text
:8080
```

## Configuration

See [Configuration](configuration.md) for the full table. Common backend variables:

```env
ADDR=:8080
VM_URL=http://localhost:8428
VM_USER=
VM_PASSWORD=
VM_QUERY_TIMEOUT=10s
AIRGRADIENT_LABEL_FILTER={device="airgradient_one"}
CACHE_TTL=10s
RANGE_CACHE_TTL=30s
ALLOWED_ORIGIN=http://localhost:3000
```

## Metric Catalog

The catalog lives in:

```text
app/backend/internal/metrics/definitions.go
```

Current mappings:

| API key | Default query | Unit | Threshold behavior |
|---|---|---|---|
| `co2` | `airgradient_co2_ppm` | `ppm` | warning at `801`, critical at `1501` |
| `pm25` | `airgradient_pm2d5_ugm3` | `ug/m3` | warning at `12`, critical at `35` |
| `voc` | `airgradient_tvoc_index` | `index` | warning at `100`, critical at `300` |
| `nox` | `airgradient_nox_index` | `index` | warning at `100`, critical at `300` |
| `temperature` | `airgradient_temperature_celsius` | `C` | no status thresholds |
| `humidity` | `airgradient_humidity_percent` | `%` | warning at `60`, critical at `70` |

Status calculation is one-directional:

- no value: `empty`
- value greater than or equal to `warnBelow`: `critical`
- value greater than or equal to `goodBelow`: `warning`
- otherwise: `good`

Humidity currently only models high humidity as worse. It does not model dry-air thresholds.

## Label Filtering

For bare metric names, the backend appends:

```env
AIRGRADIENT_LABEL_FILTER={device="airgradient_one"}
```

Example:

```promql
airgradient_co2_ppm{device="airgradient_one"}
```

If a metric override already contains `{...}` or is not a bare metric name, the backend sends it unchanged.

## Multiple Series Behavior

Current and range queries expect at most one time series per normalized metric. If VictoriaMetrics returns more than one series, the backend returns an error:

```text
query returned multiple series
```

This protects the API from silently mixing sensors. If you add more sensors, either:

- make `AIRGRADIENT_LABEL_FILTER` select exactly one series, or
- extend the API contract to support devices as a parameter.

## Cache Behavior

Successful responses are cached in process memory:

| Response | Key shape | TTL |
|---|---|---|
| current | `current` | `CACHE_TTL` |
| relative range | `metric:range:step` | `RANGE_CACHE_TTL` |
| absolute range | `abs:metric:from:to:step` | `RANGE_CACHE_TTL` |

Failures are not cached. Expired entries are deleted lazily on read.

`singleflight` suppresses duplicate concurrent loads for the same key.

## Error Mapping

| Condition | HTTP status |
|---|---:|
| invalid metric | `400` |
| invalid range | `400` |
| invalid step | `400` |
| invalid absolute time range | `400` |
| VictoriaMetrics query deadline exceeded | `504` |
| other VictoriaMetrics/query error | `502` |

## Checks

```bash
cd app/backend
go test ./...
```

There are currently no backend unit tests. Production hardening should add tests for:

- config parsing
- status threshold calculation
- cache TTL behavior
- label filter application
- invalid input handling
- empty, single-series, and multi-series VictoriaMetrics responses

## Docker

The backend Dockerfile builds a static-ish Go binary in `golang:1.23-alpine`, copies it into `alpine:3.21`, and runs as an unprivileged `airgradient` user.

Build manually:

```bash
cd app/backend
docker build -t airgradient-backend .
```
