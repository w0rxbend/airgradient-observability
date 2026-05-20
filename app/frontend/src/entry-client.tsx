import { mount, StartClient } from "@solidjs/start/client";

export default function start() {
  mount(() => <StartClient />, document.getElementById("app")!);
}
