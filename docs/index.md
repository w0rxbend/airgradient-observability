# Documentation

This repo has four moving pieces:

- LAN edge collector: `vmagent`
- OCI time-series storage: VictoriaMetrics
- Backend API: Go + Gin proxy with cache
- UI surfaces: SolidStart app and Grafana dashboard

## Start Here

1. [Architecture](architecture.md)
2. [Configuration](configuration.md)
3. [Deployment](deployment.md)
4. [Troubleshooting](troubleshooting.md)

## Component Docs

- [Backend API](backend.md)
- [API Reference](api.md)
- [Frontend App](frontend.md)
- [Grafana](grafana.md)
- [Metrics Catalog](metrics.md)
- [Operations](operations.md)
- [Security](security.md)
- [Development](development.md)

## Current Milestones

- M1: `vmagent` scrapes AirGradient locally.
- M2: `vmagent` remote-writes to OCI VictoriaMetrics.
- M3: Grafana reads VictoriaMetrics.
- M4: Go backend proxy exposes normalized cached APIs.
- M5: Solid frontend renders AirGradient display metrics.
- M6: Alerts for CO2 and PM2.5 thresholds. Planned.
