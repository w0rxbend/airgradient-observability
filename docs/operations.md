# Operations

## Routine Checks

Edge collector:

```bash
cd infra/edge
docker compose -f docker-compose.vmagent.yml logs -f vmagent
```

OCI services:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml ps
docker compose -f docker-compose.vm.yml logs -f victoriametrics
docker compose -f docker-compose.vm.yml logs -f nginx
docker compose -f docker-compose.vm.yml logs -f backend
docker compose -f docker-compose.vm.yml logs -f grafana
```

## VictoriaMetrics

Check a current sample:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml exec victoriametrics wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

List metric names:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics wget -qO- 'http://localhost:8428/api/v1/label/__name__/values'
```

## Backend

Health:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec backend wget -qO- 'http://localhost:8080/healthz'
```

Current metrics:

```bash
curl -u airgradient:CHANGE_ME 'https://YOUR_DOMAIN/api/metrics/current'
```

Range query:

```bash
curl -u airgradient:CHANGE_ME 'https://YOUR_DOMAIN/api/metrics/range?metric=co2&range=24h&step=60s'
```

## Retention

VictoriaMetrics retention is set in `infra/oci/docker-compose.vm.yml`:

```text
-retentionPeriod=12
```

This means 12 months.

## Backups

The first version uses Docker volumes:

- `vmdata`
- `grafanadata`

Before production use, decide whether OCI volume snapshots are sufficient or whether VictoriaMetrics backups should be added.

## Security

Do not expose VictoriaMetrics port `8428` publicly.

Public access should go through reverse proxy TLS and Basic Auth. Keep these paths deliberate:

- allow remote write at `/api/v1/write`
- allow app API at `/api/`
- expose Grafana only behind auth
