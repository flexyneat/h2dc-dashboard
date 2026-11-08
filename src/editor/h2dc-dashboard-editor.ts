import { createDraftConfig, NAVIGATION_DEFAULTS, parseConfig } from "../config-schema";
import {
  H2DC_VIEWS,
  type EnergyEntities,
  type H2DCConfig,
  type KioskProfile,
  type PowerFloOptions,
  type PowerFloStatistics,
  type PresentationDensity,
} from "../domain";
import { escapeHtml, type HomeAssistant } from "../home-assistant";
import { buildOnboardingReport } from "../onboarding";
import { parseRoomsEditorDraft } from "./rooms-editor";

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
function editorControl(target: EventTarget | null): (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HaEntityPickerElement) | undefined {
  if (!(target instanceof HTMLElement) || target.dataset.key === undefined) return undefined;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target.tagName.toLowerCase() === "ha-entity-picker") {
    return target;
  }
  return undefined;
}

/** Produces a native Home Assistant entity picker. */
function picker(label: string, key: string, value: string | undefined, domain: string | readonly string[]): string {
  const domains = typeof domain === "string" ? [domain] : domain;
  return `<ha-entity-picker label="${escapeHtml(label)}" data-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" include-domains='${escapeHtml(JSON.stringify(domains))}' allow-custom-entity></ha-entity-picker>`;
}

/** Entity mappings exposed by the Energy editor, in PowerFlo's visual grouping order. */
const ENERGY_ENTITY_FIELDS = [
  { key: "freshness", label: "Telemetry freshness", domain: "binary_sensor" },
  { key: "inverterStatus", label: "Inverter status", domain: "sensor" },
  { key: "gridConnected", label: "Grid relay state", domain: ["binary_sensor", "sensor"] },
  { key: "solar", label: "Solar power", domain: "sensor" },
  { key: "pv1Power", label: "PV1 power", domain: "sensor" },
  { key: "pv2Power", label: "PV2 power", domain: "sensor" },
  { key: "pv3Power", label: "PV3 power", domain: "sensor" },
  { key: "batterySoc", label: "Battery state of charge", domain: "sensor" },
  { key: "battery", label: "Battery power", domain: "sensor" },
  { key: "batteryVoltage", label: "Battery voltage", domain: "sensor" },
  { key: "batteryTemperature", label: "Battery temperature", domain: "sensor" },
  { key: "grid", label: "Grid power", domain: "sensor" },
  { key: "gridVoltage", label: "Grid L1 voltage", domain: "sensor" },
  { key: "gridL2Voltage", label: "Grid L2 voltage", domain: "sensor" },
  { key: "gridFrequency", label: "Grid frequency", domain: "sensor" },
  { key: "load", label: "Protected load power", domain: "sensor" },
  { key: "inverterOutputPower", label: "Inverter output power", domain: "sensor" },
  { key: "externalCtPowerCandidate", label: "External CT candidate", domain: "sensor" },
  { key: "dailyPv", label: "Solar energy today", domain: "sensor" },
  { key: "dailyGridImport", label: "Grid import today", domain: "sensor" },
  { key: "dailyLoad", label: "Load energy today", domain: "sensor" },
  { key: "dailyBatteryDischarge", label: "Battery discharge today", domain: "sensor" },
  { key: "batteryChargeToday", label: "Battery charge today", domain: "sensor" },
  { key: "gridExportToday", label: "Grid export today", domain: "sensor" },
  { key: "solarTotal", label: "Solar lifetime energy", domain: "sensor" },
  { key: "gridImportTotal", label: "Grid import lifetime energy", domain: "sensor" },
  { key: "gridExportTotal", label: "Grid export lifetime energy", domain: "sensor" },
  { key: "batteryChargeTotal", label: "Battery charge lifetime energy", domain: "sensor" },
  { key: "batteryDischargeTotal", label: "Battery discharge lifetime energy", domain: "sensor" },
  { key: "acTemperature", label: "AC temperature", domain: "sensor" },
  { key: "dcTemperature", label: "DC temperature", domain: "sensor" },
  { key: "solarForecastPower", label: "Solar forecast power", domain: "sensor" },
  { key: "batteryCurrent", label: "Battery current", domain: "sensor" },
  { key: "bmsChargeCurrentLimit", label: "BMS charge current limit", domain: "sensor" },
  { key: "bmsDischargeCurrentLimit", label: "BMS discharge current limit", domain: "sensor" },
  { key: "inverterStandbyPower", label: "Verified inverter standby power", domain: "sensor" },
  { key: "pv1Voltage", label: "PV1 voltage", domain: "sensor" },
  { key: "pv1Current", label: "PV1 current", domain: "sensor" },
  { key: "pv2Voltage", label: "PV2 voltage", domain: "sensor" },
  { key: "pv2Current", label: "PV2 current", domain: "sensor" },
  { key: "pv3Voltage", label: "PV3 voltage", domain: "sensor" },
  { key: "pv3Current", label: "PV3 current", domain: "sensor" },
] as const satisfies readonly { readonly key: keyof EnergyEntities; readonly label: string; readonly domain: string | readonly string[] }[];

