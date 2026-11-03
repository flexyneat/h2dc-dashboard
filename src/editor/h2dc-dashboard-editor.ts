import { createDraftConfig, parseConfig } from "../config-schema";
import { H2DC_VIEWS, type H2DCConfig } from "../domain";
import { escapeHtml, type HomeAssistant } from "../home-assistant";

/** Home Assistant entity-picker surface used by the visual editor. */
interface HaEntityPickerElement extends HTMLElement {
  hass?: HomeAssistant;
  value?: string;
}

/** Configuration-change event consumed by the Lovelace card editor. */
export interface H2DCConfigChangedDetail {
  readonly config: H2DCConfig;
}

/** Safely reads a data-key from a native editor control. */
function editorControl(target: EventTarget | null): (HTMLInputElement | HTMLSelectElement | HaEntityPickerElement) | undefined {
  if (!(target instanceof HTMLElement) || target.dataset.key === undefined) return undefined;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target.tagName.toLowerCase() === "ha-entity-picker") {
    return target;
  }
  return undefined;
}

/** Produces a native Home Assistant entity picker. */
function picker(label: string, key: string, value: string | undefined, domain: string): string {
  return `<ha-entity-picker label="${escapeHtml(label)}" data-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" include-domains='["${escapeHtml(domain)}"]' allow-custom-entity></ha-entity-picker>`;
}

/** Typed Lovelace visual editor for portable H2DC installations. */
export class H2DCDashboardEditor extends HTMLElement {
  readonly #root: ShadowRoot;
  #config?: H2DCConfig;
  #hass?: HomeAssistant;

  /** Creates an isolated editor and one delegated input boundary. */
  public constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.addEventListener("change", (event) => this.#handleChange(event));
  }

  /** Supplies Home Assistant to entity pickers. */
  public set hass(hass: HomeAssistant) {
    this.#hass = hass;
    this.#render();
  }

  /** Validates and stores the configuration edited by Lovelace. */
  public setConfig(input: unknown): void {
    const result = parseConfig(input);
    this.#config = result.status === "valid" ? result.config : createDraftConfig(input);
    this.#render();
  }

