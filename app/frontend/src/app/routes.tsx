import { Route } from "@solidjs/router";
import Dashboard from "../routes";
import Kiosk from "../routes/kiosk";
import KioskMain from "../routes/kiosk-main";
import KioskOled from "../routes/kiosk-oled";
import KioskWallboard from "../routes/kiosk-wallboard";
import KioskGauges from "../routes/kiosk-gauges";

export function AppRoutes() {
  return (
    <>
      <Route path="/" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/kiosk-main" component={KioskMain} />
      <Route path="/kiosk-oled" component={KioskOled} />
      <Route path="/kiosk-wallboard" component={KioskWallboard} />
      <Route path="/kiosk-swag" component={KioskWallboard} />
      <Route path="/kiosk-gauges" component={KioskGauges} />
    </>
  );
}
