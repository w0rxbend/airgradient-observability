import type { JSX } from "solid-js";

type IconProps = { color?: string };

export function IconAQI(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22h28c4 0 7-3 7-7s-3-7-7-7c-3 0-5 1.5-6 4" stroke={color()} stroke-width="3" stroke-linecap="round" />
      <path d="M8 34h36c5 0 9-4 9-9s-4-9-9-9" stroke={color()} stroke-width="3" stroke-linecap="round" opacity="0.7" />
      <path d="M14 46h26c4 0 7-3 7-7s-3-7-7-7" stroke={color()} stroke-width="3" stroke-linecap="round" opacity="0.45" />
      <circle cx="46" cy="48" r="3" fill={color()} />
    </svg>
  );
}

export function IconPM25(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="5"  fill={color()} />
      <circle cx="20" cy="24" r="3.5" fill={color()} opacity="0.85" />
      <circle cx="44" cy="22" r="4"  fill={color()} opacity="0.75" />
      <circle cx="16" cy="38" r="2.5" fill={color()} opacity="0.6" />
      <circle cx="46" cy="40" r="3"  fill={color()} opacity="0.65" />
      <circle cx="30" cy="48" r="2"  fill={color()} opacity="0.5" />
      <circle cx="22" cy="14" r="2"  fill={color()} opacity="0.4" />
      <circle cx="48" cy="32" r="2.5" fill={color()} opacity="0.45" />
    </svg>
  );
}

export function IconCO2(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* C atom */}
      <circle cx="32" cy="32" r="7" stroke={color()} stroke-width="2" />
      <text x="32" y="36.5" text-anchor="middle" font-size="8" font-family="monospace" fill={color()} font-weight="700">C</text>
      {/* Left bond */}
      <line x1="16" y1="28" x2="25" y2="28" stroke={color()} stroke-width="2" opacity="0.8" />
      <line x1="16" y1="36" x2="25" y2="36" stroke={color()} stroke-width="2" opacity="0.8" />
      {/* Right bond */}
      <line x1="39" y1="28" x2="48" y2="28" stroke={color()} stroke-width="2" opacity="0.8" />
      <line x1="39" y1="36" x2="48" y2="36" stroke={color()} stroke-width="2" opacity="0.8" />
      {/* O atoms */}
      <circle cx="10" cy="32" r="6" stroke={color()} stroke-width="2" opacity="0.9" />
      <text x="10" y="36" text-anchor="middle" font-size="7" font-family="monospace" fill={color()} font-weight="700" opacity="0.9">O</text>
      <circle cx="54" cy="32" r="6" stroke={color()} stroke-width="2" opacity="0.9" />
      <text x="54" y="36" text-anchor="middle" font-size="7" font-family="monospace" fill={color()} font-weight="700" opacity="0.9">O</text>
    </svg>
  );
}

export function IconTVOC(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  // Benzene ring style organic molecule
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagon ring */}
      <polygon
        points="32,12 48,21 48,39 32,48 16,39 16,21"
        stroke={color()}
        stroke-width="2.5"
        fill="none"
        opacity="0.85"
      />
      {/* Alternating inner bonds (aromatic) */}
      <line x1="32" y1="17" x2="44" y2="24" stroke={color()} stroke-width="1.5" opacity="0.5" />
      <line x1="44" y1="36" x2="32" y2="43" stroke={color()} stroke-width="1.5" opacity="0.5" />
      <line x1="20" y1="24" x2="20" y2="36" stroke={color()} stroke-width="1.5" opacity="0.5" />
      {/* OH substituent */}
      <line x1="32" y1="12" x2="32" y2="5"  stroke={color()} stroke-width="2" opacity="0.7" />
      <circle cx="32" cy="4" r="2.5" fill={color()} opacity="0.7" />
    </svg>
  );
}

export function IconNOx(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* N atom */}
      <circle cx="22" cy="30" r="9" stroke={color()} stroke-width="2" />
      <text x="22" y="34.5" text-anchor="middle" font-size="10" font-family="monospace" fill={color()} font-weight="700">N</text>
      {/* Bond */}
      <line x1="31" y1="26" x2="37" y2="22" stroke={color()} stroke-width="2" opacity="0.8" />
      <line x1="31" y1="34" x2="37" y2="38" stroke={color()} stroke-width="2" opacity="0.8" />
      {/* O atom */}
      <circle cx="44" cy="24" r="7" stroke={color()} stroke-width="2" opacity="0.85" />
      <text x="44" y="28" text-anchor="middle" font-size="9" font-family="monospace" fill={color()} font-weight="700" opacity="0.85">O</text>
      {/* Subscript x */}
      <text x="54" y="44" text-anchor="middle" font-size="8" font-family="monospace" fill={color()} opacity="0.65">x</text>
    </svg>
  );
}

export function IconTemp(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Thermometer body */}
      <rect x="28" y="10" width="8" height="32" rx="4" stroke={color()} stroke-width="2" />
      {/* Mercury fill */}
      <rect x="30" y="26" width="4" height="16" rx="2" fill={color()} opacity="0.8" />
      {/* Bulb */}
      <circle cx="32" cy="48" r="7" stroke={color()} stroke-width="2" />
      <circle cx="32" cy="48" r="4" fill={color()} opacity="0.85" />
      {/* Tick marks */}
      <line x1="36" y1="18" x2="40" y2="18" stroke={color()} stroke-width="1.5" opacity="0.6" />
      <line x1="36" y1="24" x2="39" y2="24" stroke={color()} stroke-width="1.5" opacity="0.45" />
      <line x1="36" y1="30" x2="40" y2="30" stroke={color()} stroke-width="1.5" opacity="0.6" />
      <line x1="36" y1="36" x2="39" y2="36" stroke={color()} stroke-width="1.5" opacity="0.45" />
    </svg>
  );
}

export function IconHum(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Droplet path */}
      <path
        d="M32 10 C32 10 14 30 14 42 a18 18 0 0 0 36 0 C50 30 32 10 32 10 Z"
        stroke={color()}
        stroke-width="2.5"
        fill={color()}
        fill-opacity="0.15"
      />
      {/* Highlight */}
      <path
        d="M24 36 C22 30 26 22 30 18"
        stroke={color()}
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function IconDewPoint(props: IconProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main droplet (slightly smaller, offset right) */}
      <path
        d="M36 14 C36 14 22 30 22 40 a14 14 0 0 0 28 0 C50 30 36 14 36 14 Z"
        stroke={color()}
        stroke-width="2.5"
        fill={color()}
        fill-opacity="0.15"
      />
      {/* Dew condensation dots around upper portion */}
      <circle cx="18" cy="20" r="2.5" fill={color()} opacity="0.7" />
      <circle cx="12" cy="32" r="2"   fill={color()} opacity="0.55" />
      <circle cx="22" cy="12" r="1.8" fill={color()} opacity="0.45" />
    </svg>
  );
}
