# Security

## Public Endpoint Inventory

The OCI VM should expose only HTTPS through a reverse proxy.

Expected public paths:

- `/api/v1/write` for vmagent remote write
- `/api/` for the Go backend API
- `/grafana/` for Grafana
- `/victoriametrics/` only if direct query/debug access is intentionally needed

## Do Not Expose VictoriaMetrics Directly

VictoriaMetrics listens on:

```text
victoriametrics:8428 inside the Docker network
```

Do not bind this publicly.

## Auth Model

The first deployment uses reverse proxy Basic Auth.

Use it for:

- vmagent remote write
- Go backend API at `/api/`
- Grafana
- direct VictoriaMetrics debug paths

The Solid frontend should not know VictoriaMetrics credentials.

## Credential Separation

The current examples use `VM_USER` and `VM_PASSWORD` in two contexts:

- edge vmagent remote write credentials
- backend credentials when querying VictoriaMetrics through an authenticated reverse proxy

Those may be the same in a small deployment, but they are different trust boundaries. In production, prefer separate secrets and document where each one is used.

## TLS

Terminate TLS at the Nginx container.

The Nginx container expects:

```text
infra/oci/certs/fullchain.pem
infra/oci/certs/privkey.pem
infra/oci/.htpasswd
```

## Firewall

Recommended public ingress:

- `80/tcp` only for redirect or certificate challenge
- `443/tcp` for HTTPS

Keep these private to the Docker network:

- `8428/tcp`
- `3000/tcp`
- `8080/tcp`

## Image Versions

The scaffold currently uses `latest` for VictoriaMetrics, vmagent, and Grafana while the project is evolving.

Before production, pin image versions in:

- `infra/oci/docker-compose.vm.yml`
- `infra/edge/docker-compose.vmagent.yml`
