import { Route, Router } from "@solidjs/router";
import { onMount } from "solid-js";
import Dashboard from "./routes";
import Kiosk from "./routes/kiosk";
import KioskMain from "./routes/kiosk-main";
import KioskOled from "./routes/kiosk-oled";
import KioskSwag from "./routes/kiosk-swag";
import { applyTheme, theme } from "./lib/theme";
import "./global.css";

export default function App() {
  onMount(() => applyTheme(theme()));

  return (
    <Router root={(props) => props.children}>
      <Route path="/" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/kiosk-main" component={KioskMain} />
      <Route path="/kiosk-oled" component={KioskOled} />
      <Route path="/kiosk-swag" component={KioskSwag} />
    </Router>
  );
}
