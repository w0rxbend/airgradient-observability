# Architecture

Related docs:

- [Configuration](configuration.md)
- [Deployment](deployment.md)
- [API Reference](api.md)
- [Backend API](backend.md)
- [Grafana](grafana.md)
- [Metrics Catalog](metrics.md)
- [Security](security.md)

```text
AirGradient ONE
  http://airgradient_xxx.local/metrics
        ↓ scrape
vmagent on LAN
        ↓ remote_write over HTTPS
VictoriaMetrics on OCI
        ↓ query
Go backend proxy + Grafana
        ↓ cached JSON API
SolidStart app
```

The LAN edge node is intentionally small. `vmagent` scrapes the AirGradient ONE Prometheus endpoint and buffers remote-write samples on disk before sending them to the OCI VM.

The OCI node runs VictoriaMetrics and Grafana bound to localhost. A reverse proxy terminates TLS and adds Basic Auth. Do not expose port `8428` directly to the internet.

The custom app queries the Go backend proxy. Only the Go backend talks to VictoriaMetrics:

- `GET /api/metrics/current`
- `GET /api/metrics/range?metric=co2&range=24h&step=60s`

The backend caches current responses for `CACHE_TTL` and range responses for `RANGE_CACHE_TTL`.

Metric names are centralized in `app/backend/internal/metrics/definitions.go` and can be overridden with environment variables such as `METRIC_CO2`, `METRIC_PM25`, `METRIC_VOC`, `METRIC_NOX`, `METRIC_TEMPERATURE`, and `METRIC_HUMIDITY` after confirming real AirGradient sample names.

## Data Ownership

VictoriaMetrics is the only storage layer.

The Go backend owns:

- VictoriaMetrics credentials
- metric name normalization
- cache behavior
- frontend API contract

The Solid frontend owns:

- UI state
- gauge rendering
- browser calls to the backend API

Grafana owns:

- reference dashboards
- direct exploratory VictoriaMetrics queries
