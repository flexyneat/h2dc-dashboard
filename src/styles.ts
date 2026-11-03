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
  color: ${TOKENS.color.onSurface};
  font-family: Aeonik, "Aeonik Pro", Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  --surface: ${TOKENS.color.surface};
  --surface-raised: ${TOKENS.color.surfaceRaised};
  --on-surface: ${TOKENS.color.onSurface};
  --on-muted: ${TOKENS.color.onSurfaceMuted};
  --border: ${TOKENS.color.border};
  --accent: ${TOKENS.color.accent};
  --focus: ${TOKENS.color.focus};
  --gap-1: ${TOKENS.space[1]};
  --gap-2: ${TOKENS.space[2]};
  --gap-3: ${TOKENS.space[3]};
  --gap-4: ${TOKENS.space[4]};
  --gap-6: ${TOKENS.space[6]};
  --gap-8: ${TOKENS.space[8]};
  --radius-s: ${TOKENS.radius.small};
  --radius-m: ${TOKENS.radius.medium};
  --radius-l: ${TOKENS.radius.large};
  --instant: ${TOKENS.motion.instant};
  --micro: ${TOKENS.motion.micro};
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
  min-height: 100%;
  padding: var(--gap-6) var(--gap-8);
  background-color: oklch(0.17 0.012 78);
  background-image: linear-gradient(oklch(0.12 0.01 78 / 0.36), oklch(0.12 0.01 78 / 0.36)), var(--active-background, none);
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
.intro h1 { margin: var(--gap-1) 0; font-size: clamp(2rem, 2.6vw, 3.5rem); line-height: 1.05; letter-spacing: -0.025em; text-wrap: balance; }
.intro p { margin: 0; font-size: clamp(1rem, 1.2vw, 1.25rem); }
.card-title { display: flex; align-items: center; justify-content: space-between; font-size: 1.25rem; font-weight: 700; }
.card-title a { min-width: 2.75rem; min-height: 2.75rem; display: grid; place-items: center; color: inherit; text-decoration: none; }
.home-grid { display: grid; grid-template-columns: 26% 42% minmax(0, 1fr); grid-template-rows: minmax(28rem, 1fr) 6rem; gap: var(--gap-4); }
.left-stack, .right-stack { display: grid; gap: var(--gap-4); min-width: 0; }
.left-stack { grid-template-rows: 0.8fr 1.2fr; }
.right-stack { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto; }
.clock, .weather, .compact, .controls, .flow { padding: var(--gap-6); }
.clock { display: grid; align-content: center; }
.clock strong { font-size: clamp(3rem, 4.3vw, 5.125rem); line-height: 1; letter-spacing: -0.035em; white-space: nowrap; }
.clock span { margin-block-start: var(--gap-3); color: var(--on-muted); }
.weather {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--gap-4);
  overflow: hidden;
  background-image: linear-gradient(90deg, oklch(0.12 0.01 78 / 0.18), oklch(0.12 0.01 78 / 0.54)), url("${weatherPartlyCloudy}");
  background-position: center;
  background-size: cover;
}
.weather-sunny { filter: saturate(1.15) brightness(1.12); }
.weather-cloudy, .weather-fog { filter: saturate(0.72) brightness(0.88); }
.weather-rainy, .weather-pouring, .weather-lightning-rainy { filter: saturate(0.76) brightness(0.72) hue-rotate(12deg); }
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
.climate-body { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.climate-reading strong, .climate-reading small { display: block; }
.climate-reading strong { font-size: clamp(1.4rem, 2vw, 2.1rem); white-space: nowrap; }
.climate-reading small { color: var(--on-muted); }
.cooling-control { display: grid; grid-template-columns: minmax(6.5rem, 1fr) auto; align-items: center; gap: var(--gap-2); }
.cool-toggle, .target-control button, .media-action, .control, .light-toggle, .alarm-action {
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
.controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap-2); }
.controls .card-title { grid-column: 1 / -1; }
.control { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); text-align: center; }
.control span, .control small { display: block; }
.control small { color: var(--on-muted); text-transform: capitalize; }
.control.on, .light-card.on { color: var(--accent); border-color: oklch(0.79 0.15 82 / 0.65); background: oklch(0.79 0.15 82 / 0.14); }
.summary-row { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap-4); }
.summary { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-4); color: inherit; text-decoration: none; }
.summary div { flex: 1; }
.summary strong, .summary small { display: block; }
.summary small { color: var(--on-muted); }
.round { display: grid; width: 3rem; height: 3rem; flex: 0 0 auto; place-items: center; border: 0.0625rem solid oklch(0.79 0.15 82 / 0.42); border-radius: ${TOKENS.radius.round}; color: var(--accent); background: oklch(0.79 0.15 82 / 0.12); }
.page-grid { display: grid; gap: var(--gap-4); }
.security-grid { grid-template-columns: 24% 1fr; }
.alarm { padding: var(--gap-6); text-align: center; }
.alarm-ring { display: grid; width: 10rem; height: 10rem; place-items: center; margin: var(--gap-8) auto var(--gap-3); border: 0.25rem solid var(--accent); border-radius: ${TOKENS.radius.round}; }
.alarm-ring ha-icon { --mdc-icon-size: 4.5rem; }
.alarm-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap-2); margin-block-start: var(--gap-6); }
.alarm-action { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); }
.camera-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap-3); }
.camera { position: relative; min-height: 14rem; margin: 0; overflow: hidden; border: 0.0625rem solid var(--border); border-radius: var(--radius-l); background: oklch(0.15 0.01 78); }
.camera img { width: 100%; height: 100%; object-fit: cover; }
.camera figcaption { position: absolute; inset: auto 0 0; display: flex; justify-content: space-between; padding: var(--gap-3); background: linear-gradient(transparent, oklch(0.12 0.01 78 / 0.85)); }
.camera-missing { display: grid; height: 100%; min-height: 14rem; place-items: center; align-content: center; gap: var(--gap-2); color: var(--on-muted); }
.energy-grid { grid-template-columns: 28% 42% 1fr; }
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
.media-grid { grid-template-columns: 31% 36% 1fr; }
.room-row { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-3) 0; border-block-end: 0.0625rem solid var(--border); }
.room-row div { flex: 1; min-width: 0; }
.room-row strong, .room-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-row small { color: var(--on-muted); }
.now { text-align: center; }
.album { display: grid; width: 10rem; height: 10rem; place-items: center; margin: var(--gap-8) auto var(--gap-4); border: 0.125rem solid var(--border); border-radius: ${TOKENS.radius.round}; }
.transport { display: flex; justify-content: center; gap: var(--gap-3); margin-block-start: var(--gap-6); }
.quick { display: grid; gap: var(--gap-3); align-content: start; }
.quick a { color: inherit; }
.lights-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.light-card { display: flex; min-height: 15rem; flex-direction: column; justify-content: space-between; }
.light-heading { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); }
.light-heading small, .light-heading strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.light-heading small { color: var(--on-muted); }
.light-state { display: flex; align-items: end; justify-content: space-between; text-transform: capitalize; }
.light-state b { font-size: 2.5rem; }
.light-card input { width: 100%; min-height: 2.75rem; accent-color: var(--accent); }
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
  .nav a { min-height: 3rem; font-size: 0.78rem; }
  .home-grid { grid-template-rows: minmax(23rem, 1fr) 5.5rem; gap: var(--gap-3); }
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
  .camera { min-height: 10rem; }
  .metric-card, .today, .trend, .thermostat, .outside, .rooms, .now, .quick, .diagnostic, .diagnostic-note, .light-card { padding: var(--gap-4); }
  .light-card { min-height: 11rem; }
}
@media (max-width: 50rem), (orientation: portrait) {
  :host { position: relative; height: auto; min-height: 100vh; }
  .shell { min-height: 100vh; }
  header { min-height: 15rem; padding-block-start: 5rem; }
  .nav { inset-inline: 0; width: 100%; overflow-x: auto; grid-template-columns: repeat(8, minmax(5.25rem, 1fr)); }
  .brand { inset-block-start: 5rem; }
  .tools { inset-block-start: 5rem; }
  .home-grid, .security-grid, .energy-grid, .climate-grid, .media-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
  .summary-row, .lights-grid, .diagnostics-grid, .camera-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-row { grid-column: auto; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  .flow-arrow { display: none; }
}
`;
