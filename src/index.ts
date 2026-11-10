import { dispatchDashboardAction } from "./actions";
import { transitionAlarmCode } from "./alarm-code";
import { buildMediumStreamUrl } from "./camera-stream";
import { createDraftConfig, parseConfig } from "./config-schema";
import type { H2DCConfig } from "./domain";
import { ENERGY_DETAILS, renderFocusedEnergyDetail, usesCompletePowerFlo, type EnergyDetailKey } from "./energy-detail";
import { isEvChargingDemoRequested, withEvChargingDemoConfig, withEvChargingDemoStates } from "./ev-charging-demo";
import { H2DCDashboardEditor } from "./editor/h2dc-dashboard-editor";
import { escapeHtml, type HomeAssistant } from "./home-assistant";
import { HOUSE_PULSE_CATEGORIES, projectHousePulse, type HousePulseCategory } from "./house-pulse";
import { restoreDialogTrigger, shouldHandleDialogClose } from "./focus-restoration";
import { MediaArtworkSession, resolveCurrentMedia, resolveHomeAssistantArtwork } from "./media-artwork";
import { CARD_STYLES } from "./styles";
import { H2DC_PACKAGE_VERSION } from "./version";
import { renderView } from "./view-renderers";
import { mountPowerFloCard, POWERFLO_ELEMENT_NAME, type PowerFloCardElement } from "./powerflo-adapter";
import { dashboardConfigSignature, shouldPreserveSonoraFrame, waitForSonoraThemeReady } from "./sonora-frame";

export { dispatchDashboardAction } from "./actions";
export { lightCapabilities } from "./entity-capabilities";
export { escapeHtml, readEntity, readNumericState } from "./home-assistant";
export { restoreDialogTrigger } from "./focus-restoration";
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

/** Selected camera state retained only while the medium-quality modal is open. */
interface CameraDetail {
  readonly entity: string;
  readonly label: string;
}

/** Returns the persistent modal layer that keeps PowerFlo connected across telemetry rerenders. */
function energyDialogMarkup(): string {
  return `<dialog class="energy-dialog" data-energy-dialog aria-labelledby="energy-dialog-title"><div class="energy-dialog-frame"><header class="energy-dialog-header"><div><span>Energy detail</span><h2 id="energy-dialog-title" data-energy-dialog-title>Energy analysis</h2><p data-energy-dialog-summary>Live read-only telemetry and recorded history.</p></div><button class="dialog-close" data-action="energy-detail-close" aria-label="Close energy details">×</button></header><section data-energy-focused-host hidden></section><section class="powerflo-host" data-powerflo-host aria-label="Complete PowerFlo energy dashboard" hidden></section><section class="glass dependency" data-powerflo-missing role="status" hidden><h2>PowerFlo is not loaded</h2><p>Install and register the PowerFlo resource to preserve live flow, both battery estimates, history, readiness, insights and solar outlook.</p></section></div></dialog>`;
}

/** Returns the persistent Security dialog without starting any camera stream. */
function securityDialogMarkup(): string {
  return `<dialog class="energy-dialog security-dialog" data-security-dialog aria-labelledby="security-dialog-title"><div class="security-dialog-frame"><header class="energy-dialog-header"><div><span>UniFi Protect &middot; medium stream</span><h2 id="security-dialog-title" data-security-dialog-title>Camera</h2><p>Live playback starts only for the selected camera and stops when this dialog closes.</p></div><button class="dialog-close" data-action="camera-detail-close" aria-label="Close live camera">&times;</button></header><section class="security-stream"><img data-security-stream alt="" hidden><p class="security-stream-status" data-security-stream-status role="status">Select a camera to begin medium-quality playback.</p></section></div></dialog>`;
}

