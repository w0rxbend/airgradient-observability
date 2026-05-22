# AirGradient Mock Server

Zero-dependency Go HTTP server that implements the same JSON API as the real backend, but returns deterministic generated air-quality data. Use it for backend/API demos, client integration tests, and local development when VictoriaMetrics or a real AirGradient sensor is unavailable.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | health check |
| `GET` | `/api/healthz` | health check matching production route |
| `GET` | `/api/metrics/current` | latest readings for all six normalized metrics |
| `GET` | `/api/metrics/range` | relative time-series |
| `GET` | `/api/metrics/range-absolute` | absolute time-series |

## Run

```bash
go run .
```

Default listen address:

```text
:8081
```

Override with environment:

```bash
ADDR=:9000 go run .
```

Override with flag:

```bash
go run . --addr :9000
```

## Smoke Tests

```bash
curl 'http://localhost:8081/api/healthz'
curl 'http://localhost:8081/api/metrics/current'
curl 'http://localhost:8081/api/metrics/range?metric=co2&range=24h&step=5m'
```

Absolute range:

```bash
FROM=$(date -d 'yesterday' +%s000)
TO=$(date +%s000)
curl "http://localhost:8081/api/metrics/range-absolute?metric=pm25&from=${FROM}&to=${TO}&step=5m"
```

## Generated Data Model

The server simulates:

- CO2 and VOC peaks around morning and evening occupancy
- lower nighttime activity
- PM2.5 variation with deterministic noise
- mild temperature day/night movement
- humidity moving inversely to temperature
- stable values for the same metric and timestamp

Generated data is deterministic enough for repeatable chart and API testing, but it is not intended to model a real building precisely.

## Metric Contract

The mock server returns the same normalized API keys as the real backend:

```text
co2
pm25
voc
nox
temperature
humidity
```

Response fields mirror the real backend:

- `key`
- `label`
- `unit`
- `value`
- `timestamp`
- `min`
- `max`
- `goodBelow`
- `warnBelow`
- `status`
- `cached`

## Build

```bash
go build -o mock-server .
./mock-server --addr :8081
```

Docker:

```bash
docker build -t airgradient-mock-server .
docker run --rm -p 8081:8081 airgradient-mock-server
```
