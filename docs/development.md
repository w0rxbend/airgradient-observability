# Development

## Prerequisites

- Go 1.23+
- Node.js 20+
- npm
- Docker with Compose v2 for full-stack runs

## Backend

```bash
cd app/backend
go mod download
VM_URL=http://localhost:8428 go run ./cmd/server
```

Checks:

```bash
cd app/backend
go test ./...
```

## Frontend

```bash
cd app/frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

Checks:

```bash
cd app/frontend
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
```

## Generated Directories

These are ignored:

- `node_modules/`
- `.vinxi/`
- `.output/`
- `dist/`

## Local Development Flow

1. Start VictoriaMetrics, or expect backend metrics endpoints to return `502`.
2. Start the Go backend on `:8080`.
3. Start the Solid frontend on `:3000`.
4. Open `http://localhost:3000/`.

Without VictoriaMetrics, the frontend shell still loads, but gauges cannot populate.
