import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import "./global.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <main class="shell">
          <header class="topbar">
            <div>
              <p class="eyebrow">AirGradient ONE</p>
              <h1>Home air observability</h1>
            </div>
            <a href="/api/healthz" class="api-link">
              Backend
            </a>
          </header>
          {props.children}
        </main>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
