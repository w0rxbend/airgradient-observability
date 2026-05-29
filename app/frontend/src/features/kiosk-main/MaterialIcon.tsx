import { Match, Switch } from "solid-js";

export function MaterialIcon(props: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <Switch fallback={<path d="M5 12h14M12 5v14" />}>
        <Match when={props.name === "dashboard"}>
          <path d="M4 5a1 1 0 0 1 1-1h6v7H4zM13 4h6a1 1 0 0 1 1 1v4h-7zM4 13h7v7H5a1 1 0 0 1-1-1zM13 11h7v8a1 1 0 0 1-1 1h-6z" />
        </Match>
        <Match when={props.name === "air"}>
          <path d="M4 8h10a3 3 0 1 0-3-3" />
          <path d="M3 12h16a3 3 0 1 1-3 3" />
          <path d="M5 17h7a2 2 0 1 1-2 2" />
        </Match>
        <Match when={props.name === "home"}>
          <path d="m3 11 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </Match>
        <Match when={props.name === "science"}>
          <path d="M10 3h4M11 3v5l-6 10a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3L13 8V3" />
          <path d="M8 15h8" />
        </Match>
        <Match when={props.name === "sensors"}>
          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
          <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
        </Match>
        <Match when={props.name === "warning"}>
          <path d="M12 3 2 21h20z" />
          <path d="M12 9v5M12 17h.01" />
        </Match>
        <Match when={props.name === "thermostat"}>
          <path d="M10 4a2 2 0 0 1 4 0v8.2a5 5 0 1 1-4 0z" />
          <path d="M12 7v8" />
        </Match>
        <Match when={props.name === "water"}>
          <path d="M12 3C8 8 6 11 6 15a6 6 0 0 0 12 0c0-4-2-7-6-12z" />
        </Match>
        <Match when={props.name === "cloud"}>
          <path d="M6 18h11a4 4 0 0 0 .5-8 6 6 0 0 0-11.2 1.8A3.2 3.2 0 0 0 6 18z" />
        </Match>
        <Match when={props.name === "grain"}>
          <circle cx="7" cy="8" r="1.5" />
          <circle cx="14" cy="6" r="1.5" />
          <circle cx="17" cy="13" r="1.5" />
          <circle cx="8" cy="16" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
        </Match>
        <Match when={props.name === "bubble"}>
          <circle cx="8" cy="14" r="4" />
          <circle cx="15" cy="8" r="3" />
          <circle cx="17" cy="17" r="2" />
        </Match>
        <Match when={props.name === "bolt"}>
          <path d="m13 2-8 12h6l-1 8 9-13h-6z" />
        </Match>
      </Switch>
    </svg>
  );
}
