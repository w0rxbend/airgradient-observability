import { Route, Router } from "@solidjs/router";
import { onMount } from "solid-js";
import Dashboard from "./routes";
import Kiosk from "./routes/kiosk";
import KioskOled from "./routes/kiosk-oled";
import { applyTheme, theme } from "./lib/theme";
import "./global.css";

export default function App() {
  onMount(() => applyTheme(theme()));

  return (
    <Router root={(props) => props.children}>
      <Route path="/" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/kiosk-oled" component={KioskOled} />
    </Router>
  );
}
