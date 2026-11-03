import { dispatchDashboardAction } from "./actions";
import { createDraftConfig, isRecord, parseConfig } from "./config-schema";
import type { H2DCConfig } from "./domain";
import { H2DCDashboardEditor } from "./editor/h2dc-dashboard-editor";
import { escapeHtml, type HomeAssistant } from "./home-assistant";
import { CARD_STYLES } from "./styles";
import { H2DC_PACKAGE_VERSION } from "./version";
import { renderView } from "./view-renderers";

export { dispatchDashboardAction } from "./actions";
export { lightCapabilities } from "./entity-capabilities";
export { escapeHtml, readEntity, readNumericState } from "./home-assistant";
export { derivePowerFlow, formatPower } from "./power-flow";
export { TOKENS } from "./tokens";
export { H2DC_PACKAGE_VERSION } from "./version";
export type { DashboardAction } from "./actions";
export type { H2DCConfig, H2DCView } from "./domain";
export type { HomeAssistant } from "./home-assistant";
export type { PowerFlowState } from "./power-flow";

/** Metadata presented by Home Assistant's custom-card picker. */
interface CustomCardMetadata {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly preview: boolean;
  readonly documentationURL: string;
}

/** Stable interaction identity used to restore keyboard focus after state renders. */
interface ControlIdentity {
  readonly action: string;
  readonly entity?: string;
  readonly command?: string;
  readonly mode?: string;
  readonly value?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardMetadata[];
  }
}

/** Escapes a validated background URL for a CSS quoted-string context. */
function cssUrl(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "").replaceAll("\r", "");
}

/** Resolves the configured background without embedding installation-specific defaults. */
function activeBackground(config: H2DCConfig, hass: HomeAssistant, now: Date): string | undefined {
  const perView = config.backgrounds.perView[config.view];
  if (perView !== undefined) return perView;
  const sun = hass.states["sun.sun"]?.state;
  const night = sun === "below_horizon" || (sun === undefined && (now.getHours() < 6 || now.getHours() >= 18));
  return night ? config.backgrounds.night ?? config.backgrounds.day : config.backgrounds.day ?? config.backgrounds.night;
}

/** Returns one required data attribute or throws before a service boundary is crossed. */
function requiredData(element: HTMLElement, key: keyof DOMStringMap): string {
  const value = element.dataset[key];
  if (value === undefined || value === "") throw new Error(`Missing interaction data: ${String(key)}`);
  return value;
}

/** Captures only allowlisted data attributes needed to find the same logical control. */
function controlIdentity(element: Element | null): ControlIdentity | undefined {
  if (!(element instanceof HTMLElement) || element.dataset.action === undefined) return undefined;
  return {
    action: element.dataset.action,
    ...(element.dataset.entity === undefined ? {} : { entity: element.dataset.entity }),
    ...(element.dataset.command === undefined ? {} : { command: element.dataset.command }),
    ...(element.dataset.mode === undefined ? {} : { mode: element.dataset.mode }),
    ...(element.dataset.value === undefined ? {} : { value: element.dataset.value }),
  };
}

/** Checks whether a newly rendered control represents the previously focused action. */
function matchesIdentity(element: HTMLElement, identity: ControlIdentity): boolean {
  return element.dataset.action === identity.action
    && element.dataset.entity === identity.entity
    && element.dataset.command === identity.command
    && element.dataset.mode === identity.mode
    && element.dataset.value === identity.value;
}

/** Upgrade-stable H2DC Lovelace card backed by the strict renderer and action allowlist. */
export class H2DCDashboardCard extends HTMLElement {
  readonly #root: ShadowRoot;
  readonly #reducedMotion: MediaQueryList;
  #config: H2DCConfig | undefined;
  #hass: HomeAssistant | undefined;
  #issues: readonly string[] = [];
  #actionMessage = "";

