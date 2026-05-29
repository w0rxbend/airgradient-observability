# Documentation Index

This documentation covers the production observability stack excluding frontend implementation details. It is written for three audiences:

- developers maintaining the Go backend, metric catalog, mock server, and infrastructure code
- operators deploying and running the stack on LAN and OCI hosts
- users who need to verify data, inspect dashboards, and understand the public API

## Read In Order

1. [Architecture](architecture.md): system topology, trust boundaries, and data flow.
2. [Configuration](configuration.md): all environment variables, files, labels, and metric mappings.
3. [Deployment](deployment.md): production deployment checklist for OCI and LAN edge hosts.
4. [Operations](operations.md): routine checks, upgrades, backups, and incident response.
5. [Troubleshooting](troubleshooting.md): symptom-driven diagnosis.

## Reference Docs

- [Backend](backend.md): Go backend internals, cache behavior, query model, and limitations.
- [API Reference](api.md): HTTP endpoints, parameters, responses, and error codes.
- [Metrics Catalog](metrics.md): AirGradient scrape names, normalized API keys, labels, and validation queries.
- [Grafana](grafana.md): datasource provisioning, dashboard contents, variables, and query maintenance.
- [Security](security.md): public endpoint inventory, authentication, TLS, firewall, and production hardening.
- [Development](development.md): non-frontend local development workflow and checks.
- [Plan Alignment](status.md): implementation status and known follow-up work.

## Source Map

| Area | Path | Purpose |
|---|---|---|
| Edge collector | `infra/edge/` | `vmagent` Compose file and Prometheus scrape config |
| OCI stack | `infra/oci/` | Docker Compose, Caddy, Grafana provisioning |
| Backend API | `app/backend/` | Go service that queries VictoriaMetrics |
| Mock API | `app/mock-server/` | Generated API data for local development and demos |
| Dashboards | `dashboards/` | Grafana dashboard JSON |
| Scrape sample | `app/backend/metrics` | Example AirGradient Prometheus exposition |
| Device JSON sample | `app/backend/example.json` | Example AirGradient device JSON payload |

## Production Baseline

Production should satisfy these invariants:

- AirGradient is scraped only from the LAN.
- `vmagent` is the only writer into VictoriaMetrics.
- VictoriaMetrics is not exposed directly on the public internet.
- Caddy is the only public entry point on the OCI VM.
- public HTTP routes require TLS and Basic Auth.
- the backend is the only custom service that queries VictoriaMetrics for app data.
- Grafana uses the internal Docker-network VictoriaMetrics URL.
- metric names and labels are validated after every firmware or scrape-config change.

## Frontend Scope

The repository includes `app/frontend`, but frontend implementation is intentionally excluded from this documentation pass. Where needed, docs mention the frontend only as a service behind Caddy or as a consumer of the backend API contract.
