/**
 * @fileoverview Safe adapter from typed H2DC configuration to the complete PowerFlo card contract.
 */

import type { EnergyEntities, H2DCConfig, PowerFloOptions } from "./domain";
import type { HassEntity, HomeAssistant } from "./home-assistant";

/** Minimal public surface exposed by the installed PowerFlo custom element. */
export interface PowerFloCardElement extends HTMLElement {
  setConfig(config: Readonly<Record<string, unknown>>): void;
  hass: HomeAssistant;
}

/** Registration tag for the proven PowerFlo custom card. */
export const POWERFLO_ELEMENT_NAME = "powerflo-card" as const;

/** Read-only projected status used only when an installation has no separate operating-status entity. */
export const POWERFLO_DERIVED_STATUS_ENTITY = "sensor.h2dc_powerflo_telemetry_status" as const;

/**
 * Determines whether a persistent PowerFlo element must move to a new host.
 *
 * @param currentParent - The card's current parent, or null before its first mount.
 * @param requestedHost - The host that should own the card.
 * @returns True only when a DOM move is necessary.
 */
export function shouldAttachPowerFloCard(currentParent: object | null, requestedHost: object): boolean {
  return currentParent !== requestedHost;
}

/**
 * Attaches a persistent card only when it is not already owned by the requested host.
 *
 * @param currentParent - The card's current parent, or null before its first mount.
 * @param requestedHost - Destination that should own the card.
 * @param attach - DOM attachment operation, invoked only when ownership changes.
 */
export function attachPersistentPowerFloCard(currentParent: object | null, requestedHost: object, attach: () => void): void {
  if (shouldAttachPowerFloCard(currentParent, requestedHost)) attach();
}

/** Normalizes only the commissioned numeric relay representation for PowerFlo 0.5.x. */
export function normalizePowerFloHass(hass: HomeAssistant, entities: EnergyEntities): HomeAssistant {
  const relayId = entities.gridConnected;
  const relay = relayId === undefined ? undefined : hass.states[relayId];
  const normalized = relay?.state === "1.0" ? "on" : relay?.state === "0.0" ? "off" : undefined;
  let states = normalized === undefined || relayId === undefined || relay === undefined
    ? hass.states
    : { ...hass.states, [relayId]: { ...relay, state: normalized } satisfies HassEntity };

  if (entities.inverterStatus === undefined) {
    const freshness = hass.states[entities.freshness];
    const status = freshness?.state === "on"
      ? "Online"
      : freshness?.state === "off"
        ? "Telemetry stale"
        : "Telemetry unavailable";
    // This projection satisfies PowerFlo's required text role without inventing an HA helper or mutating source state.
    states = {
      ...states,
      [POWERFLO_DERIVED_STATUS_ENTITY]: {
        entity_id: POWERFLO_DERIVED_STATUS_ENTITY,
        state: status,
        attributes: {
          friendly_name: "H2DC PowerFlo telemetry status",
          source_entity: entities.freshness,
        },
        ...(freshness?.last_changed === undefined ? {} : { last_changed: freshness.last_changed }),
        ...(freshness?.last_updated === undefined ? {} : { last_updated: freshness.last_updated }),
      } satisfies HassEntity,
    };
  }
  return {
    states,
    ...(hass.config === undefined ? {} : { config: hass.config }),
    // Preserve the frontend connection identity used by PowerFlo's read-only subscriptions.
    ...(hass.connection === undefined ? {} : { connection: hass.connection }),
    ...(hass.user === undefined ? {} : { user: hass.user }),
    callService: (domain, service, data) => hass.callService(domain, service, data),
    ...(hass.callApi === undefined ? {} : { callApi: (method: string, path: string, parameters?: unknown) => hass.callApi?.(method, path, parameters) ?? Promise.reject(new Error("Home Assistant API unavailable")) }),
    ...(hass.callWS === undefined ? {} : { callWS: (message: Readonly<Record<string, unknown>>) => hass.callWS?.(message) ?? Promise.reject(new Error("Home Assistant WebSocket API unavailable")) }),
  };
}

