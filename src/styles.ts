import { TOKENS } from "./tokens";
import weatherPartlyCloudy from "./assets/weather-partly-cloudy.webp?inline";

/**
 * Token-driven H2DC card styling.
 * Liquid surfaces are retained because they are the commissioned visual language, not a generic default.
 */
export const CARD_STYLES = `
:host {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  /* Lovelace can constrain the custom-card host to its measured card height. */
  overflow: visible;
  transform: translate(var(--h2dc-offset-x, 0), var(--h2dc-offset-y, 0));
  color: ${TOKENS.color.onSurface};
  font-family: var(--h2dc-font-family, Aeonik, "Aeonik Pro", Inter, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
  --surface: ${TOKENS.color.surface};
  --surface-raised: ${TOKENS.color.surfaceRaised};
  --surface-active: ${TOKENS.color.surfaceActive};
  --on-surface: ${TOKENS.color.onSurface};
  --on-muted: ${TOKENS.color.onSurfaceMuted};
  --border: ${TOKENS.color.border};
  --accent: ${TOKENS.color.accent};
  --battery: ${TOKENS.color.battery};
  --focus: ${TOKENS.color.focus};
  --gap-1: ${TOKENS.space[1]};
  --gap-2: ${TOKENS.space[2]};
  --gap-3: ${TOKENS.space[3]};
  --gap-4: ${TOKENS.space[4]};
  --gap-6: ${TOKENS.space[6]};
  --gap-8: ${TOKENS.space[8]};
  --gap-12: ${TOKENS.space[12]};
  --gap-16: ${TOKENS.space[16]};
  --radius-s: ${TOKENS.radius.small};
  --radius-m: ${TOKENS.radius.medium};
  --radius-l: ${TOKENS.radius.large};
  --instant: ${TOKENS.motion.instant};
  --micro: ${TOKENS.motion.micro};
  --type-micro: ${TOKENS.typography.micro};
  --type-compact: ${TOKENS.typography.compact};
  --type-page-subheading: ${TOKENS.typography.pageSubheading};
  --keypad-tracking: ${TOKENS.typography.keypadTracking};
}
:host(.admin) { position: relative; inset: auto; z-index: auto; width: auto; height: auto; }
* { box-sizing: border-box; }
.sr-only { position: absolute; inline-size: 0.0625rem; block-size: 0.0625rem; padding: 0; margin: -0.0625rem; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
button, a, input, select { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 0.1875rem solid var(--focus);
  outline-offset: 0.1875rem;
}
.shell {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  padding: var(--gap-6) var(--gap-8);
  background-color: oklch(0.17 0.012 78);
  background-image: linear-gradient(oklch(0.12 0.01 78 / var(--h2dc-overlay-strength, 0.36)), oklch(0.12 0.01 78 / var(--h2dc-overlay-strength, 0.36))), var(--active-background, none);
  background-position: center;
  background-size: cover;
  overflow: auto;
}
.glass {
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius-l);
  background: var(--surface);
  box-shadow: inset 0 0.0625rem 0 oklch(0.98 0.005 78 / 0.1);
}
header { position: relative; min-height: 12rem; }
.brand { position: absolute; inset-block-start: 0; inset-inline-start: 0; font-size: clamp(1.75rem, 2vw + 1rem, 3rem); font-weight: 700; letter-spacing: -0.025em; }
.nav {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 18%;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  width: 64%;
  min-height: 4rem;
  padding: var(--gap-1);
  border: 0.0625rem solid var(--border);
  border-radius: ${TOKENS.radius.round};
  background: var(--surface-raised);
}
.nav a { display: grid; min-height: 3.5rem; place-items: center; border-radius: ${TOKENS.radius.round}; color: var(--on-muted); text-decoration: none; transition: color var(--micro), background var(--micro); }
.nav a.active { color: var(--on-surface); background: oklch(0.98 0.005 78 / 0.12); }
.tools { position: absolute; inset-block-start: var(--gap-4); inset-inline-end: 0; display: flex; gap: var(--gap-4); }
.tools a { color: inherit; }
.intro { position: absolute; inset-block-end: var(--gap-3); inset-inline-start: 0; text-shadow: 0 0.125rem 0.5rem oklch(0.12 0.01 78 / 0.9); }
.intro span, .intro p { color: var(--on-muted); }
.intro .page-subheading {
  max-inline-size: 36ch;
  margin: 0 0 var(--gap-1);
  color: var(--on-surface);
  font-size: var(--type-page-subheading);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-wrap: balance;
}
.intro h1 { margin: var(--gap-1) 0; font-size: clamp(2rem, 2.6vw, 3.5rem); line-height: 1.05; letter-spacing: -0.025em; text-wrap: balance; }
.intro p { margin: 0; font-size: clamp(1rem, 1.2vw, 1.25rem); }
.card-title { display: flex; align-items: center; justify-content: space-between; font-size: 1.25rem; font-weight: 700; }
.card-title a { min-width: 2.75rem; min-height: 2.75rem; display: grid; place-items: center; color: inherit; text-decoration: none; }
.home-grid { display: grid; grid-template-columns: 26% 42% minmax(0, 1fr); grid-template-rows: minmax(23rem, 1fr) 6rem 4.5rem; gap: var(--gap-4); }
.left-stack, .right-stack { display: grid; gap: var(--gap-4); min-width: 0; }
.left-stack { grid-template-rows: 0.8fr 1.2fr; }
.right-stack { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto; }
.clock, .weather, .compact, .controls, .flow { padding: var(--gap-6); }
.clock { display: grid; align-content: center; }
.clock strong { font-size: clamp(3rem, 4.3vw, 5.125rem); line-height: 1; letter-spacing: -0.035em; white-space: nowrap; }
.clock span { margin-block-start: var(--gap-3); color: var(--on-muted); }
.weather, .weather-surface {
  --weather-treatment: linear-gradient(90deg, oklch(0.12 0.01 78 / 0.18), oklch(0.12 0.01 78 / 0.54));
  background-image: var(--weather-treatment), url("${weatherPartlyCloudy}");
  background-position: center;
  background-size: cover;
}
.weather {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--gap-4);
  overflow: hidden;
}
.weather-sunny { --weather-treatment: linear-gradient(90deg, oklch(0.82 0.12 85 / 0.12), oklch(0.12 0.01 78 / 0.42)); filter: saturate(1.15) brightness(1.12); }
.weather-cloudy, .weather-fog { --weather-treatment: linear-gradient(90deg, oklch(0.32 0.02 240 / 0.28), oklch(0.12 0.01 78 / 0.62)); filter: saturate(0.72) brightness(0.88); }
.weather-rainy, .weather-pouring, .weather-lightning-rainy { --weather-treatment: linear-gradient(90deg, oklch(0.24 0.05 240 / 0.44), oklch(0.1 0.02 250 / 0.7)); filter: saturate(0.76) brightness(0.72) hue-rotate(12deg); }
.weather-clear-night { --weather-treatment: linear-gradient(90deg, oklch(0.16 0.05 255 / 0.62), oklch(0.08 0.02 260 / 0.82)); filter: saturate(0.76) brightness(0.62); }
.weather-snowy, .weather-snowy-rainy, .weather-hail { --weather-treatment: linear-gradient(90deg, oklch(0.92 0.02 230 / 0.18), oklch(0.18 0.02 235 / 0.58)); filter: saturate(0.48) brightness(1.04); }
.weather-lightning { --weather-treatment: linear-gradient(90deg, oklch(0.38 0.12 285 / 0.42), oklch(0.08 0.03 260 / 0.78)); filter: saturate(0.7) brightness(0.7); }
.weather-unavailable, .weather-unknown { --weather-treatment: linear-gradient(90deg, oklch(0.18 0.01 78 / 0.72), oklch(0.12 0.01 78 / 0.86)); filter: saturate(0.15) brightness(0.62); }
.weather ha-icon { --mdc-icon-size: 4.5rem; color: var(--accent); }
.weather strong, .weather span, .weather small { display: block; }
.weather strong { font-size: clamp(2.25rem, 3vw, 4rem); }
.weather span, .weather small { color: var(--on-muted); text-transform: capitalize; }
.flow { min-width: 0; }
.topology { height: 31.25rem; }
.topology svg { width: 100%; height: 100%; overflow: visible; font-family: inherit; }
.track { fill: none; stroke: oklch(0.79 0.012 78 / 0.42); stroke-linecap: round; stroke-linejoin: round; stroke-width: 4; }
.track.active { stroke: var(--accent); stroke-width: 5; }
.flow-arrow { fill: var(--accent); }
.node circle { fill: oklch(0.18 0.01 78 / 0.66); stroke: var(--border); stroke-width: 2; }
.node.active circle, .home-node circle { stroke: var(--accent); stroke-width: 4; }
.node text { fill: var(--on-muted); text-anchor: middle; }
.node .value, .home-reading .value { fill: var(--on-surface); font-size: 1.35rem; font-weight: 700; }
.home-node foreignObject, .node foreignObject { color: var(--accent); }
.home-node ha-icon, .node ha-icon { width: 100%; height: 100%; --mdc-icon-size: 100%; }
.home-reading text { fill: var(--on-muted); }
.home-reading .value { fill: var(--accent); }
.battery-flow-status { text-anchor: end; }
.battery-flow-status text { fill: var(--on-muted); }
.battery-flow-status .value { fill: var(--accent); font-size: 1.35rem; font-weight: 700; }
.battery-flow-status.charging text,
.battery-flow-status.charging .value,
.battery-flow-status.charging .charging-bolt { fill: var(--battery); }
.battery-flow-status.discharging text,
.battery-flow-status.discharging .value { fill: var(--accent); }
.climate-body { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.climate-reading strong, .climate-reading small { display: block; }
.climate-reading strong { font-size: clamp(1.4rem, 2vw, 2.1rem); white-space: nowrap; }
.climate-reading small { color: var(--on-muted); }
.cooling-control { display: grid; grid-template-columns: minmax(6.5rem, 1fr) auto; align-items: center; gap: var(--gap-2); }
.cool-toggle, .target-control button, .media-action, .control, .light-toggle, .alarm-action, .light-card-surface {
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius-m);
  background: oklch(0.98 0.005 78 / 0.07);
  color: var(--on-surface);
}
.cool-toggle { display: flex; align-items: center; gap: var(--gap-2); padding: var(--gap-2); }
.cool-toggle span, .cool-toggle b, .cool-toggle small { display: block; }
.cool-toggle small { color: var(--on-muted); white-space: nowrap; }
.cool-toggle.cool { color: oklch(0.78 0.12 230); border-color: oklch(0.78 0.12 230 / 0.7); background: oklch(0.78 0.12 230 / 0.16); }
.target-control { display: flex; align-items: center; gap: var(--gap-1); white-space: nowrap; }
.target-control strong { min-width: 3.25rem; text-align: center; }
.media-row { display: flex; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.media-row div { flex: 1; min-width: 0; }
.media-row strong, .media-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-row small { color: var(--on-muted); }
.media-artwork { display: block; width: 100%; height: 100%; object-fit: cover; border: 0.0625rem solid var(--border); border-radius: var(--radius-m); background: var(--surface-raised); }
.compact-artwork { width: var(--gap-12); height: var(--gap-12); flex: 0 0 var(--gap-12); }
.media-artwork-fallback { display: grid; place-items: center; color: var(--on-muted); }
.media-artwork-fallback ha-icon { --mdc-icon-size: 52%; }
.controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap-2); }
.controls .card-title { grid-column: 1 / -1; }
.control { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); text-align: center; }
.control span, .control small { display: block; }
.control small { color: var(--on-muted); text-transform: capitalize; }
.control.on, .light-card.on, .switch-card.on { color: var(--on-surface); border-color: var(--accent); background: var(--surface-active); }
.control.on ha-icon,
.light-card.on .round,
.light-card.on .light-toggle-icon,
.light-card.on .light-state b,
.switch-card.on .round,
.switch-card.on .light-toggle-icon,
.switch-card.on .light-state b { color: var(--accent); }
.light-card.on .light-heading small,
.switch-card.on .light-heading small { color: var(--on-surface); }
.summary-row { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap-4); }
.pulse-row { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap-4); }
.pulse-card { display: flex; min-height: 4.5rem; align-items: center; gap: var(--gap-3); padding: var(--gap-3) var(--gap-4); }
.pulse-card div, .pulse-card strong, .pulse-card small { display: block; min-width: 0; }
.pulse-card small { overflow: hidden; color: var(--on-muted); text-overflow: ellipsis; white-space: nowrap; }
.pulse-icon { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; place-items: center; border: 0.0625rem solid var(--border); border-radius: var(--radius-m); color: var(--accent); }
[data-density="compact"] { --gap-4: ${TOKENS.space[3]}; --gap-6: ${TOKENS.space[4]}; --gap-8: ${TOKENS.space[6]}; }
[data-kiosk-profile="tablet_portrait"] .home-grid, [data-kiosk-profile="phone"] .home-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
[data-kiosk-profile="tablet_portrait"] .summary-row, [data-kiosk-profile="tablet_portrait"] .pulse-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
[data-kiosk-profile="phone"] .summary-row, [data-kiosk-profile="phone"] .pulse-row { grid-template-columns: 1fr; }
.summary { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-4); color: inherit; text-decoration: none; }
.summary div { flex: 1; }
.summary strong, .summary small { display: block; }
.summary small { color: var(--on-muted); }
.round { display: grid; width: 3rem; height: 3rem; flex: 0 0 auto; place-items: center; border: 0.0625rem solid oklch(0.79 0.15 82 / 0.42); border-radius: ${TOKENS.radius.round}; color: var(--accent); background: oklch(0.79 0.15 82 / 0.12); }
.page-grid { display: grid; gap: var(--gap-4); }
.security-grid { grid-template-columns: 22% minmax(0, 1fr); height: calc(100vh - 15rem); min-height: 0; overflow: hidden; }
.alarm-stack { display: grid; min-height: 0; grid-template-rows: minmax(0, .82fr) minmax(0, 1.18fr); gap: var(--gap-3); }
.alarm { display: grid; min-height: 0; padding: var(--gap-4); text-align: center; }
.alarm-status { display: flex; align-items: center; justify-content: center; gap: var(--gap-3); text-transform: capitalize; }
.alarm-ring { display: grid; width: 4.5rem; height: 4.5rem; place-items: center; border: 0.1875rem solid var(--accent); border-radius: ${TOKENS.radius.round}; }
.alarm-ring ha-icon { --mdc-icon-size: 2.25rem; }
.alarm-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap-2); }
.alarm-action { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); }
.alarm-keypad { display: grid; min-height: 0; padding: var(--gap-3); grid-template-rows: auto auto minmax(0, 1fr); gap: var(--gap-2); }
.keypad-display { display: grid; min-height: 2.5rem; place-items: center; border: 0.0625rem solid var(--border); border-radius: var(--radius-m); color: var(--on-muted); font-variant-numeric: tabular-nums; letter-spacing: var(--keypad-tracking); }
.keypad-grid { display: grid; min-height: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(2.75rem, 1fr)); gap: var(--gap-1); }
.keypad-key { min-width: 2.75rem; min-height: 2.75rem; border: 0.0625rem solid var(--border); border-radius: var(--radius-s); color: var(--on-surface); background: var(--surface-raised); }
.keypad-submit { color: var(--accent); border-color: var(--accent); }
.keypad-secondary { color: var(--on-muted); font-size: var(--type-micro); }
.camera-grid { display: grid; min-height: 0; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: var(--gap-3); overflow: hidden; }
.camera { position: relative; display: block; width: 100%; height: 100%; min-height: 0; margin: 0; padding: 0; overflow: hidden; border: 0.0625rem solid var(--border); border-radius: var(--radius-l); color: inherit; background: oklch(0.15 0.01 78); text-align: start; }
.camera img { width: 100%; height: 100%; object-fit: cover; }
.camera-caption { position: absolute; inset: auto 0 0; display: flex; justify-content: space-between; gap: var(--gap-2); padding: var(--gap-3); background: linear-gradient(transparent, oklch(0.12 0.01 78 / 0.85)); }
.camera-caption span { color: var(--on-muted); }
.camera-action { cursor: pointer; }
.camera-action:focus-visible { outline: 0.1875rem solid var(--focus); outline-offset: -0.25rem; }
.camera-missing { display: grid; height: 100%; min-height: 0; place-items: center; align-content: center; gap: var(--gap-2); color: var(--on-muted); }
.energy-workspace {
  display: grid;
  grid-template-columns: minmax(14rem, 0.78fr) minmax(30rem, 1.7fr) minmax(15rem, 0.86fr);
  gap: var(--gap-4);
  height: calc(100vh - 15rem);
  min-height: 35rem;
  overflow: hidden;
}
.energy-rail { display: grid; min-width: 0; gap: var(--gap-3); align-content: stretch; }
.energy-rail-left { grid-template-rows: 1.05fr 0.9fr auto; }
.energy-rail-right { grid-template-rows: 1fr 0.9fr auto; }
.energy-panel { display: grid; min-height: 0; padding: var(--gap-4); align-content: start; gap: var(--gap-2); overflow: hidden; }
.energy-metric {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  min-height: 3rem;
  padding: var(--gap-2) 0;
  border: 0;
  border-block-end: 0.0625rem solid var(--border);
  color: var(--on-surface);
  background: transparent;
  text-align: start;
}
.energy-metric span { color: var(--on-muted); }
.energy-metric strong { margin-inline: var(--gap-2); white-space: nowrap; }
.energy-note { display: grid; gap: var(--gap-1); margin: var(--gap-2) 0 0; color: var(--on-muted); line-height: 1.35; }
.energy-note strong { color: var(--on-surface); }
.energy-shortcut { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); min-height: 5rem; padding: var(--gap-3); color: inherit; text-align: start; }
.energy-shortcut span, .energy-shortcut strong, .energy-shortcut small { display: block; }
.energy-shortcut small { margin-block-start: var(--gap-1); color: var(--on-muted); line-height: 1.3; }
.energy-focus { min-width: 0; min-height: 0; }
.energy-focus .flow { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr) auto; padding: var(--gap-4); }
.energy-focus .topology { height: auto; min-height: 0; }
.flow-summary { margin: 0; color: var(--on-muted); text-align: center; }
.card-link, .energy-node-trigger {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border: 0;
  border-radius: ${TOKENS.radius.round};
  color: inherit;
  background: transparent;
}
.card-link { width: 2.75rem; height: 2.75rem; font-size: 1.5rem; }
.energy-node-trigger ha-icon { width: 100%; height: 100%; --mdc-icon-size: 100%; }
.energy-dialog {
  width: min(94vw, 92rem);
  max-width: none;
  height: min(92vh, 68rem);
  max-height: none;
  padding: 0;
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius-l);
  color: var(--on-surface);
  background: oklch(0.17 0.012 78 / 0.98);
}
.energy-dialog::backdrop { background: oklch(0.08 0.01 78 / 0.78); }
.energy-dialog-frame { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.energy-dialog-header { display: flex; min-height: auto; align-items: start; justify-content: space-between; gap: var(--gap-4); padding: var(--gap-4) var(--gap-6); border-block-end: 0.0625rem solid var(--border); }
.energy-dialog-header span, .energy-dialog-header p { color: var(--on-muted); }
.energy-dialog-header h2 { margin: var(--gap-1) 0; font-size: clamp(1.5rem, 2vw, 2.25rem); }
.energy-dialog-header p { margin: 0; }
.dialog-close { width: 2.75rem; height: 2.75rem; border: 0.0625rem solid var(--border); border-radius: ${TOKENS.radius.round}; color: inherit; background: transparent; font-size: 1.75rem; }
.security-dialog { width: min(92vw, 80rem); height: min(88vh, 56rem); }
.security-dialog-frame { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.security-stream { display: grid; min-height: 0; place-items: center; overflow: hidden; background: oklch(0.12 0.01 78); }
.security-stream img { display: block; width: 100%; height: 100%; object-fit: contain; }
.security-stream-status { padding: var(--gap-4); color: var(--on-muted); }
.powerflo-host { min-width: 0; }
.energy-dialog .powerflo-host { min-height: 0; overflow: auto; padding: var(--gap-3); }
.energy-dialog [data-energy-focused-host] { min-height: 0; overflow: auto; padding: var(--gap-6); }
.energy-detail-surface { display: grid; align-content: start; gap: var(--gap-6); }
.energy-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-3); }
.energy-detail-metric { display: grid; gap: var(--gap-2); min-height: 7rem; align-content: center; padding: var(--gap-4); border: 0.0625rem solid var(--border); border-radius: var(--radius-m); background: var(--surface-raised); }
.energy-detail-metric span, .energy-detail-surface > p { color: var(--on-muted); }
.energy-detail-metric strong { font-size: clamp(1.25rem, 2.4vw, 2rem); font-variant-numeric: tabular-nums; }
.energy-detail-surface > p { margin: 0; max-inline-size: 70ch; line-height: 1.55; }
.energy-detail-surface > p strong { color: var(--on-surface); }
.powerflo-card {
  display: block;
  --primary-text-color: ${TOKENS.color.onSurface};
  --secondary-text-color: ${TOKENS.color.onSurfaceMuted};
  --divider-color: ${TOKENS.color.border};
  --ha-card-border-color: ${TOKENS.color.border};
  --ha-card-background: ${TOKENS.color.surface};
  --card-background-color: ${TOKENS.color.surface};
  --ha-font-family: Aeonik, "Aeonik Pro", Inter, system-ui, sans-serif;
  --powerflo-solar-color: ${TOKENS.color.solar};
  --powerflo-grid-color: ${TOKENS.color.grid};
  --powerflo-battery-color: ${TOKENS.color.battery};
  --powerflo-load-color: ${TOKENS.color.load};
  --powerflo-disconnected-color: ${TOKENS.color.disconnected};
}
.dependency { padding: var(--gap-6); }
.dependency[hidden] { display: none; }
.dependency p { max-inline-size: 70ch; color: var(--on-muted); line-height: 1.55; }
.metric-card, .today, .trend, .thermostat, .outside, .rooms, .now, .quick, .diagnostic, .diagnostic-note, .light-card { padding: var(--gap-6); }
.metric { display: flex; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.metric small, .metric strong { display: block; }
.metric small { color: var(--on-muted); }
.climate-grid { grid-template-columns: 28% 42% 1fr; }
.temps, .climate-right { display: grid; gap: var(--gap-3); }
.temp-row { display: flex; align-items: center; gap: var(--gap-4); padding: var(--gap-4); }
.temp-row div { flex: 1; }
.temp-row small, .temp-row strong { display: block; }
.temp-row small { color: var(--on-muted); }
.thermostat .cooling-control { grid-template-columns: 1fr; justify-items: center; margin-block-start: var(--gap-8); }
.thermostat .target-control { gap: var(--gap-4); }
.thermostat .target-control strong { font-size: 3rem; }
.outside { display: flex; align-items: center; gap: var(--gap-4); }
.outside ha-icon { --mdc-icon-size: 4rem; color: var(--accent); }
.outside small, .outside strong, .outside span { display: block; }
.outside strong { font-size: 2.5rem; }
.temperature-unit { font-family: system-ui, sans-serif; font-variant-numeric: tabular-nums; }
.media-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.16fr) minmax(0, 1fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
  grid-template-areas: "living now private" "whole now quick";
  height: calc(100vh - 15rem);
  min-height: 0;
  overflow: hidden;
}
.media-living { grid-area: living; }
.media-private { grid-area: private; }
.media-now { grid-area: now; }
.media-whole { grid-area: whole; }
.media-quick { grid-area: quick; }
.room-row { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-3) 0; border-block-end: 0.0625rem solid var(--border); }
.room-row div { flex: 1; min-width: 0; }
.room-row strong, .room-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-row small { color: var(--on-muted); }
.now { position: relative; min-height: 0; overflow: hidden; text-align: center; isolation: isolate; }
.now-content { position: relative; z-index: 1; display: grid; height: 100%; min-height: 0; align-content: center; }
.now-content .card-title { position: absolute; inset-block-start: 0; inset-inline: 0; }
.now-artwork-backdrop { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.42; transform: scale(1.02); }
.media-now::after { position: absolute; z-index: -1; inset: 0; content: ""; background: oklch(0.15 0.012 78 / 0.62); }
.album { display: grid; width: 10rem; height: 10rem; place-items: center; margin: var(--gap-8) auto var(--gap-4); }
.album .media-artwork { border-radius: var(--radius-l); }
.transport { display: flex; justify-content: center; gap: var(--gap-3); margin-block-start: var(--gap-6); }
.quick { display: grid; gap: var(--gap-3); align-content: start; }
.quick a { color: inherit; }
.sonos-workspace { position: relative; height: calc(100vh - 15rem); min-height: 0; overflow: hidden; border: 0.0625rem solid var(--border); border-radius: var(--radius-l); background: var(--surface); }
.sonos-frame { display: block; width: 100%; height: 100%; border: 0; background: var(--surface); opacity: 0; transition: opacity var(--micro) ease-out; }
.sonos-workspace.sonora-ready .sonos-frame { opacity: 1; }
.sonos-curtain { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: var(--gap-2); color: var(--on-surface); background: var(--surface); opacity: 1; transition: opacity var(--micro) ease-out; pointer-events: none; }
.sonos-curtain ha-icon { --mdc-icon-size: 3rem; color: var(--accent); }
.sonos-curtain small { color: var(--on-muted); }
.sonos-workspace.sonora-ready .sonos-curtain { opacity: 0; }
.diagnostic-control { width: 100%; color: inherit; text-align: start; cursor: pointer; }
.diagnostic-hint { display: block; color: var(--on-muted); font-size: .78rem; }
.lights-workspace { display: grid; height: calc(100vh - 15rem); min-height: 0; grid-template-rows: minmax(0, 3fr) minmax(0, 1fr); gap: var(--gap-4); overflow: hidden; }
.device-section { display: grid; min-height: 0; grid-template-rows: auto minmax(0, 1fr); gap: var(--gap-2); }
.device-section-heading { display: flex; align-items: baseline; justify-content: space-between; padding-inline: var(--gap-1); }
.device-section-heading h2 { margin: 0; font-size: 1.15rem; }
.device-section-heading span { color: var(--on-muted); font-size: 0.82rem; }
.device-grid { display: grid; min-height: 0; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: var(--gap-3); }
.light-card, .switch-card { display: flex; min-height: 0; flex-direction: column; justify-content: space-between; padding: var(--gap-2); }
.light-card-surface, .switch-card-surface { display: grid; flex: 1; width: 100%; min-height: 0; align-content: space-between; gap: var(--gap-1); padding: 0; border: 0; background: transparent; color: inherit; text-align: start; }
.light-card-surface:focus-visible, .switch-card-surface:focus-visible { border-radius: var(--radius-m); outline: 0.1875rem solid var(--focus); outline-offset: 0.125rem; }
.light-heading { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); }
.light-heading small, .light-heading strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.light-heading small { color: var(--on-muted); }
.light-toggle-icon { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 0.0625rem solid var(--border); border-radius: var(--radius-m); }
.light-state { display: flex; align-items: end; justify-content: space-between; text-transform: capitalize; }
.light-state b { font-size: 2.5rem; }
.light-card input { width: 100%; min-height: 2.75rem; accent-color: var(--accent); }
.switch-card .light-state b { font-size: 1.25rem; }
.compact-empty { min-height: 0; grid-column: 1 / -1; }
.diagnostics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.diagnostic { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--gap-4); min-height: 10rem; }
.diagnostic small, .diagnostic strong, .diagnostic code { display: block; overflow-wrap: anywhere; }
.diagnostic small, .diagnostic code { color: var(--on-muted); }
.diagnostic-note { grid-column: 1 / -1; }
.diagnostic-note p { max-inline-size: 70ch; color: var(--on-muted); line-height: 1.55; }
.empty { display: grid; min-height: 24rem; place-items: center; padding: var(--gap-8); text-align: center; }
.empty p { max-inline-size: 60ch; color: var(--on-muted); }
@media (max-width: 81.25rem) {
  .shell { padding: var(--gap-4) var(--gap-6); }
  header { min-height: 10rem; }
  .nav { inset-inline-start: 15%; width: 72%; min-height: 3.5rem; }
  .nav a { min-height: 3rem; font-size: var(--type-compact); }
  .home-grid { grid-template-rows: minmax(19rem, 1fr) 5.5rem 4.25rem; gap: var(--gap-3); }
  .topology { height: 22rem; }
  .clock, .weather, .compact, .controls, .flow { padding: var(--gap-4); }
  .cooling-control { grid-template-columns: minmax(6.25rem, 1fr) auto; gap: var(--gap-1); }
  .cool-toggle { padding: var(--gap-1) var(--gap-2); }
  .cool-toggle small { font-size: 0.62rem; }
  .target-control button { min-width: 2.75rem; min-height: 2.75rem; }
  .target-control strong { min-width: 2.25rem; }
  .control { min-height: 3.25rem; padding: var(--gap-1); font-size: 0.72rem; }
  .summary { padding: var(--gap-2) var(--gap-3); }
  .summary .round { display: none; }
  .security-grid, .media-grid, .sonos-workspace, .lights-workspace { height: calc(100vh - 12.5rem); }
  .metric-card, .today, .trend, .thermostat, .outside, .rooms, .now, .quick, .diagnostic, .diagnostic-note { padding: var(--gap-4); }
  .energy-workspace { grid-template-columns: minmax(11rem, 0.7fr) minmax(25rem, 1.65fr) minmax(12rem, 0.75fr); height: calc(100vh - 12.5rem); gap: var(--gap-3); }
  .energy-panel { padding: var(--gap-3); }
  .energy-metric { min-height: 2.75rem; font-size: var(--type-compact); }
  .energy-shortcut { min-height: 4.5rem; font-size: var(--type-compact); }
  .device-section { gap: var(--gap-1); }
  .device-section-heading { min-height: 1.75rem; }
  .device-section-heading h2 { font-size: var(--type-body); }
  .device-grid { gap: var(--gap-2); }
  .light-card, .switch-card { padding: var(--gap-2); }
  .light-heading { gap: var(--gap-2); }
  .light-heading .round { width: 2.5rem; height: 2.5rem; }
  .light-heading small, .light-state { font-size: var(--type-compact); }
  .light-heading strong { font-size: var(--type-body); }
  .light-toggle-icon { width: 2.75rem; height: 2.75rem; }
  .light-state b { font-size: 1.75rem; }
}
@media (max-width: 50rem), (orientation: portrait) {
  .energy-detail-grid { grid-template-columns: 1fr; }
  :host { position: relative; height: auto; min-height: 100vh; }
  .shell { min-height: 100vh; }
  header { min-height: 15rem; padding-block-start: 5rem; }
  .nav { inset-inline: 0; width: 100%; overflow-x: auto; grid-template-columns: repeat(8, minmax(5.25rem, 1fr)); }
  .brand { inset-block-start: 5rem; }
  .tools { inset-block-start: 5rem; }
  .home-grid, .security-grid, .climate-grid, .media-grid { height: auto; grid-template-columns: 1fr; grid-template-rows: auto; grid-template-areas: none; overflow: visible; }
  .media-living, .media-private, .media-now, .media-whole, .media-quick { grid-area: auto; }
  .sonos-workspace { height: calc(100vh - 17.5rem); }
  .energy-workspace { height: auto; min-height: 0; grid-template-columns: 1fr; overflow: visible; }
  .energy-focus { min-height: 30rem; grid-row: 1; }
  .energy-rail { grid-template-rows: auto; }
  .lights-workspace { height: auto; overflow: visible; }
  .summary-row, .pulse-row, .device-grid, .diagnostics-grid, .camera-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-row, .pulse-row { grid-column: auto; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  .flow-arrow { display: none; }
}
`;
