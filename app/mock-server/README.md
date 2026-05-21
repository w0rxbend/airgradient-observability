# AirGradient mock server

A zero-dependency Go HTTP server that implements the same API as the real backend
but returns procedurally generated time-series data. Use it for local frontend
development when you don't have a real AirGradient sensor or VictoriaMetrics
instance running.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| GET | `/api/metrics/current` | Latest readings for all six metrics |
| GET | `/api/metrics/range` | Relative time-series (`range=24h`, `step=5m`) |
| GET | `/api/metrics/range-absolute` | Absolute time-series (`from=<ms>`, `to=<ms>`, `step=5m`) |

## Running locally

```sh
# from this directory
go run .
# 2026/05/22 mock server listening on :8081
```

Then start the frontend pointing at the mock:

```sh
cd ../frontend
BACKEND_URL=http://localhost:8081 npm run dev
```

Or create `app/frontend/.env.local` (gitignored by default):

```
BACKEND_URL=http://localhost:8081
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `ADDR` | `:8081` | Listen address |

Override via env or the `--addr` flag:

```sh
ADDR=:9000 go run .
go run . --addr :9000
```

## Generated data

The server simulates realistic indoor air quality patterns:

- **Daily activity cycle**: CO₂ and VOC peak around 8 am and 7 pm (human occupancy), dip at 3 am.
- **Temperature**: slight day/night variation around ~21 °C.
- **Humidity**: inversely tracks temperature.
- **Deterministic noise**: seeded on metric key + minute bucket — the same timestamp always returns the same value, so chart renders are stable across reloads.

## Building a binary

```sh
go build -o mock-server .
./mock-server --addr :8081
```
