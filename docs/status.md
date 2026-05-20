# Plan Alignment

This checks the original project idea against the current implementation.

## Target Topology

Original:

```text
AirGradient ONE
  http://airgradient_xxx.local/metrics
        ↓ scrape
vmagent on LAN
        ↓ remote_write over HTTPS
VictoriaMetrics on OCI
        ↓ query
Custom app + Grafana
```

Current:

```text
AirGradient ONE
  http://airgradient_xxx.local/metrics
        ↓ scrape
vmagent on LAN
        ↓ remote_write over HTTPS + Basic Auth
Docker Nginx on OCI
        ↓
VictoriaMetrics on OCI Docker network
        ↓ query
Go backend proxy/cache + Grafana
        ↓
SolidStart frontend
```

The current implementation matches the idea, with two deliberate refinements:

- Nginx is containerized because the OCI host is Docker-only.
- The custom app is split into a Go backend proxy and a SolidStart frontend.

## Milestones

| Milestone | Status | Notes |
|---|---|---|
| M1: vmagent scrapes AirGradient locally | Implemented | `infra/edge/prometheus.yml`; `.local` may require host networking/static IP on some LANs |
| M2: vmagent remote-writes to OCI VictoriaMetrics | Implemented | `infra/edge/docker-compose.vmagent.yml` writes to `/api/v1/write` through Docker Nginx |
| M3: Grafana reads VictoriaMetrics | Implemented | datasource and dashboard provisioning are mounted in the OCI compose stack |
| M4: backend exposes normalized API | Implemented | Go/Gin backend exposes current and range endpoints with cache |
| M5: frontend renders AirGradient display metrics | Implemented | SolidStart dashboard renders CO2, PM2.5, TVOC, NOx, temperature, humidity |
| M6: alerts for thresholds | Planned | thresholds exist in UI/Grafana; alerting rules are not implemented yet |

## Known Follow-Up Work

- Confirm real AirGradient metric names from a live device.
- Add alert rules/provisioning for CO2, PM2.5, and stale samples.
- Add stale-cache fallback and `X-Cache` headers in the backend.
- Pin Docker image versions before production.
- Decide whether `/victoriametrics/` should remain publicly reachable behind Basic Auth or stay internal only.
