# Deployment

This guide deploys the non-frontend observability stack: LAN `vmagent`, OCI Caddy, VictoriaMetrics, Grafana, and the Go backend. The Compose stack also starts the frontend service because Caddy routes `/` to it, but frontend implementation is not covered here.

## Prerequisites

OCI host:

- public DNS record such as `metrics.example.com`
- Docker Engine with Compose v2
- inbound firewall allowing `80/tcp` and `443/tcp`
- persistent disk capacity for VictoriaMetrics retention

LAN edge host:

- Docker Engine with Compose v2
- network reachability to `http://airgradient_xxx.local:80/metrics`
- outbound HTTPS reachability to the OCI domain
- enough disk for `vmagent` retry buffer

Workstation:

- repository checkout
- ability to copy files to both hosts

## 1. Prepare DNS

Point the production domain at the OCI host:

```text
metrics.example.com -> OCI public IP
```

Caddy obtains and renews HTTPS certificates automatically. Make sure OCI security lists, network security groups, and the host firewall allow inbound `80/tcp` and `443/tcp`.

## 2. Create Basic Auth Credentials

Generate a Caddy bcrypt password hash:

```bash
cd infra/oci
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'CHANGE_ME'
```

Use a strong password. Save the resulting hash in your shell or `infra/oci/.env` as `BASIC_AUTH_HASH`. The edge collector's `VM_USER` and `VM_PASSWORD` must match this Basic Auth user and the plaintext password used to create the hash. This credential protects remote write, the backend API, Grafana, and direct VictoriaMetrics debug access in the current Caddy config.

## 3. Configure Edge Scraping

Edit `infra/edge/vm-agent-airgradient/prometheus.yml`:

```yaml
targets:
  - airgradient_xxx.local:80
labels:
  location: home
  device: airgradient_one
```

Recommendations:

- use a static DHCP lease or stable hostname for the sensor
- keep `device` aligned with `AIRGRADIENT_LABEL_FILTER`
- set `location` to a meaningful stable value such as `living_room` or `office`

Verify the sensor from the edge host:

```bash
curl -fsS 'http://airgradient_xxx.local/metrics' | head
```

## 4. Start The OCI Stack

From the OCI host:

```bash
cd infra/oci
DOMAIN=metrics.example.com \
BASIC_AUTH_USER=airgradient \
BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml up -d
```

Check status:

```bash
docker compose -f docker-compose.vm.yml ps
docker compose -f docker-compose.vm.yml logs --tail=100 caddy
docker compose -f docker-compose.vm.yml logs --tail=100 victoriametrics
docker compose -f docker-compose.vm.yml logs --tail=100 backend
```

Validate the rendered Compose config if startup fails:

```bash
DOMAIN=metrics.example.com \
BASIC_AUTH_USER=airgradient \
BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml config
```

## 5. Start The Edge Collector

From the LAN edge host:

```bash
cd infra/edge/vm-agent-airgradient
DOMAIN=metrics.example.com \
VM_USER=airgradient \
VM_PASSWORD='CHANGE_ME' \
docker compose -f docker-compose.vmagent.yml up -d
```

Check logs:

```bash
docker compose -f docker-compose.vmagent.yml logs -f vmagent-airgradient
```

`vmagent` should scrape locally and remote-write to:

```text
https://metrics.example.com/api/v1/write
```

## 6. Verify Ingestion

On the OCI host, query VictoriaMetrics directly inside the Docker network:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

List stored metric names:

```bash
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/label/__name__/values'
```

Expected AirGradient names include:

```text
airgradient_co2_ppm
airgradient_pm2d5_ugm3
airgradient_tvoc_index
airgradient_nox_index
airgradient_temperature_celsius
airgradient_humidity_percent
```

## 7. Verify Backend API

Through public Caddy:

```bash
curl -u airgradient:'CHANGE_ME' \
  'https://metrics.example.com/api/healthz'

curl -u airgradient:'CHANGE_ME' \
  'https://metrics.example.com/api/metrics/current'

curl -u airgradient:'CHANGE_ME' \
  'https://metrics.example.com/api/metrics/range?metric=co2&range=24h&step=60s'
```

Inside the OCI Docker network:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec backend \
  wget -qO- 'http://localhost:8080/healthz'
```

## 8. Verify Grafana

Open:

```text
https://metrics.example.com/grafana/
```

Then check:

- datasource `VictoriaMetrics` exists and is default
- folder `AirGradient` exists
- dashboard panels have data
- variables `device` and `location` populate

## Production Readiness Checklist

Before relying on this stack:

- replace all placeholder domain and password values
- confirm real AirGradient metric names from VictoriaMetrics
- confirm `device` and `location` labels are present
- pin Docker image versions
- define backup/snapshot policy for `vmdata` and `grafanadata`
- decide whether `/victoriametrics/` should remain publicly routed
- create a restore drill for VictoriaMetrics data
- add monitoring or alerts for stale samples and failed remote writes
- record operating passwords in your secret-management system

## Updating A Deployment

Pull new repository changes, review diffs, then:

```bash
cd infra/oci
DOMAIN=metrics.example.com \
BASIC_AUTH_USER=airgradient \
BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml up -d --build
```

For edge config changes:

```bash
cd infra/edge/vm-agent-airgradient
DOMAIN=metrics.example.com \
VM_USER=airgradient \
VM_PASSWORD='CHANGE_ME' \
docker compose -f docker-compose.vmagent.yml up -d
```

Use [Operations](operations.md) for routine checks after updates.
