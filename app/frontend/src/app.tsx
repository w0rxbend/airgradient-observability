import { Route, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import Dashboard from "./routes";
import "./global.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <main class="shell">
          <header class="topbar">
            <div class="topbar-brand">
              <div class="topbar-icon" aria-hidden="true">🌿</div>
              <div>
                <div class="topbar-title">AirGradient</div>
                <div class="topbar-subtitle">Indoor air quality observability</div>
              </div>
            </div>
            <div class="topbar-actions">
              <a href="/api/healthz" class="api-link" aria-label="Backend health check">
                Backend status
              </a>
            </div>
          </header>
          {props.children}
        </main>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
