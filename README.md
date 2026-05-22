# AirGradient Observability

Self-hosted observability stack for an AirGradient ONE sensor. The system scrapes the device's Prometheus endpoint on the LAN, stores samples in VictoriaMetrics on an OCI VM, and exposes the data through Grafana and a small Go API.

```text
AirGradient ONE
  /metrics on the local network
        |
        | scrape
        v
vmagent on the LAN edge host
        |
        | remote_write over HTTPS + Basic Auth
        v
Nginx on OCI
        |
        v
VictoriaMetrics
        |
        +-- Grafana dashboards
        +-- Go backend API
```

This repository also contains a SolidStart frontend, but frontend implementation is intentionally out of scope for the production documentation below. The operational source of truth for metrics collection, storage, Grafana, and the backend API is under `infra/`, `app/backend/`, `app/mock-server/`, `dashboards/`, and `docs/`.

## Repository Layout

```text
infra/
  edge/                  # vmagent collector that runs near the sensor
  oci/                   # OCI Docker Compose stack and Nginx config
app/
  backend/               # Go + Gin API proxy for VictoriaMetrics
  mock-server/           # local fake backend API for development/demo use
dashboards/
  airgradient-one.json   # Grafana dashboard provisioned into Grafana
docs/
  index.md               # documentation map
  architecture.md        # system design and data flow
  configuration.md       # environment variables and config files
  deployment.md          # production deployment guide
  operations.md          # day-2 runbooks
  security.md            # threat model and hardening notes
  backend.md             # backend internals
  api.md                 # API contract
  metrics.md             # metric catalog and mappings
  grafana.md             # Grafana provisioning and dashboard notes
  development.md         # non-frontend development workflow
  troubleshooting.md     # diagnosis guide
```

## Quick Start

Start with the documentation entry point:

- [Documentation Index](docs/index.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Deployment](docs/deployment.md)
- [Operations](docs/operations.md)
- [Troubleshooting](docs/troubleshooting.md)

## Production Shape

The recommended deployment uses two hosts:

- LAN edge host: runs only `vmagent`, can reach the AirGradient device, and buffers remote-write samples locally.
- OCI host: runs Nginx, VictoriaMetrics, Grafana, the Go backend, and supporting Docker volumes.

Only Nginx publishes host ports `80` and `443`. VictoriaMetrics port `8428`, Grafana port `3000`, and backend port `8080` stay private inside the Docker network.

## Local Backend Development

Run the real backend against local or remote VictoriaMetrics:

```bash
cd app/backend
VM_URL=http://localhost:8428 go run ./cmd/server
```

Run checks:

```bash
cd app/backend
go test ./...
```

Run the mock backend when VictoriaMetrics is not available:

```bash
cd app/mock-server
go run .
```

## Metric Defaults

The backend currently exposes these normalized keys:

| API key | VictoriaMetrics metric |
|---|---|
| `co2` | `airgradient_co2_ppm` |
| `pm25` | `airgradient_pm2d5_ugm3` |
| `voc` | `airgradient_tvoc_index` |
| `nox` | `airgradient_nox_index` |
| `temperature` | `airgradient_temperature_celsius` |
| `humidity` | `airgradient_humidity_percent` |

If your AirGradient firmware emits different names, override them with `METRIC_*` environment variables on the backend and update Grafana dashboard queries to match.

## Current State

Implemented:

- LAN scraping with `vmagent`
- remote write to VictoriaMetrics through Nginx
- VictoriaMetrics storage with 12-month retention
- Grafana datasource and dashboard provisioning
- Go backend API with metric normalization, timeouts, TTL cache, and request coalescing
- local mock backend API

Planned or recommended before serious production use:

- pin VictoriaMetrics, vmagent, and Grafana image versions
- add VictoriaMetrics backup or OCI volume snapshot policy
- add alerting rules for stale samples, high CO2, and high PM2.5
- add backend unit tests around cache and VictoriaMetrics response handling
- decide whether direct `/victoriametrics/` access should remain public behind auth or be removed
