# AirGradient Backend

Small Gin API that proxies VictoriaMetrics through the Prometheus-compatible API and caches normalized responses.

```bash
cd app/backend
go mod download
VM_URL=http://localhost:8428 go run ./cmd/server
```

Endpoints:

- `GET /healthz`
- `GET /api/metrics/current`
- `GET /api/metrics/range?metric=co2&range=24h&step=60s`

Important environment variables:

- `ADDR`, default `:8080`
- `VM_URL`, default `http://localhost:8428`
- `VM_USER`, optional Basic Auth username
- `VM_PASSWORD`, optional Basic Auth password
- `AIRGRADIENT_LABEL_FILTER`, default `{device="airgradient_one"}`
- `CACHE_TTL`, default `10s`
- `RANGE_CACHE_TTL`, default `30s`
- `VM_QUERY_TIMEOUT`, default `10s`
- `ALLOWED_ORIGIN`, default `http://localhost:3000`
- `METRIC_CO2`, default `airgradient_co2_ppm`
- `METRIC_PM25`, default `airgradient_pm2d5_ugm3`
- `METRIC_VOC`, default `airgradient_tvoc_index`
- `METRIC_NOX`, default `airgradient_nox_index`
- `METRIC_TEMPERATURE`, default `airgradient_temperature_degc`
- `METRIC_HUMIDITY`, default `airgradient_humidity_percent`
