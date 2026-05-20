# Frontend App

The frontend is a SolidStart app in `app/frontend`.

It renders:

- current AirGradient display-style gauges
- CO2, PM2.5, VOC, NOx, temperature, and humidity
- historical chart by selected metric and time range

## Run Locally

```bash
cd app/frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

Open:

```text
http://localhost:3000/
```

## API Boundary

The browser only calls the SolidStart same-origin API routes:

```http
GET /api/metrics/current
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

SolidStart proxies those requests to the Go backend with the server-only `BACKEND_URL` environment variable. Browser code does not know VictoriaMetrics credentials or backend topology.

## Build

```bash
cd app/frontend
npm run typecheck
npm run build
```

## Styling Direction

The current UI combines:

- Vercel-like density and typography
- shadcn-like borders, controls, and restrained cards
- Diia-inspired blue/yellow accents

The UI should stay dashboard-first: compact, scan-friendly, and useful without a landing page.
