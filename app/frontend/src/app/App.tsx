import { Router } from "@solidjs/router";
import { onMount } from "solid-js";
import { applyTheme, theme } from "../shared/ui/theme";
import { AppRoutes } from "./routes";
import "../global.css";

export default function App() {
  onMount(() => applyTheme(theme()));

  return (
    <Router root={(props) => props.children}>
      <AppRoutes />
    </Router>
  );
}
