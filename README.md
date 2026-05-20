# AirGradient Observability

Self-hosted AirGradient ONE observability stack:

```text
AirGradient ONE
  http://airgradient_xxx.local/metrics
        ↓ scrape
vmagent on LAN
        ↓ remote_write over HTTPS
VictoriaMetrics on OCI
        ↓ query
Go backend proxy + Grafana
        ↓ cached API
SolidStart app
```

## Repository

```text
infra/
  edge/
    docker-compose.vmagent.yml
    prometheus.yml
  oci/
    docker-compose.vm.yml
    nginx.conf
    grafana/
      datasource.yml
      dashboard.yml
app/
  backend/   # Go + Gin proxy/cache
  frontend/
dashboards/
  airgradient-one.json
docs/
  index.md
  architecture.md
  api.md
  backend.md
  configuration.md
  deployment.md
  development.md
  frontend.md
  grafana.md
  metrics.md
  operations.md
  security.md
  troubleshooting.md
```

## Documentation

Start with [docs/index.md](docs/index.md).

Key guides:

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Configuration](docs/configuration.md)
- [Deployment](docs/deployment.md)
- [Development](docs/development.md)
- [Backend API](docs/backend.md)
- [Frontend App](docs/frontend.md)
- [Grafana](docs/grafana.md)
- [Metrics Catalog](docs/metrics.md)
- [Operations](docs/operations.md)
- [Security](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

## Milestones

- M1: `vmagent` scrapes AirGradient locally.
- M2: `vmagent` remote-writes to OCI VictoriaMetrics.
- M3: Grafana reads VictoriaMetrics.
- M4: Go backend proxy exposes normalized cached APIs.
- M5: Frontend renders CO2, PM2.5, VOC, NOx, temperature, and humidity.
- M6: Alerts for CO2 and PM2.5 thresholds. Planned.

## Quick Start

### OCI

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml up -d
```

Use Nginx in front with TLS and Basic Auth. Do not expose raw `8428` publicly.

Grafana automatically loads dashboards from `dashboards/` through `infra/oci/grafana/dashboard.yml`.

Nginx runs as part of the OCI Docker Compose stack. The host only needs Docker and Compose.

### LAN Edge

Edit `infra/edge/prometheus.yml` and replace `airgradient_xxx.local:80`.

```bash
cd infra/edge
DOMAIN=... VM_USER=... VM_PASSWORD=... docker compose -f docker-compose.vmagent.yml up -d
```

### App

Backend:

```bash
cd app/backend
VM_URL=http://localhost:8428 go run ./cmd/server
```

Frontend:

```bash
cd app/frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

API routes:

```http
GET /api/metrics/current
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

The frontend queries the Go backend only. The backend queries VictoriaMetrics and caches responses. Adjust metric names in `app/backend/internal/metrics/definitions.go` or with `METRIC_*` environment variables once real samples are visible.