  /** Creates an isolated card and installs one delegated interaction boundary. */
  public constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#root.addEventListener("click", (event) => this.#handleClick(event));
    this.#root.addEventListener("change", (event) => this.#handleChange(event));
    this.#reducedMotion.addEventListener("change", () => this.#render());
  }

  /** Creates the native Lovelace visual editor. */
  public static getConfigElement(): HTMLElement {
    return document.createElement("h2dc-dashboard-editor");
  }

  /** Supplies a portable draft when a user adds the card through Lovelace. */
  public static getStubConfig(): Readonly<Record<string, unknown>> {
    return { ...createDraftConfig({ type: "custom:h2dc-dashboard-card", view: "home", config_version: 1 }) };
  }

  /** Validates and stores card configuration before rendering it. */
  public setConfig(input: unknown): void {
    const result = parseConfig(input);
    this.#config = result.status === "valid" ? result.config : undefined;
    this.#issues = result.status === "invalid" ? result.issues : [];
    this.#render();
  }

  /** Receives immutable Home Assistant state updates from Lovelace. */
  public set hass(value: HomeAssistant) {
    this.#hass = value;
    this.#render();
  }

  /** Returns an approximate Lovelace card height for dashboard layout calculations. */
  public getCardSize(): number {
    return 9;
  }

  /** Dispatches an allowlisted button action after validating its data attributes. */
  async #handleClick(event: Event): Promise<void> {
    const origin = event.target;
    if (!(origin instanceof Element)) return;
    const control = origin.closest<HTMLElement>("[data-action]");
    if (control === null || control.matches(":disabled")) return;
    try {
      const hass = this.#hass;
      if (hass === undefined) throw new Error("Home Assistant is not connected");
      const action = requiredData(control, "action");
      const entityId = requiredData(control, "entity");
      if (action === "toggle") await dispatchDashboardAction(hass, { type: "toggle", entityId });
      else if (action === "climate-mode") await dispatchDashboardAction(hass, { type: "set_climate_mode", entityId, mode: requiredData(control, "mode") });
      else if (action === "climate-temperature") await dispatchDashboardAction(hass, { type: "set_climate_temperature", entityId, temperature: Number(requiredData(control, "value")) });
      else if (action === "media") await dispatchDashboardAction(hass, { type: "media", entityId, command: requiredData(control, "command") });
      else if (action === "alarm") await dispatchDashboardAction(hass, { type: "alarm", entityId, command: requiredData(control, "command") });
      else return;
      this.#announce("Command sent");
    } catch (error: unknown) {
      this.#actionMessage = error instanceof Error ? error.message : "Command failed";
      this.#render();
    }
  }

  /** Dispatches a brightness update only after the range input has settled. */
  async #handleChange(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.action !== "brightness" || input.disabled) return;
    try {
      const hass = this.#hass;
      if (hass === undefined) throw new Error("Home Assistant is not connected");
      await dispatchDashboardAction(hass, { type: "set_light_brightness", entityId: requiredData(input, "entity"), brightnessPercent: Number(input.value) });
      this.#announce("Brightness updated");
    } catch (error: unknown) {
      this.#actionMessage = error instanceof Error ? error.message : "Brightness update failed";
      this.#render();
    }
  }

  /** Updates the persistent live region without replacing the activated control. */
  #announce(message: string): void {
    this.#actionMessage = message;
    const region = this.#root.querySelector<HTMLElement>("[data-live-status]");
    if (region !== null) region.textContent = message;
  }

  /** Projects current state into the shadow DOM without causing service calls. */
  #render(): void {
    const focusedControl = controlIdentity(this.#root.activeElement);
    this.classList.toggle("admin", new URLSearchParams(window.location.search).get("h2dc_admin") === "1");
    const config = this.#config;
    const hass = this.#hass;
    if (config === undefined) {
      const issues = this.#issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
      this.#root.innerHTML = `<style>${CARD_STYLES}</style><section class="setup" role="status"><strong>Configure H2DC</strong><p>Select the required alarm, climate, weather, room-temperature, and energy entities in the visual editor.</p><ul>${issues}</ul></section>`;
      return;
    }
    if (hass === undefined) {
      this.#root.innerHTML = `<style>${CARD_STYLES}</style><section class="setup" role="status"><strong>Connecting to Home Assistant</strong><p>Waiting for the first state update.</p></section>`;
      return;
    }
    const now = new Date();
    this.#root.innerHTML = `<style>${CARD_STYLES}</style><article class="shell">${renderView({ config, hass, now, reducedMotion: this.#reducedMotion.matches })}<p class="sr-only" data-live-status aria-live="polite">${escapeHtml(this.#actionMessage)}</p></article>`;
    const shell = this.#root.querySelector<HTMLElement>(".shell");
    const background = activeBackground(config, hass, now);
    if (shell !== null && background !== undefined) shell.style.setProperty("--active-background", `url("${cssUrl(background)}")`);
    if (focusedControl !== undefined) {
      const replacement = [...this.#root.querySelectorAll<HTMLElement>("[data-action]")].find((element) => matchesIdentity(element, focusedControl));
      replacement?.focus({ preventScroll: true });
    }
  }
}

/** Creates the native Lovelace visual editor for this card. */
export function createH2DCConfigElement(): HTMLElement {
  return document.createElement("h2dc-dashboard-editor");
}

if (!customElements.get("h2dc-dashboard-card")) customElements.define("h2dc-dashboard-card", H2DCDashboardCard);
/** Isolated temporary-dashboard alias used only during commissioned migration testing. */
class H2DCPreviewDashboardCard extends H2DCDashboardCard {
  /** Normalizes the preview-only element name to the distributable configuration contract. */
  public override setConfig(input: unknown): void {
    super.setConfig(isRecord(input) ? { ...input, type: "custom:h2dc-dashboard-card" } : input);
  }
}
if (!customElements.get("h2dc-dashboard-preview")) customElements.define("h2dc-dashboard-preview", H2DCPreviewDashboardCard);
if (!customElements.get("h2dc-dashboard-editor")) customElements.define("h2dc-dashboard-editor", H2DCDashboardEditor);

window.customCards ??= [];
if (!window.customCards.some((card) => card.type === "h2dc-dashboard-card")) {
  window.customCards.push({ type: "h2dc-dashboard-card", name: "H2DC Dashboard", description: "Configurable wall-tablet dashboard for Home Assistant", preview: false, documentationURL: "https://github.com/flexyneat/h2dc-dashboard" });
}

console.info(`H2DC Dashboard ${H2DC_PACKAGE_VERSION} loaded`);