/** Converts H2DC camel-case telemetry names to PowerFlo's stable snake-case contract. */
function powerFloEntities(entities: EnergyEntities): Readonly<Record<string, string>> {
  const mappings: readonly (readonly [keyof EnergyEntities, string])[] = [
    ["freshness", "freshness"], ["inverterStatus", "inverter_status"], ["gridConnected", "grid_connected"],
    ["solar", "solar_power"], ["pv1Power", "pv1_power"], ["pv2Power", "pv2_power"], ["pv3Power", "pv3_power"],
    ["batterySoc", "battery_soc"], ["battery", "battery_power"], ["batteryVoltage", "battery_voltage"],
    ["batteryTemperature", "battery_temperature"], ["grid", "grid_power"], ["gridVoltage", "grid_voltage"],
    ["gridFrequency", "grid_frequency"], ["gridL2Voltage", "grid_l2_voltage"], ["load", "load_power"],
    ["inverterOutputPower", "inverter_output_power"], ["externalCtPowerCandidate", "external_ct_power_candidate"],
    ["dailyPv", "solar_today"], ["dailyGridImport", "grid_today"], ["dailyBatteryDischarge", "battery_today"],
    ["dailyLoad", "load_today"],
    ["batteryChargeToday", "battery_charge_today"], ["gridExportToday", "grid_export_today"],
    ["solarTotal", "solar_total"], ["gridImportTotal", "grid_import_total"], ["gridExportTotal", "grid_export_total"],
    ["batteryChargeTotal", "battery_charge_total"], ["batteryDischargeTotal", "battery_discharge_total"],
    ["acTemperature", "ac_temperature"], ["dcTemperature", "dc_temperature"],
    ["solarForecastPower", "solar_forecast_power"], ["batteryCurrent", "battery_current"],
    ["bmsChargeCurrentLimit", "bms_charge_current_limit"], ["bmsDischargeCurrentLimit", "bms_discharge_current_limit"],
    ["inverterStandbyPower", "inverter_standby_power"], ["pv1Voltage", "pv1_voltage"], ["pv1Current", "pv1_current"],
    ["pv2Voltage", "pv2_voltage"], ["pv2Current", "pv2_current"], ["pv3Voltage", "pv3_voltage"], ["pv3Current", "pv3_current"],
  ];
  const output = Object.fromEntries(mappings.flatMap(([source, target]) => {
    const value = entities[source];
    return typeof value === "string" && value !== "" ? [[target, value] as const] : [];
  }));
  return entities.inverterStatus === undefined
    ? { ...output, inverter_status: POWERFLO_DERIVED_STATUS_ENTITY }
    : output;
}

/** Projects one typed PowerFlo option set into its documented external card keys. */
function powerFloOptions(options: PowerFloOptions): Readonly<Record<string, unknown>> {
  return {
    title: options.title,
    inverter_name: options.inverterName,
    inverter_model: options.inverterModel,
    inverter_capacity_kw: options.inverterCapacityKw,
    battery_capacity_kwh: options.batteryCapacityKwh,
    solar_capacity_kw: options.solarCapacityKw,
    battery_reserve_soc: options.batteryReserveSoc,
    battery_charge_target_soc: options.batteryChargeTargetSoc,
    runtime_window_minutes: options.runtimeWindowMinutes,
    runtime_max_sample_age_seconds: options.runtimeMaxSampleAgeSeconds,
    charge_taper_start_soc: options.chargeTaperStartSoc,
    charge_taper_floor_ratio: options.chargeTaperFloorRatio,
    solar_projection_hours: options.solarProjectionHours,
    density: options.density,
    use_learned_taper: options.useLearnedTaper,
    runtime_load_efficiency: options.runtimeLoadEfficiency,
    energy_sources_verified: options.energySourcesVerified,
    readiness_enabled: options.readinessEnabled,
    preparedness_enabled: options.preparednessEnabled,
    grid_power_verified: options.gridPowerVerified,
    grid_status_fallback: options.gridStatusFallback,
    grid_voltage_available_min: options.gridVoltageAvailableMin,
    grid_voltage_available_max: options.gridVoltageAvailableMax,
    grid_voltage_absent_max: options.gridVoltageAbsentMax,
    export_threshold_w: options.exportThresholdW,
    export_duration_seconds: options.exportDurationSeconds,
    standby_measurement_verified: options.standbyMeasurementVerified,
    standby_assumed_w: options.standbyAssumedW,
    readiness_deadline: options.readinessDeadline,
    readiness_average_w: options.readinessAverageW,
    readiness_min_coverage: options.readinessMinCoverage,
    statistics: options.statistics,
    solar_outlook_enabled: options.solarOutlookEnabled,
    solar_forecast_sources: options.solarForecastSources,
    estimate_accuracy_enabled: options.estimateAccuracyEnabled,
    accuracy_storage_key: options.accuracyStorageKey,
    inverter_image: options.inverterImage,
    clock_format: options.clockFormat,
    flow_release_w: options.flowReleaseW,
  };
}

/** Creates the complete read-only PowerFlo card configuration from validated H2DC state. */
export function createPowerFloCardConfig(config: H2DCConfig): Readonly<Record<string, unknown>> {
  return {
    type: "custom:powerflo-card",
    ...powerFloOptions(config.powerFlo),
    flow_threshold_w: config.flowThresholdW,
    battery_positive: config.batteryPositiveIs,
    grid_positive: config.gridPositiveIs,
    weather_entity: config.entities.weather,
    entities: powerFloEntities(config.entities.energy),
  };
}

/** Mounts or reattaches one persistent PowerFlo card without invoking any Home Assistant action. */
export function mountPowerFloCard(host: HTMLElement, config: H2DCConfig, hass: HomeAssistant, existing?: PowerFloCardElement): PowerFloCardElement | undefined {
  if (customElements.get(POWERFLO_ELEMENT_NAME) === undefined) return undefined;
  const card = existing ?? document.createElement(POWERFLO_ELEMENT_NAME) as PowerFloCardElement;
  if (existing === undefined) {
    card.classList.add("powerflo-card");
    card.setConfig(createPowerFloCardConfig(config));
  }
  card.hass = normalizePowerFloHass(hass, config.entities.energy);
  // Replacing an already-mounted child invokes PowerFlo's disconnect lifecycle and clears both estimators.
  attachPersistentPowerFloCard(card.parentElement, host, () => host.replaceChildren(card));
  return card;
}
