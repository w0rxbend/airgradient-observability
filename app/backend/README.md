# AirGradient Backend

Go + Gin API service that queries VictoriaMetrics and returns normalized AirGradient metrics.

For full production docs, see:

- `../../docs/backend.md`
- `../../docs/api.md`
- `../../docs/configuration.md`
- `../../docs/metrics.md`

## Run

```bash
go run ./cmd/server
```

Default:

```text
ADDR=:8080
VM_URL=http://localhost:8428
```

Run against local VictoriaMetrics:

```bash
VM_URL=http://localhost:8428 go run ./cmd/server
```

Run against VictoriaMetrics through authenticated Nginx:

```bash
VM_URL=https://YOUR_DOMAIN/victoriametrics \
VM_USER=airgradient \
VM_PASSWORD='CHANGE_ME' \
go run ./cmd/server
```

## Endpoints

```http
GET /healthz
GET /api/healthz
GET /api/metrics/current
GET /api/metrics/range?metric=co2&range=24h&step=60s
GET /api/metrics/range-absolute?metric=co2&from=<ms>&to=<ms>&step=5m
```

## Important Environment Variables

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
METRIC_CO2=airgradient_co2_ppm
METRIC_PM25=airgradient_pm2d5_ugm3
METRIC_VOC=airgradient_tvoc_index
METRIC_NOX=airgradient_nox_index
METRIC_TEMPERATURE=airgradient_temperature_celsius
METRIC_HUMIDITY=airgradient_humidity_percent
```

## Checks

```bash
go test ./...
```

There are currently no unit tests; this command verifies compilation across packages.

## Docker

```bash
docker build -t airgradient-backend .
docker run --rm -p 8080:8080 -e VM_URL=http://host.docker.internal:8428 airgradient-backend
```
