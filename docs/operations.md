# Operations

This page is the day-2 runbook for the LAN edge collector and OCI metrics stack.

## Routine Health Checks

Edge:

```bash
cd infra/edge
docker compose -f docker-compose.vmagent.yml ps
docker compose -f docker-compose.vmagent.yml logs --tail=100 vmagent
```

OCI:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml ps
docker compose -f docker-compose.vm.yml logs --tail=100 nginx
docker compose -f docker-compose.vm.yml logs --tail=100 victoriametrics
docker compose -f docker-compose.vm.yml logs --tail=100 backend
docker compose -f docker-compose.vm.yml logs --tail=100 grafana
```

Backend:

```bash
curl -u airgradient:'CHANGE_ME' 'https://YOUR_DOMAIN/api/healthz'
curl -u airgradient:'CHANGE_ME' 'https://YOUR_DOMAIN/api/metrics/current'
```

VictoriaMetrics:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

Grafana:

```text
https://YOUR_DOMAIN/grafana/
```

## Freshness Checks

A healthy stack should show:

- `vmagent` scrape logs without repeated failures
- recent timestamps in backend `/api/metrics/current`
- Grafana sample-age panel near the configured scrape interval
- no long-term growth in `vmagentdata` caused by remote-write failure

List all AirGradient metrics:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/label/__name__/values'
```

Check labels:

```bash
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/series?match[]=airgradient_co2_ppm'
```

## Retention

VictoriaMetrics retention is configured in `infra/oci/docker-compose.vm.yml`:

```text
-retentionPeriod=12
```

This means 12 months. Size disk capacity based on:

- scrape interval
- number of metric series
- retention period
- future sensors or labels

## Volumes

Docker volumes:

| Volume | Contents |
|---|---|
| `vmdata` | VictoriaMetrics time-series storage |
| `grafanadata` | Grafana database, settings, users, plugins |
| `vmagentdata` | edge remote-write retry buffer |

Inspect volumes:

```bash
docker volume ls | grep -E 'vmdata|grafanadata|vmagentdata'
```

## Backups

Minimum production posture:

- OCI block volume snapshots for the Docker data path or specific named volumes
- documented restore procedure
- periodic restore test

Recommended policy:

- daily snapshots for `vmdata`
- weekly restore drill while the project is still changing
- retain Grafana dashboard JSON in git, but still back up `grafanadata` if UI edits or users matter

Do not treat Grafana provisioning files as a complete backup of Grafana state if users, preferences, or UI changes are created in Grafana.

## Certificate Renewal

Nginx reads:

```text
infra/oci/certs/fullchain.pem
infra/oci/certs/privkey.pem
```

After replacing certificates:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml restart nginx
```

Validate:

```bash
curl -I 'https://YOUR_DOMAIN/api/healthz'
```

## Credential Rotation

To rotate Basic Auth:

```bash
cd infra/oci
docker run --rm httpd:2.4-alpine htpasswd -Bbn airgradient 'NEW_PASSWORD' > .htpasswd
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml restart nginx
```

Then update the edge host:

```bash
cd infra/edge
DOMAIN=YOUR_DOMAIN \
VM_USER=airgradient \
VM_PASSWORD='NEW_PASSWORD' \
docker compose -f docker-compose.vmagent.yml up -d
```

Watch `vmagent` logs until remote write succeeds.

## Upgrades

Before upgrading:

- read release notes for VictoriaMetrics, vmagent, Grafana, Go, and Nginx images
- take or confirm a recent snapshot
- record current image digests/tags
- run `docker compose config` for syntax validation

Upgrade OCI stack:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml pull
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml up -d --build
```

Upgrade edge:

```bash
cd infra/edge
DOMAIN=YOUR_DOMAIN VM_USER=airgradient VM_PASSWORD='...' \
docker compose -f docker-compose.vmagent.yml pull
DOMAIN=YOUR_DOMAIN VM_USER=airgradient VM_PASSWORD='...' \
docker compose -f docker-compose.vmagent.yml up -d
```

## Incident Response

### No New Samples

1. Check AirGradient `/metrics` from the edge host.
2. Check `vmagent` logs.
3. Check Nginx logs for `POST /api/v1/write`.
4. Query VictoriaMetrics for recent `airgradient_co2_ppm`.
5. Confirm TLS and Basic Auth credentials.

### Backend API Fails

1. Check `backend` container status.
2. Query `http://localhost:8080/healthz` inside the container.
3. Check `VM_URL`, `VM_QUERY_TIMEOUT`, and VictoriaMetrics status.
4. Query VictoriaMetrics directly from the OCI host.

### Grafana Has No Data

1. Test datasource in Grafana.
2. Query `{__name__=~"airgradient_.*"}`.
3. Confirm dashboard metric names match current firmware.
4. Confirm `device` and `location` variables are populated.

## When To Page Yourself

For a personal/home deployment, urgent action is usually needed when:

- no samples have arrived for more than one hour while the sensor is online
- `vmagentdata` grows continuously
- TLS certificate expires or Nginx stops
- VictoriaMetrics volume approaches disk capacity
- backend `/api/metrics/current` returns errors for more than a few minutes
