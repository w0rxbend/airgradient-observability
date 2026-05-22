import { Route, Router } from "@solidjs/router";
import Dashboard from "./routes";
import Kiosk from "./routes/kiosk";
import "./global.css";

export default function App() {
  return (
    <Router root={(props) => props.children}>
      <Route path="/" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
    </Router>
  );
}