  /** Applies one validated field and emits the standard Lovelace event. */
  #handleChange(event: Event): void {
    const control = editorControl(event.target);
    if (control === undefined || this.#config === undefined) return;
    const key = control.dataset.key;
    const value = control.value ?? "";
    if (key === undefined) return;
    const current = this.#config;
    let candidate: H2DCConfig;
    switch (key) {
      case "view":
        candidate = { ...current, view: H2DC_VIEWS.find((view) => view === value) ?? current.view };
        break;
      case "dashboardPath":
        candidate = { ...current, dashboardPath: value };
        break;
      case "sonoraUrl":
        if (value === "") {
          const { sonoraUrl: _removed, ...withoutSonora } = current;
          candidate = withoutSonora;
        } else {
          candidate = { ...current, sonoraUrl: value };
        }
        break;
      case "flowThresholdW":
        candidate = { ...current, flowThresholdW: Number(value) };
        break;
      case "batteryPositiveIs":
        candidate = { ...current, batteryPositiveIs: value === "charge" ? "charge" : "discharge" };
        break;
      case "gridPositiveIs":
        candidate = { ...current, gridPositiveIs: value === "export" ? "export" : "import" };
        break;
      case "entities.alarm": case "entities.climate": case "entities.weather": case "entities.roomTemperature": {
        const field = key.slice("entities.".length) as "alarm" | "climate" | "weather" | "roomTemperature";
        candidate = { ...current, entities: { ...current.entities, [field]: value } };
        break;
      }
      case "energy.freshness": case "energy.solar": case "energy.batterySoc": case "energy.battery": case "energy.grid": case "energy.load": {
        const field = key.slice("energy.".length) as "freshness" | "solar" | "batterySoc" | "battery" | "grid" | "load";
        candidate = { ...current, entities: { ...current.entities, energy: { ...current.entities.energy, [field]: value } } };
        break;
      }
      case "backgrounds.day": case "backgrounds.night": {
        const field = key.slice("backgrounds.".length) as "day" | "night";
        candidate = { ...current, backgrounds: { ...current.backgrounds, [field]: value } };
        break;
      }
      default:
        return;
    }
    const result = parseConfig(candidate);
    this.#config = result.status === "valid" ? result.config : candidate;
    this.dispatchEvent(new CustomEvent<H2DCConfigChangedDetail>("config-changed", {
      detail: { config: this.#config },
      bubbles: true,
      composed: true,
    }));
    this.#render();
  }

  /** Renders the visual form and hydrates native entity pickers. */
  #render(): void {
    if (this.#config === undefined) return;
    const config = this.#config;
    const energy = config.entities.energy;
    this.#root.innerHTML = `<style>:host{display:block;color:var(--primary-text-color)}form{display:grid;gap:var(--h2dc-editor-gap,1rem);padding:var(--h2dc-editor-pad,.5rem)}fieldset{display:grid;gap:var(--h2dc-editor-field-gap,.75rem);border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,.75rem);padding:var(--h2dc-editor-fieldset-pad,1rem)}legend{font-weight:700}label{display:grid;gap:var(--h2dc-editor-label-gap,.375rem)}input,select{min-height:44px;padding:var(--h2dc-editor-control-pad,.5rem);border:1px solid var(--divider-color);border-radius:var(--h2dc-editor-control-radius,.5rem);background:var(--card-background-color);color:inherit}</style><form><fieldset><legend>View</legend><label>View<select data-key="view">${H2DC_VIEWS.map((view) => `<option value="${view}" ${config.view === view ? "selected" : ""}>${view}</option>`).join("")}</select></label><label>Dashboard path<input data-key="dashboardPath" value="${escapeHtml(config.dashboardPath)}"></label><label>Sonora URL<input data-key="sonoraUrl" type="url" value="${escapeHtml(config.sonoraUrl ?? "")}"></label></fieldset><fieldset><legend>Core entities</legend>${picker("Alarm", "entities.alarm", config.entities.alarm, "alarm_control_panel")}${picker("Climate", "entities.climate", config.entities.climate, "climate")}${picker("Weather", "entities.weather", config.entities.weather, "weather")}${picker("Room temperature", "entities.roomTemperature", config.entities.roomTemperature, "sensor")}</fieldset><fieldset><legend>Energy</legend>${picker("Telemetry freshness", "energy.freshness", energy.freshness, "binary_sensor")}${picker("Solar power", "energy.solar", energy.solar, "sensor")}${picker("Battery state of charge", "energy.batterySoc", energy.batterySoc, "sensor")}${picker("Battery power", "energy.battery", energy.battery, "sensor")}${picker("Grid power", "energy.grid", energy.grid, "sensor")}${picker("Home load", "energy.load", energy.load, "sensor")}<label>Flow threshold (W)<input data-key="flowThresholdW" type="number" min="0" step="1" value="${config.flowThresholdW}"></label><label>Positive battery value means<select data-key="batteryPositiveIs"><option value="discharge" ${config.batteryPositiveIs === "discharge" ? "selected" : ""}>Discharge</option><option value="charge" ${config.batteryPositiveIs === "charge" ? "selected" : ""}>Charge</option></select></label><label>Positive grid value means<select data-key="gridPositiveIs"><option value="import" ${config.gridPositiveIs === "import" ? "selected" : ""}>Import</option><option value="export" ${config.gridPositiveIs === "export" ? "selected" : ""}>Export</option></select></label></fieldset><fieldset><legend>Backgrounds</legend><label>Day image URL<input data-key="backgrounds.day" type="url" value="${escapeHtml(config.backgrounds.day ?? "")}"></label><label>Night image URL<input data-key="backgrounds.night" type="url" value="${escapeHtml(config.backgrounds.night ?? "")}"></label></fieldset></form>`;
    const hass = this.#hass;
    if (hass !== undefined) {
      this.#root.querySelectorAll<HaEntityPickerElement>("ha-entity-picker").forEach((element) => {
        element.hass = hass;
      });
    }
  }
}
