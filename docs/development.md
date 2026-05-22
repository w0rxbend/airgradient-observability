# Development

This page covers non-frontend development: Go backend, mock server, infrastructure, dashboards, and documentation.

## Prerequisites

- Go 1.23+
- Docker Engine with Compose v2
- curl or wget
- ripgrep for repository inspection

Frontend toolchain setup is intentionally out of scope for this page.

## Backend Development

Install dependencies and run checks:

```bash
cd app/backend
go mod download
go test ./...
```

Run against local VictoriaMetrics:

```bash
VM_URL=http://localhost:8428 go run ./cmd/server
```

Run against production VictoriaMetrics through Nginx:

```bash
VM_URL=https://YOUR_DOMAIN/victoriametrics \
VM_USER=airgradient \
VM_PASSWORD='CHANGE_ME' \
go run ./cmd/server
```

Smoke test:

```bash
curl 'http://localhost:8080/healthz'
curl 'http://localhost:8080/api/metrics/current'
```

## Mock Server

The mock server implements the backend API with deterministic generated data:

```bash
cd app/mock-server
go run .
```

Default address:

```text
:8081
```

Override:

```bash
ADDR=:9000 go run .
go run . --addr :9000
```

Smoke test:

```bash
curl 'http://localhost:8081/api/metrics/current'
curl 'http://localhost:8081/api/metrics/range?metric=co2&range=24h&step=5m'
```

## Local VictoriaMetrics

The OCI Compose stack can be used locally if Docker is available and required cert/auth files exist:

```bash
cd infra/oci
DOMAIN=localhost docker compose -f docker-compose.vm.yml up -d victoriametrics
```

For simpler backend-only work, you can also run VictoriaMetrics directly with Docker:

```bash
docker run --rm -p 8428:8428 victoriametrics/victoria-metrics:latest
```

## Metric Catalog Changes

When adding or changing a metric:

1. inspect real scrape output in `app/backend/metrics` or VictoriaMetrics
2. update `app/backend/internal/metrics/definitions.go`
3. update [Metrics Catalog](metrics.md)
4. update [API Reference](api.md) if the public contract changes
5. update `dashboards/airgradient-one.json` if Grafana should show it
6. run backend checks

Backend checks:

```bash
cd app/backend
go test ./...
```

## Dashboard Changes

Grafana dashboard source of truth:

```text
dashboards/airgradient-one.json
```

Use Grafana UI for exploration, export JSON, then commit the dashboard JSON. Keep query metric names aligned with the backend catalog unless a dashboard intentionally visualizes extra raw scrape metrics.

## Infrastructure Changes

Validate Compose files:

```bash
cd infra/oci
DOMAIN=example.com docker compose -f docker-compose.vm.yml config

cd ../edge
DOMAIN=example.com VM_USER=user VM_PASSWORD=pass \
docker compose -f docker-compose.vmagent.yml config
```

Validate Nginx config through the container:

```bash
cd infra/oci
DOMAIN=example.com docker compose -f docker-compose.vm.yml run --rm nginx \
  /bin/sh -c "envsubst '\$DOMAIN' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && nginx -t"
```

## Documentation Changes

Docs should stay synchronized with code and config:

- metric names in `definitions.go`, `docs/metrics.md`, `docs/grafana.md`, and `.env.example`
- public API in `cmd/server/main.go`, `docs/api.md`, and `docs/backend.md`
- routes in `infra/oci/nginx.conf`, `docs/architecture.md`, `docs/configuration.md`, and `docs/security.md`
- operational commands in `docs/deployment.md`, `docs/operations.md`, and `docs/troubleshooting.md`

## Current Test Gap

The backend currently compiles but has no unit tests. The highest-value tests to add are:

- `statusFor` threshold behavior
- `withFilter` selector behavior
- config duration parsing
- cache expiry and lazy deletion
- API error mapping with mocked metrics service
- VictoriaMetrics vector/matrix parsing with empty, one-series, and multi-series results