/** Numeric PowerFlo settings that preserve estimate and observation semantics. */
const POWERFLO_NUMBER_FIELDS = [
  ["inverterCapacityKw", "Inverter capacity (kW)"], ["batteryCapacityKwh", "Battery capacity (kWh)"],
  ["solarCapacityKw", "Solar capacity (kWp)"], ["batteryReserveSoc", "Runtime reserve (%)"],
  ["batteryChargeTargetSoc", "Charge target (%)"], ["runtimeWindowMinutes", "Runtime window (minutes)"],
  ["runtimeMaxSampleAgeSeconds", "Maximum sample age (seconds)"], ["chargeTaperStartSoc", "Taper start (%)"],
  ["chargeTaperFloorRatio", "Taper floor ratio"], ["solarProjectionHours", "Solar projection (hours)"],
  ["runtimeLoadEfficiency", "Runtime load efficiency"], ["gridVoltageAvailableMin", "Grid available minimum (V)"],
  ["gridVoltageAvailableMax", "Grid available maximum (V)"], ["gridVoltageAbsentMax", "Grid absent maximum (V)"],
  ["exportThresholdW", "Export threshold (W)"], ["exportDurationSeconds", "Export duration (seconds)"],
  ["readinessMinCoverage", "Readiness minimum coverage"], ["flowReleaseW", "Flow release threshold (W)"],
] as const satisfies readonly (readonly [keyof PowerFloOptions, string])[];

/** Boolean PowerFlo settings exposed as explicit Yes/No choices. */
const POWERFLO_BOOLEAN_FIELDS = [
  ["useLearnedTaper", "Use qualified learned taper"], ["energySourcesVerified", "Energy counter roles verified"],
  ["readinessEnabled", "Show readiness and simulator"], ["preparednessEnabled", "Show preparedness"],
  ["gridPowerVerified", "Grid power role and sign verified"], ["gridStatusFallback", "Allow labelled grid evidence fallback"],
  ["standbyMeasurementVerified", "Standby sensor scope verified"], ["solarOutlookEnabled", "Show solar outlook"],
  ["estimateAccuracyEnabled", "Collect estimate accuracy evidence"],
] as const satisfies readonly (readonly [keyof PowerFloOptions, string])[];

/** Renders one native numeric PowerFlo editor field. */
function numberField(key: keyof PowerFloOptions, label: string, value: PowerFloOptions[keyof PowerFloOptions]): string {
  return `<label>${escapeHtml(label)}<input data-key="powerFlo.${escapeHtml(String(key))}" type="number" step="any" value="${escapeHtml(String(value ?? ""))}"></label>`;
}

/** Renders one explicit boolean PowerFlo editor field. */
function booleanField(key: keyof PowerFloOptions, label: string, value: PowerFloOptions[keyof PowerFloOptions]): string {
  return `<label>${escapeHtml(label)}<select data-key="powerFlo.${escapeHtml(String(key))}"><option value="true" ${value === true ? "selected" : ""}>Yes</option><option value="false" ${value === false ? "selected" : ""}>No</option></select></label>`;
}

