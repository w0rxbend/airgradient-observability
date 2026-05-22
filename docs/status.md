# Plan Alignment

This page tracks the implementation against the intended production topology.

## Target Topology

```text
AirGradient ONE
  /metrics on LAN
        |
        v
vmagent
        |
        v
Nginx on OCI
        |
        v
VictoriaMetrics
        |
        +-- Grafana
        +-- Go backend API
```

The repository also contains a frontend service, but frontend implementation is outside the scope of this status page.

## Milestones

| Milestone | Status | Evidence |
|---|---|---|
| M1: scrape AirGradient locally | implemented | `infra/edge/prometheus.yml` |
| M2: remote-write to OCI | implemented | `infra/edge/docker-compose.vmagent.yml` writes to `/api/v1/write` |
| M3: store metrics in VictoriaMetrics | implemented | `infra/oci/docker-compose.vm.yml` service `victoriametrics` |
| M4: route public traffic through Nginx | implemented | `infra/oci/nginx.conf` |
| M5: provision Grafana datasource/dashboard | implemented | `infra/oci/grafana/*.yml`, `dashboards/airgradient-one.json` |
| M6: expose normalized backend API | implemented | `app/backend/cmd/server/main.go` |
| M7: local mock backend | implemented | `app/mock-server` |
| M8: alerting | planned | no alert rules/provisioning yet |
| M9: production backup policy | planned | docs recommend policy; no automation yet |
| M10: pinned third-party images | planned | several services still use `latest` |

## Known Implementation Constraints

- Backend expects one time series per metric after label filtering.
- Backend cache is process-local and not shared across replicas.
- Backend has no stale-cache fallback.
- Backend exposes six normalized metrics, not every scraped AirGradient metric.
- Grafana dashboard must be manually kept in sync with metric-name changes.
- `/victoriametrics/` is publicly routed behind Basic Auth unless removed.
- Backend unit test coverage has not been added yet.

## Recently Confirmed Metric Mapping

The checked scrape sample in `app/backend/metrics` includes all six backend defaults:

| API key | Metric |
|---|---|
| `co2` | `airgradient_co2_ppm` |
| `pm25` | `airgradient_pm2d5_ugm3` |
| `voc` | `airgradient_tvoc_index` |
| `nox` | `airgradient_nox_index` |
| `temperature` | `airgradient_temperature_celsius` |
| `humidity` | `airgradient_humidity_percent` |

## Recommended Next Work

1. Add backend tests for cache, label filters, validation, and VictoriaMetrics parsing.
2. Pin VictoriaMetrics, vmagent, and Grafana image versions.
3. Add alert rules for stale samples, high CO2, and high PM2.5.
4. Remove or restrict `/victoriametrics/` in production.
5. Define and test backup/restore for `vmdata`.
6. Decide how multi-device support should appear in the API before adding more sensors.