/** Returns the persistent House Pulse dialog used by all four Home summaries. */
function pulseDialogMarkup(): string {
  return `<dialog class="energy-dialog pulse-dialog" data-pulse-dialog aria-labelledby="pulse-dialog-title"><div class="pulse-dialog-frame"><header class="energy-dialog-header"><div><span>House Pulse</span><h2 id="pulse-dialog-title" data-pulse-dialog-title>Home status</h2><p data-pulse-dialog-summary>Live configured household telemetry.</p></div><button class="dialog-close" data-action="pulse-detail-close" aria-label="Close House Pulse details">&times;</button></header><section class="pulse-detail-list" data-pulse-detail-list></section></div></dialog>`;
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
  #configSignature: string | undefined;
  #hass: HomeAssistant | undefined;
  #evChargingDemo = false;
  #issues: readonly string[] = [];
  #actionMessage = "";
  #energyDetail: EnergyDetailKey | undefined;
  #energyReturnTrigger: HTMLElement | undefined;
  #cameraDetail: CameraDetail | undefined;
  #pulseDetail: HousePulseCategory | undefined;
  #pulseReturnTrigger: HTMLElement | undefined;
  #powerFloCard: PowerFloCardElement | undefined;
  #forceFrameRender = true;
  #sonoraReadinessController: AbortController | undefined;
  #alarmCode = "";
  readonly #mediaArtworkSession = new MediaArtworkSession();
  readonly #syncViewportOffset = (): void => {
    // A transformed Lovelace ancestor changes the containing block for position: fixed.
    // Counter-translate the card so it owns the physical viewport instead of exposing HA chrome.
    this.style.removeProperty("--h2dc-offset-x");
    this.style.removeProperty("--h2dc-offset-y");
    const bounds = this.getBoundingClientRect();
    this.style.setProperty("--h2dc-offset-x", `${-bounds.left}px`);
    this.style.setProperty("--h2dc-offset-y", `${-bounds.top}px`);
  };

  /** Creates an isolated card and installs one delegated interaction boundary. */
  public constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.innerHTML = `<style>${CARD_STYLES}</style><div data-render-frame></div><div data-persistent-layer></div>`;
    this.#reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#root.addEventListener("click", (event) => this.#handleClick(event));
    this.#root.addEventListener("change", (event) => this.#handleChange(event));
    this.#reducedMotion.addEventListener("change", () => this.#render());
  }

  /** Aligns the kiosk card with the physical viewport and tracks viewport changes. */
  public connectedCallback(): void {
    // Lovelace may connect the element before its panel column has finished laying out.
    window.requestAnimationFrame(this.#syncViewportOffset);
    window.addEventListener("resize", this.#syncViewportOffset);
    // A late-loaded Marketplace resource should enable Energy without requiring a second browser restart.
    void customElements.whenDefined(POWERFLO_ELEMENT_NAME).then(() => {
      if (this.isConnected) this.#render();
    });
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
    this.#evChargingDemo = isEvChargingDemoRequested(input);
    const result = parseConfig(this.#evChargingDemo ? withEvChargingDemoConfig(input) : input);
    const nextSignature = result.status === "valid" ? dashboardConfigSignature(result.config) : undefined;
    const isEquivalentConfig = nextSignature !== undefined && nextSignature === this.#configSignature;
    if (!isEquivalentConfig) this.#alarmCode = transitionAlarmCode(this.#alarmCode, { reason: "config-change" });
    this.#config = result.status === "valid" ? result.config : undefined;
    this.#issues = result.status === "invalid" ? result.issues : [];
    this.#configSignature = nextSignature;
    if (isEquivalentConfig) {
      // Lovelace may replay an unchanged config; preserve persistent iframes and media sessions.
      this.#syncMediaArtwork();
      this.#render();
      return;
    }
    // Configuration changes restart PowerFlo intentionally; ordinary HA state updates do not.
    this.#powerFloCard = undefined;
    this.#forceFrameRender = true;
    this.#mediaArtworkSession.disconnect();
    this.#root.querySelector<HTMLElement>("[data-persistent-layer]")?.replaceChildren();
    this.#syncMediaArtwork();
    this.#render();
  }

  /** Receives immutable Home Assistant state updates from Lovelace. */
  public set hass(value: HomeAssistant) {
    // The simulator is an immutable local projection and never mutates Home Assistant entities.
    this.#hass = this.#evChargingDemo ? withEvChargingDemoStates(value) : value;
    this.#syncMediaArtwork();
    this.#render();
  }

  /** Cancels an optional Sonora lookup when Lovelace removes the card. */
  public disconnectedCallback(): void {
    this.#alarmCode = transitionAlarmCode(this.#alarmCode, { reason: "disconnect" });
    this.#mediaArtworkSession.disconnect();
    this.#sonoraReadinessController?.abort();
    this.#sonoraReadinessController = undefined;
    window.removeEventListener("resize", this.#syncViewportOffset);
  }

  /** Reveals Sonora only after its own persisted theme has settled after iframe load. */
  #prepareSonoraFrame(frame: HTMLElement): void {
    const iframe = frame.querySelector<HTMLIFrameElement>(".sonos-frame");
    const workspace = frame.querySelector<HTMLElement>(".sonos-workspace");
    if (iframe === null || workspace === null) return;
    iframe.addEventListener("load", () => {
      this.#sonoraReadinessController?.abort();
      const controller = new AbortController();
      this.#sonoraReadinessController = controller;
      void waitForSonoraThemeReady(iframe.src, window.fetch.bind(window), controller.signal).then(() => {
        if (controller.signal.aborted || !workspace.isConnected) return;
        workspace.classList.add("sonora-ready");
        workspace.querySelector<HTMLElement>("[data-sonos-curtain]")?.setAttribute("aria-hidden", "true");
        if (this.#sonoraReadinessController === controller) this.#sonoraReadinessController = undefined;
      });
    }, { once: true });
  }

  /** Returns an approximate Lovelace card height for dashboard layout calculations. */
  public getCardSize(): number {
    return 9;
  }

  /** Keeps native HA artwork synchronous and performs one exact Sonora lookup only when needed. */
  #syncMediaArtwork(): void {
    const config = this.#config;
    const hass = this.#hass;
    if (config === undefined || hass === undefined) return;
    const native = resolveHomeAssistantArtwork(hass, config.entities.media);
    const primary = resolveCurrentMedia(hass, config.entities.media)?.entity;
    const titleValue = primary?.attributes.media_title;
    const artistValue = primary?.attributes.media_artist;
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    const artist = typeof artistValue === "string" ? artistValue.trim() : "";
    this.#mediaArtworkSession.sync({ native, title, artist, ...(config.sonoraUrl === undefined ? {} : { sonoraUrl: config.sonoraUrl }) }, () => this.#render());
  }

  /** Dispatches an allowlisted button action after validating its data attributes. */
  async #handleClick(event: Event): Promise<void> {
    const origin = event.target;
    if (!(origin instanceof Element)) return;
    const control = origin.closest<HTMLElement>("[data-action]");
    if (control === null || control.matches(":disabled")) return;
    try {
      const action = requiredData(control, "action");
      if (action === "alarm-code-digit") {
        const digit = requiredData(control, "digit");
        if (!/^\d$/u.test(digit) || this.#alarmCode.length >= 12) return;
        this.#alarmCode += digit;
        this.#syncAlarmCodeDisplay();
        return;
      }
      if (action === "alarm-code-clear") {
        this.#alarmCode = "";
        this.#syncAlarmCodeDisplay();
        return;
      }
      if (action === "energy-detail") {
        const detail = control.dataset.detail;
        if (detail === undefined || !(detail in ENERGY_DETAILS)) throw new Error("Unknown energy detail");
        this.#energyDetail = detail as EnergyDetailKey;
        // Retain the exact logical trigger so rapid close/reopen cycles cannot restore focus to an older control.
        this.#energyReturnTrigger = control;
        this.#openEnergyDialog();
        return;
      }
      if (action === "energy-detail-close") {
        this.#closeEnergyDialog();
        return;
      }
      if (action === "camera-detail") {
        this.#cameraDetail = { entity: requiredData(control, "entity"), label: requiredData(control, "label") };
        this.#openSecurityDialog();
        return;
      }
      if (action === "camera-detail-close") {
        this.#closeSecurityDialog();
        return;
      }
      if (action === "pulse-detail") {
        const category = control.dataset.category;
        if (category === undefined || !HOUSE_PULSE_CATEGORIES.some((candidate) => candidate === category)) throw new Error("Unknown House Pulse category");
        this.#pulseDetail = category as HousePulseCategory;
        this.#pulseReturnTrigger = control;
        this.#openPulseDialog();
        return;
      }
      if (action === "pulse-detail-close") {
        this.#closePulseDialog();
        return;
      }
      const hass = this.#hass;
      if (hass === undefined) throw new Error("Home Assistant is not connected");
      if (action === "alarm-code-submit") {
        const alarmEntity = this.#config?.entities.alarm;
        if (alarmEntity === undefined) throw new Error("Alarm is not configured");
        await dispatchDashboardAction(hass, { type: "alarm_disarm", entityId: alarmEntity, code: this.#alarmCode });
        this.#alarmCode = "";
        this.#syncAlarmCodeDisplay();
        this.#announce("Disarm command sent");
        return;
      }
      const entityId = requiredData(control, "entity");
      if (action === "poe-toggle") {
        const allowedEntityId = this.#config?.entities.diagnostics.poe;
        if (allowedEntityId === undefined) throw new Error("PoE control is not configured");
        if (!window.confirm("Change power to the wall tablet? The tablet may temporarily lose charging power.")) return;
        await dispatchDashboardAction(hass, { type: "poe_toggle", entityId, allowedEntityId });
        this.#announce("Tablet power command sent");
        return;
      }
      if (action === "ocpp-toggle") {
        const allowedEntityId = this.#config?.entities.ocpp.chargeControl;
        if (allowedEntityId === undefined) throw new Error("Charging control is not configured");
        await dispatchDashboardAction(hass, { type: "ocpp_toggle", entityId, allowedEntityId });
        this.#announce("Charging command sent");
        return;
      }
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

  /** Updates the masked keypad readout without placing the alarm code in the DOM. */
  #syncAlarmCodeDisplay(): void {
    const output = this.#root.querySelector<HTMLOutputElement>("[data-alarm-code-display]");
    if (output === null) return;
    output.textContent = this.#alarmCode === "" ? "Enter code" : "•".repeat(this.#alarmCode.length);
    output.setAttribute("aria-label", this.#alarmCode === "" ? "No alarm code entered" : `${this.#alarmCode.length} alarm code digits entered`);
  }

  /** Opens the native Energy dialog, preserving keyboard focus and Escape behavior. */
  #openEnergyDialog(): void {
    const detail = this.#energyDetail;
    const config = this.#config;
    const hass = this.#hass;
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-energy-dialog]");
    if (detail === undefined || config === undefined || hass === undefined || dialog === null) return;
    const [title, summary] = ENERGY_DETAILS[detail];
    const heading = dialog.querySelector<HTMLElement>("[data-energy-dialog-title]");
    const description = dialog.querySelector<HTMLElement>("[data-energy-dialog-summary]");
    if (heading !== null) heading.textContent = title;
    if (description !== null) description.textContent = summary;
    const focusedHost = dialog.querySelector<HTMLElement>("[data-energy-focused-host]");
    const powerFloHost = dialog.querySelector<HTMLElement>("[data-powerflo-host]");
    const dependencyMessage = dialog.querySelector<HTMLElement>("[data-powerflo-missing]");
    const complete = usesCompletePowerFlo(detail);
    if (focusedHost !== null) {
      focusedHost.hidden = complete;
      focusedHost.innerHTML = complete ? "" : renderFocusedEnergyDetail(detail, config, hass);
    }
    if (powerFloHost !== null) powerFloHost.hidden = !complete;
    if (dependencyMessage !== null) dependencyMessage.hidden = !complete || this.#powerFloCard !== undefined;
    if (!dialog.open) dialog.showModal();
  }

  /** Finalizes one current Energy dialog dismissal and ignores delayed close events after a rapid reopen. */
  #handleEnergyDialogClose(dialog: HTMLDialogElement): void {
    if (!shouldHandleDialogClose(dialog.open)) return;
    const closedDetail = this.#energyDetail;
    this.#energyDetail = undefined;
    const currentTrigger = closedDetail === undefined
      ? undefined
      : this.#root.querySelector<HTMLElement>(`[data-action="energy-detail"][data-detail="${closedDetail}"]`) ?? undefined;
    const trigger = this.#energyReturnTrigger?.isConnected === true ? this.#energyReturnTrigger : currentTrigger;
    this.#energyReturnTrigger = undefined;
    restoreDialogTrigger(trigger, window.requestAnimationFrame.bind(window));
  }

  /** Closes the Energy dialog through its native lifecycle. */
  #closeEnergyDialog(): void {
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-energy-dialog]");
    if (dialog?.open === true) dialog.close();
  }

  /** Opens one authenticated medium-quality camera stream and restores focus after dismissal. */
  #openSecurityDialog(): void {
    const detail = this.#cameraDetail;
    const hass = this.#hass;
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-security-dialog]");
    if (detail === undefined || hass === undefined || dialog === null) return;
    const heading = dialog.querySelector<HTMLElement>("[data-security-dialog-title]");
    const image = dialog.querySelector<HTMLImageElement>("[data-security-stream]");
    const status = dialog.querySelector<HTMLElement>("[data-security-stream-status]");
    if (heading !== null) heading.textContent = detail.label;
    const source = buildMediumStreamUrl(detail.entity, hass.states[detail.entity]?.attributes.entity_picture, window.location.origin);
    if (image !== null && status !== null) {
      if (source === undefined) {
        image.hidden = true;
        image.removeAttribute("src");
        image.alt = "";
        status.hidden = false;
        status.textContent = "The configured medium stream is unavailable. High-resolution fallback is intentionally disabled.";
      } else {
        image.alt = `${detail.label} live camera`;
        // Preserve the active request across routine Home Assistant state rerenders.
        if (image.getAttribute("src") !== source) image.src = source;
        image.hidden = false;
        status.hidden = true;
      }
    }
    dialog.addEventListener("close", () => {
      const closed = this.#cameraDetail;
      this.#cameraDetail = undefined;
      if (image !== null) {
        // Removing src tears down the browser request instead of leaving a hidden stream running.
        image.removeAttribute("src");
        image.hidden = true;
      }
      if (status !== null) status.hidden = false;
      if (closed !== undefined) {
        const trigger = [...this.#root.querySelectorAll<HTMLElement>('[data-action="camera-detail"]')]
          .find((candidate) => candidate.dataset.entity === closed.entity);
        restoreDialogTrigger(trigger, window.requestAnimationFrame.bind(window));
      }
    }, { once: true });
    if (!dialog.open) dialog.showModal();
  }

  /** Closes the Security dialog through the native lifecycle so playback is released. */
  #closeSecurityDialog(): void {
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-security-dialog]");
    if (dialog?.open === true) dialog.close();
  }

  /** Opens one House Pulse category with exact source names and current states. */
  #openPulseDialog(): void {
    const category = this.#pulseDetail;
    const config = this.#config;
    const hass = this.#hass;
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-pulse-dialog]");
    if (category === undefined || config === undefined || hass === undefined || dialog === null) return;
    const projection = projectHousePulse(config, hass, category);
    const heading = dialog.querySelector<HTMLElement>("[data-pulse-dialog-title]");
    const summary = dialog.querySelector<HTMLElement>("[data-pulse-dialog-summary]");
    const list = dialog.querySelector<HTMLElement>("[data-pulse-detail-list]");
    if (heading !== null) heading.textContent = projection.title;
    if (summary !== null) summary.textContent = projection.description;
    if (list !== null) {
      list.innerHTML = projection.items.length === 0
        ? `<p class="pulse-empty">Configure one or more sources for this summary.</p>`
        : projection.items.map((item) => `<div class="pulse-detail-item ${item.state}"><ha-icon icon="${escapeHtml(item.icon)}" aria-hidden="true"></ha-icon><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.value)}</small></span></div>`).join("");
    }
    if (!dialog.open) dialog.showModal();
  }

  /** Closes the House Pulse dialog through its native focus-restoring lifecycle. */
  #closePulseDialog(): void {
    const dialog = this.#root.querySelector<HTMLDialogElement>("[data-pulse-dialog]");
    if (dialog?.open === true) dialog.close();
  }

  /** Clears the selected House Pulse category and restores the invoking control. */
  #handlePulseDialogClose(dialog: HTMLDialogElement): void {
    if (!shouldHandleDialogClose(dialog.open)) return;
    this.#pulseDetail = undefined;
    const trigger = this.#pulseReturnTrigger?.isConnected === true ? this.#pulseReturnTrigger : undefined;
    this.#pulseReturnTrigger = undefined;
    restoreDialogTrigger(trigger, window.requestAnimationFrame.bind(window));
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
    const frame = this.#root.querySelector<HTMLElement>("[data-render-frame]");
    const persistentLayer = this.#root.querySelector<HTMLElement>("[data-persistent-layer]");
    if (frame === null || persistentLayer === null) return;
    if (config === undefined) {
      this.#alarmCode = transitionAlarmCode(this.#alarmCode, { reason: "config-change" });
      const issues = this.#issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("");
      frame.innerHTML = `<section class="setup" role="status"><strong>Configure H2DC</strong><p>Select the required alarm, climate, weather, room-temperature, and energy entities in the visual editor.</p><ul>${issues}</ul></section>`;
      return;
    }
    if (hass === undefined) {
      frame.innerHTML = `<section class="setup" role="status"><strong>Connecting to Home Assistant</strong><p>Waiting for the first state update.</p></section>`;
      return;
    }
    this.#alarmCode = transitionAlarmCode(this.#alarmCode, { reason: "render", view: config.view });
    if (shouldPreserveSonoraFrame(config.view, this.#forceFrameRender, frame.querySelector(".sonos-frame") !== null)) {
      // Home Assistant publishes frequent state updates. Keeping this node connected prevents
      // Sonora from restarting, flashing its default theme, and losing its live controller state.
      return;
    }
    const now = new Date();
    const mediaArtwork = this.#mediaArtworkSession.artwork;
    const powerFloAvailable = customElements.get(POWERFLO_ELEMENT_NAME) !== undefined;
    frame.innerHTML = `<article class="shell" data-kiosk-profile="${escapeHtml(config.presentation.kioskProfile)}" data-density="${escapeHtml(config.presentation.density)}">${renderView({ config, hass, now, reducedMotion: this.#reducedMotion.matches, powerFloAvailable, ...(mediaArtwork === undefined ? {} : { mediaArtwork }) })}<p class="sr-only" data-live-status aria-live="polite">${escapeHtml(this.#actionMessage)}</p></article>`;
    // Preserve the private keypad state across unrelated Home Assistant updates without exposing the code itself.
    this.#syncAlarmCodeDisplay();
    this.#forceFrameRender = false;
    const shell = frame.querySelector<HTMLElement>(".shell");
    const background = activeBackground(config, hass, now);
    if (shell !== null) {
      // Presentation values are schema-validated before they cross into CSS custom properties.
      shell.style.setProperty("--accent", config.presentation.accent);
      shell.style.setProperty("--h2dc-font-family", `"${cssUrl(config.presentation.fontFamily)}", system-ui, sans-serif`);
      shell.style.setProperty("--h2dc-overlay-strength", String(config.presentation.overlayStrength));
      if (background !== undefined) shell.style.setProperty("--active-background", `url("${cssUrl(background)}")`);
    }
    if (config.view === "sonos") this.#prepareSonoraFrame(frame);
    if (config.view === "energy" && powerFloAvailable) {
      if (persistentLayer.querySelector("[data-energy-dialog]") === null) {
        persistentLayer.innerHTML = energyDialogMarkup();
        const dialog = persistentLayer.querySelector<HTMLDialogElement>("[data-energy-dialog]");
        // One stable listener prevents stale per-open callbacks from racing a newly selected detail.
        dialog?.addEventListener("close", () => this.#handleEnergyDialogClose(dialog));
      }
      const powerFloHost = persistentLayer.querySelector<HTMLElement>("[data-powerflo-host]");
      const dependencyMessage = persistentLayer.querySelector<HTMLElement>("[data-powerflo-missing]");
      if (powerFloHost !== null) {
        this.#powerFloCard = mountPowerFloCard(powerFloHost, config, hass, this.#powerFloCard);
        if (dependencyMessage !== null) dependencyMessage.hidden = this.#energyDetail !== "analysis" || this.#powerFloCard !== undefined;
      }
      this.#openEnergyDialog();
    } else {
      this.#energyDetail = undefined;
      this.#energyReturnTrigger = undefined;
      const dialog = persistentLayer.querySelector<HTMLDialogElement>("[data-energy-dialog]");
      if (dialog?.open === true) dialog.close();
    }
    if (config.view === "security") {
      if (persistentLayer.querySelector("[data-security-dialog]") === null) persistentLayer.insertAdjacentHTML("beforeend", securityDialogMarkup());
      this.#openSecurityDialog();
    } else {
      this.#cameraDetail = undefined;
      const dialog = persistentLayer.querySelector<HTMLDialogElement>("[data-security-dialog]");
      if (dialog?.open === true) dialog.close();
    }
    if (config.view === "home") {
      if (persistentLayer.querySelector("[data-pulse-dialog]") === null) {
        persistentLayer.insertAdjacentHTML("beforeend", pulseDialogMarkup());
        const dialog = persistentLayer.querySelector<HTMLDialogElement>("[data-pulse-dialog]");
        dialog?.addEventListener("close", () => this.#handlePulseDialogClose(dialog));
      }
      this.#openPulseDialog();
    } else {
      this.#pulseDetail = undefined;
      this.#pulseReturnTrigger = undefined;
      const dialog = persistentLayer.querySelector<HTMLDialogElement>("[data-pulse-dialog]");
      if (dialog?.open === true) dialog.close();
    }
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

/** Registers the public HACS card without exposing any preview-only element alias. */
export function registerH2DCDashboardCard(): void {
  if (!customElements.get("h2dc-dashboard-card")) customElements.define("h2dc-dashboard-card", H2DCDashboardCard);
  if (!customElements.get("h2dc-dashboard-editor")) customElements.define("h2dc-dashboard-editor", H2DCDashboardEditor);

  window.customCards ??= [];
  if (!window.customCards.some((card) => card.type === "h2dc-dashboard-card")) {
    window.customCards.push({ type: "h2dc-dashboard-card", name: "H2DC Dashboard", description: "Configurable wall-tablet dashboard for Home Assistant", preview: false, documentationURL: "https://github.com/flexyneat/h2dc-dashboard" });
  }

  console.info(`H2DC Dashboard ${H2DC_PACKAGE_VERSION} loaded`);
}