/** Typed Lovelace visual editor for portable H2DC installations. */
export class H2DCDashboardEditor extends HTMLElement {
  readonly #root: ShadowRoot;
  #config?: H2DCConfig;
  #hass?: HomeAssistant;
  #roomsDraft: string | undefined;
  #roomsError: string | undefined;

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
    this.#roomsDraft = undefined;
    this.#roomsError = undefined;
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
      case "presentation.kioskProfile":
        candidate = { ...current, presentation: { ...current.presentation, kioskProfile: value as KioskProfile } };
        break;
      case "presentation.density":
        candidate = { ...current, presentation: { ...current.presentation, density: value as PresentationDensity } };
        break;
      case "presentation.accent":
        candidate = { ...current, presentation: { ...current.presentation, accent: value } };
        break;
      case "presentation.fontFamily":
        candidate = { ...current, presentation: { ...current.presentation, fontFamily: value } };
        break;
      case "presentation.overlayStrength":
        candidate = { ...current, presentation: { ...current.presentation, overlayStrength: Number(value) } };
        break;
      case "presentation.contextualHome":
        candidate = { ...current, presentation: { ...current.presentation, contextualHome: value === "true" } };
        break;
      case "roomsJson":
        this.#roomsDraft = value;
        const roomsResult = parseRoomsEditorDraft(current, value);
        if (roomsResult.status === "invalid") {
          this.#roomsError = roomsResult.message;
          this.#render();
          return;
        }
        this.#roomsError = undefined;
        this.#roomsDraft = undefined;
        candidate = roomsResult.config;
        break;
      default:
        if (key.startsWith("navigation.")) {
          const [, viewValue, field] = key.split(".");
          const view = H2DC_VIEWS.find((candidateView) => candidateView === viewValue);
          if (view === undefined || (field !== "label" && field !== "visible")) return;
          candidate = {
            ...current,
            navigation: {
              ...current.navigation,
              [view]: { ...current.navigation[view], [field]: field === "visible" ? value === "true" : value },
            },
          };
        } else if (key.startsWith("backgrounds.perView.")) {
          const view = H2DC_VIEWS.find((candidateView) => candidateView === key.slice("backgrounds.perView.".length));
          if (view === undefined) return;
          candidate = { ...current, backgrounds: { ...current.backgrounds, perView: { ...current.backgrounds.perView, [view]: value } } };
        } else if (key.startsWith("energy.")) {
          const field = key.slice("energy.".length) as keyof EnergyEntities;
          candidate = { ...current, entities: { ...current.entities, energy: { ...current.entities.energy, [field]: value } } };
        } else if (key.startsWith("powerFlo.statistics.")) {
          const field = key.slice("powerFlo.statistics.".length) as keyof PowerFloStatistics;
          candidate = { ...current, powerFlo: { ...current.powerFlo, statistics: { ...current.powerFlo.statistics, [field]: value } } };
        } else if (key === "powerFlo.solarForecastSources") {
          candidate = { ...current, powerFlo: { ...current.powerFlo, solarForecastSources: value.split(",").map((item) => item.trim()).filter(Boolean) } };
        } else if (key.startsWith("powerFlo.")) {
          const field = key.slice("powerFlo.".length) as keyof PowerFloOptions;
          const numeric = POWERFLO_NUMBER_FIELDS.some(([candidateKey]) => candidateKey === field);
          const boolean = POWERFLO_BOOLEAN_FIELDS.some(([candidateKey]) => candidateKey === field);
          candidate = { ...current, powerFlo: { ...current.powerFlo, [field]: numeric ? Number(value) : boolean ? value === "true" : value } };
        } else {
          return;
        }
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
    const energyPickers = ENERGY_ENTITY_FIELDS.map((field) => picker(field.label, `energy.${String(field.key)}`, energy[field.key], field.domain)).join("");
    const powerFloNumbers = POWERFLO_NUMBER_FIELDS.map(([key, label]) => numberField(key, label, config.powerFlo[key])).join("");
    const powerFloBooleans = POWERFLO_BOOLEAN_FIELDS.map(([key, label]) => booleanField(key, label, config.powerFlo[key])).join("");
    const report = buildOnboardingReport(config, this.#hass);
    const readiness = report.sections.map((section) => `<li data-status="${section.status}"><strong>${escapeHtml(section.label)}</strong><span>${escapeHtml(section.detail)}</span></li>`).join("");
    const roomsValue = this.#roomsDraft ?? JSON.stringify(config.rooms, null, 2);
    const roomsError = this.#roomsError === undefined ? "" : `<p id="rooms-json-error" class="editor-error" role="alert">${escapeHtml(this.#roomsError)}</p>`;
    const navigationFields = H2DC_VIEWS.map((view) => `<div class="tab-config"><label>${escapeHtml(NAVIGATION_DEFAULTS[view].label)} label<input data-key="navigation.${view}.label" value="${escapeHtml(config.navigation[view].label)}" maxlength="24"></label><label>Visible<select data-key="navigation.${view}.visible"><option value="true" ${config.navigation[view].visible ? "selected" : ""}>Yes</option><option value="false" ${!config.navigation[view].visible ? "selected" : ""}>No</option></select></label></div>`).join("");
    this.#root.innerHTML = `<style>:host{display:block;color:var(--primary-text-color)}form{display:grid;gap:var(--h2dc-editor-gap,1rem);padding:var(--h2dc-editor-pad,.5rem)}fieldset{display:grid;gap:var(--h2dc-editor-field-gap,.75rem);border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,.75rem);padding:var(--h2dc-editor-fieldset-pad,1rem)}legend{font-weight:700}label{display:grid;gap:var(--h2dc-editor-label-gap,.375rem)}input,select,textarea{min-height:44px;padding:var(--h2dc-editor-control-pad,.5rem);border:1px solid var(--divider-color);border-radius:var(--h2dc-editor-control-radius,.5rem);background:var(--card-background-color);color:inherit}textarea{min-block-size:12rem;font:inherit;font-family:ui-monospace,monospace;resize:block}.editor-error{margin:0;color:var(--error-color)}.readiness{margin:0;padding:0;list-style:none}.readiness li{display:grid;gap:.25rem;padding:.75rem 0;border-block-end:1px solid var(--divider-color)}.readiness span{color:var(--secondary-text-color)}.readiness [data-status=blocked] strong{color:var(--error-color)}.readiness [data-status=warning] strong{color:var(--warning-color,var(--primary-color))}</style><form><fieldset><legend>Setup readiness · ${report.status}</legend><ul class="readiness">${readiness}</ul></fieldset><fieldset><legend>View</legend><label>View<select data-key="view">${H2DC_VIEWS.map((view) => `<option value="${view}" ${config.view === view ? "selected" : ""}>${view}</option>`).join("")}</select></label><label>Dashboard path<input data-key="dashboardPath" value="${escapeHtml(config.dashboardPath)}"></label><label>Sonora URL<input data-key="sonoraUrl" type="url" value="${escapeHtml(config.sonoraUrl ?? "")}"></label></fieldset><fieldset><legend>Core entities</legend>${picker("Alarm", "entities.alarm", config.entities.alarm, "alarm_control_panel")}${picker("Climate", "entities.climate", config.entities.climate, "climate")}${picker("Weather", "entities.weather", config.entities.weather, "weather")}${picker("Room temperature", "entities.roomTemperature", config.entities.roomTemperature, "sensor")}</fieldset><fieldset><legend>Presentation</legend><label>Kiosk profile<select data-key="presentation.kioskProfile">${(["wall_16_10", "desktop_landscape", "tablet_portrait", "phone"] as const).map((profile) => `<option value="${profile}" ${config.presentation.kioskProfile === profile ? "selected" : ""}>${profile.replaceAll("_", " ")}</option>`).join("")}</select></label><label>Density<select data-key="presentation.density"><option value="comfortable" ${config.presentation.density === "comfortable" ? "selected" : ""}>Comfortable</option><option value="compact" ${config.presentation.density === "compact" ? "selected" : ""}>Compact</option></select></label><label>Accent (OKLCH)<input data-key="presentation.accent" value="${escapeHtml(config.presentation.accent)}"></label><label>Font family<input data-key="presentation.fontFamily" value="${escapeHtml(config.presentation.fontFamily)}"></label><label>Background overlay<input data-key="presentation.overlayStrength" type="number" min="0" max="1" step="0.01" value="${config.presentation.overlayStrength}"></label><label>Contextual Home<select data-key="presentation.contextualHome"><option value="false" ${!config.presentation.contextualHome ? "selected" : ""}>Off</option><option value="true" ${config.presentation.contextualHome ? "selected" : ""}>On</option></select></label></fieldset><fieldset><legend>Room model</legend><label>Rooms (advanced JSON)<textarea data-key="roomsJson" spellcheck="false" aria-describedby="rooms-json-error" aria-invalid="${this.#roomsError === undefined ? "false" : "true"}">${escapeHtml(roomsValue)}</textarea></label>${roomsError}</fieldset><fieldset><legend>PowerFlo telemetry</legend>${energyPickers}<label>Flow activation threshold (W)<input data-key="flowThresholdW" type="number" min="0" step="1" value="${config.flowThresholdW}"></label><label>Positive battery value means<select data-key="batteryPositiveIs"><option value="discharge" ${config.batteryPositiveIs === "discharge" ? "selected" : ""}>Discharge</option><option value="charge" ${config.batteryPositiveIs === "charge" ? "selected" : ""}>Charge</option></select></label><label>Positive grid value means<select data-key="gridPositiveIs"><option value="import" ${config.gridPositiveIs === "import" ? "selected" : ""}>Import</option><option value="export" ${config.gridPositiveIs === "export" ? "selected" : ""}>Export</option></select></label></fieldset><fieldset><legend>PowerFlo identity and estimates</legend><label>Title<input data-key="powerFlo.title" value="${escapeHtml(config.powerFlo.title)}"></label><label>Inverter name<input data-key="powerFlo.inverterName" value="${escapeHtml(config.powerFlo.inverterName)}"></label><label>Inverter model<input data-key="powerFlo.inverterModel" value="${escapeHtml(config.powerFlo.inverterModel)}"></label><label>Inverter image<input data-key="powerFlo.inverterImage" value="${escapeHtml(config.powerFlo.inverterImage)}"></label><label>Density<select data-key="powerFlo.density"><option value="compact" ${config.powerFlo.density === "compact" ? "selected" : ""}>Compact</option><option value="standard" ${config.powerFlo.density === "standard" ? "selected" : ""}>Standard</option><option value="expanded" ${config.powerFlo.density === "expanded" ? "selected" : ""}>Expanded</option></select></label><label>Clock format<select data-key="powerFlo.clockFormat"><option value="12" ${config.powerFlo.clockFormat === "12" ? "selected" : ""}>12-hour</option><option value="24" ${config.powerFlo.clockFormat === "24" ? "selected" : ""}>24-hour</option></select></label>${powerFloNumbers}<label>Standby assumption (W)<input data-key="powerFlo.standbyAssumedW" type="number" step="any" value="${escapeHtml(String(config.powerFlo.standbyAssumedW ?? ""))}"></label><label>Readiness deadline<input data-key="powerFlo.readinessDeadline" type="time" value="${escapeHtml(config.powerFlo.readinessDeadline)}"></label><label>Readiness average (W)<input data-key="powerFlo.readinessAverageW" type="number" step="any" value="${escapeHtml(String(config.powerFlo.readinessAverageW ?? ""))}"></label><label>Accuracy storage key<input data-key="powerFlo.accuracyStorageKey" value="${escapeHtml(config.powerFlo.accuracyStorageKey)}"></label><label>Forecast source IDs, comma-separated<input data-key="powerFlo.solarForecastSources" value="${escapeHtml(config.powerFlo.solarForecastSources.join(", "))}"></label>${powerFloBooleans}</fieldset><fieldset><legend>PowerFlo long-term statistics</legend>${(["solar", "grid", "load", "battery"] as const).map((key) => picker(`${key} statistic`, `powerFlo.statistics.${key}`, config.powerFlo.statistics[key], "sensor")).join("")}</fieldset><fieldset><legend>Backgrounds</legend><label>Day image URL<input data-key="backgrounds.day" type="url" value="${escapeHtml(config.backgrounds.day ?? "")}"></label><label>Night image URL<input data-key="backgrounds.night" type="url" value="${escapeHtml(config.backgrounds.night ?? "")}"></label></fieldset></form>`;
    const navigationSection = document.createElement("fieldset");
    navigationSection.innerHTML = `<legend>Navigation tabs</legend>${navigationFields}`;
    const editorForm = this.#root.querySelector("form");
    // Keep route controls near the current-view selector without coupling them to the large template string.
    editorForm?.insertBefore(navigationSection, editorForm.children.item(2));
    const hass = this.#hass;
    if (hass !== undefined) {
      this.#root.querySelectorAll<HaEntityPickerElement>("ha-entity-picker").forEach((element) => {
        element.hass = hass;
      });
    }
  }
}
