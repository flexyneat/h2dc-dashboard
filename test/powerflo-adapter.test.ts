import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config-schema";
import type { HomeAssistant } from "../src/home-assistant";
import { vi } from "vitest";
import { attachPersistentPowerFloCard, createPowerFloCardConfig, normalizePowerFloHass, POWERFLO_DERIVED_STATUS_ENTITY } from "../src/powerflo-adapter";

/** Builds a complete portable H2DC configuration with representative PowerFlo options. */
function parsedConfig() {
  const result = parseConfig({
    type: "custom:h2dc-dashboard-card",
    view: "energy",
    flow_threshold_w: 40,
    battery_positive_is: "discharge",
    grid_positive_is: "import",
    entities: {
      alarm: "alarm_control_panel.house",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.room_temperature",
      energy: {
        freshness: "binary_sensor.telemetry_fresh",
        inverter_status: "binary_sensor.inverter_status",
        grid_connected: "binary_sensor.grid_connected",
        solar: "sensor.solar_power",
        pv1_power: "sensor.pv1_power",
        pv2_power: "sensor.pv2_power",
        pv3_power: "sensor.pv3_power",
        battery_soc: "sensor.battery_soc",
        battery: "sensor.battery_power",
        battery_voltage: "sensor.battery_voltage",
        battery_temperature: "sensor.battery_temperature",
        grid: "sensor.grid_power",
        grid_voltage: "sensor.grid_voltage",
        grid_l2_voltage: "sensor.grid_l2_voltage",
        grid_frequency: "sensor.grid_frequency",
        load: "sensor.home_load",
        inverter_output_power: "sensor.inverter_output_power",
        external_ct_power_candidate: "sensor.external_ct_power_candidate",
        daily_pv: "sensor.solar_today",
        daily_grid_import: "sensor.grid_today",
        daily_battery_discharge: "sensor.battery_today",
        daily_load: "sensor.load_today",
        battery_charge_today: "sensor.battery_charge_today",
        grid_export_today: "sensor.grid_export_today",
        solar_total: "sensor.solar_total",
        grid_import_total: "sensor.grid_import_total",
        grid_export_total: "sensor.grid_export_total",
        battery_charge_total: "sensor.battery_charge_total",
        battery_discharge_total: "sensor.battery_discharge_total",
        ac_temperature: "sensor.ac_temperature",
        dc_temperature: "sensor.dc_temperature",
        solar_forecast_power: "sensor.solar_forecast_power",
        battery_current: "sensor.battery_current",
        bms_charge_current_limit: "sensor.bms_charge_current_limit",
        bms_discharge_current_limit: "sensor.bms_discharge_current_limit",
        inverter_standby_power: "sensor.inverter_standby_power",
        pv1_voltage: "sensor.pv1_voltage",
        pv1_current: "sensor.pv1_current",
        pv2_voltage: "sensor.pv2_voltage",
        pv2_current: "sensor.pv2_current",
        pv3_voltage: "sensor.pv3_voltage",
        pv3_current: "sensor.pv3_current",
      },
    },
    powerflo: {
      title: "House energy",
      inverter_name: "Example inverter",
      inverter_model: "12 kW hybrid",
      inverter_capacity_kw: 12,
      battery_capacity_kwh: 16,
      solar_capacity_kw: 10.54,
      battery_reserve_soc: 20,
      battery_charge_target_soc: 100,
      runtime_window_minutes: 7,
      runtime_max_sample_age_seconds: 75,
      charge_taper_start_soc: 92,
      charge_taper_floor_ratio: 0.25,
      solar_projection_hours: 5,
      density: "standard",
      use_learned_taper: true,
      runtime_load_efficiency: 0.91,
      energy_sources_verified: true,
      readiness_enabled: true,
      preparedness_enabled: true,
      grid_power_verified: true,
      solar_outlook_enabled: true,
      estimate_accuracy_enabled: true,
      solar_forecast_sources: ["forecast-source-1"],
      standby_measurement_verified: true,
      standby_assumed_w: 85,
      readiness_deadline: "06:30",
      readiness_average_w: 1350,
      readiness_min_coverage: 0.85,
      grid_voltage_available_min: 190,
      grid_voltage_available_max: 265,
      grid_voltage_absent_max: 45,
      export_threshold_w: 60,
      export_duration_seconds: 420,
      accuracy_storage_key: "house-main",
      clock_format: "24",
      flow_release_w: 15,
      statistics: {
        solar: "sensor.solar_total",
        grid: "sensor.grid_import_total",
        load: "sensor.load_total",
        battery: "sensor.battery_discharge_total",
      },
      grid_status_fallback: true,
    },
  });
  if (result.status === "invalid") throw new Error(result.issues.join("; "));
  return result.config;
}

describe("PowerFlo adapter", () => {
  it("does not remount a persistent PowerFlo card already attached to the same host", () => {
    const attach = vi.fn();
    const host = {};

    attachPersistentPowerFloCard(host, host, attach);
    expect(attach).not.toHaveBeenCalled();

    attachPersistentPowerFloCard(null, host, attach);
    expect(attach).toHaveBeenCalledOnce();
  });

  /** Creates the smallest Home Assistant boundary needed to verify relay normalization. */
  function relayHass(state: string): HomeAssistant {
    return {
      states: {
        "binary_sensor.grid_connected": {
          entity_id: "binary_sensor.grid_connected",
          state,
          attributes: { friendly_name: "Grid relay" },
        },
      },
      callService: async () => undefined,
      callApi: async () => ({ result: "forwarded" }),
    };
  }

  it("preserves the complete estimate and insight feature switches", () => {
    const output = createPowerFloCardConfig(parsedConfig());
    expect(output).toMatchObject({
      type: "custom:powerflo-card",
      battery_capacity_kwh: 16,
      battery_reserve_soc: 20,
      battery_charge_target_soc: 100,
      readiness_enabled: true,
      preparedness_enabled: true,
      solar_outlook_enabled: true,
      estimate_accuracy_enabled: true,
      grid_status_fallback: true,
      flow_threshold_w: 40,
      flow_release_w: 15,
    });
  });

  it("maps optional Modbus telemetry without inventing missing entities", () => {
    const output = createPowerFloCardConfig(parsedConfig());
    expect(output.entities).toMatchObject({
      freshness: "binary_sensor.telemetry_fresh",
      solar_power: "sensor.solar_power",
      pv1_power: "sensor.pv1_power",
      pv2_power: "sensor.pv2_power",
      pv3_power: "sensor.pv3_power",
      battery_soc: "sensor.battery_soc",
      battery_power: "sensor.battery_power",
      grid_power: "sensor.grid_power",
      grid_voltage: "sensor.grid_voltage",
      load_power: "sensor.home_load",
      load_today: "sensor.load_today",
      battery_charge_today: "sensor.battery_charge_today",
      grid_export_today: "sensor.grid_export_today",
      solar_total: "sensor.solar_total",
      grid_import_total: "sensor.grid_import_total",
      battery_discharge_total: "sensor.battery_discharge_total",
    });
    expect(output.entities).toMatchObject({
      inverter_status: "binary_sensor.inverter_status",
      grid_connected: "binary_sensor.grid_connected",
      battery_voltage: "sensor.battery_voltage",
      battery_temperature: "sensor.battery_temperature",
      grid_l2_voltage: "sensor.grid_l2_voltage",
      grid_frequency: "sensor.grid_frequency",
      inverter_output_power: "sensor.inverter_output_power",
      external_ct_power_candidate: "sensor.external_ct_power_candidate",
      solar_today: "sensor.solar_today",
      grid_today: "sensor.grid_today",
      battery_today: "sensor.battery_today",
      grid_export_total: "sensor.grid_export_total",
      battery_charge_total: "sensor.battery_charge_total",
      ac_temperature: "sensor.ac_temperature",
      dc_temperature: "sensor.dc_temperature",
      solar_forecast_power: "sensor.solar_forecast_power",
      battery_current: "sensor.battery_current",
      bms_charge_current_limit: "sensor.bms_charge_current_limit",
      bms_discharge_current_limit: "sensor.bms_discharge_current_limit",
      inverter_standby_power: "sensor.inverter_standby_power",
      pv1_voltage: "sensor.pv1_voltage",
      pv1_current: "sensor.pv1_current",
      pv2_voltage: "sensor.pv2_voltage",
      pv2_current: "sensor.pv2_current",
      pv3_voltage: "sensor.pv3_voltage",
      pv3_current: "sensor.pv3_current",
    });
  });

  it("forwards every PowerFlo option that preserves runtime, readiness, history, forecast, and accuracy behavior", () => {
    const output = createPowerFloCardConfig(parsedConfig());
    expect(output).toMatchObject({
      runtime_window_minutes: 7,
      runtime_max_sample_age_seconds: 75,
      charge_taper_start_soc: 92,
      charge_taper_floor_ratio: 0.25,
      solar_projection_hours: 5,
      density: "standard",
      use_learned_taper: true,
      runtime_load_efficiency: 0.91,
      energy_sources_verified: true,
      grid_power_verified: true,
      standby_measurement_verified: true,
      standby_assumed_w: 85,
      readiness_deadline: "06:30",
      readiness_average_w: 1350,
      readiness_min_coverage: 0.85,
      grid_voltage_available_min: 190,
      grid_voltage_available_max: 265,
      grid_voltage_absent_max: 45,
      export_threshold_w: 60,
      export_duration_seconds: 420,
      statistics: {
        solar: "sensor.solar_total",
        grid: "sensor.grid_import_total",
        load: "sensor.load_total",
        battery: "sensor.battery_discharge_total",
      },
      solar_forecast_sources: ["forecast-source-1"],
      accuracy_storage_key: "house-main",
      clock_format: "24",
      flow_release_w: 15,
    });
  });

  it("keeps both estimate targets distinct in the forwarded configuration", () => {
    const output = createPowerFloCardConfig(parsedConfig());
    expect(output.battery_charge_target_soc).toBe(100);
    expect(output.battery_reserve_soc).toBe(20);
  });

  it.each([
    ["1.0", "on"],
    ["0.0", "off"],
  ] as const)("normalizes commissioned numeric relay state %s to %s", (source, expected) => {
    const hass = relayHass(source);
    const normalized = normalizePowerFloHass(hass, parsedConfig().entities.energy);

    expect(normalized.states["binary_sensor.grid_connected"]?.state).toBe(expected);
    expect(hass.states["binary_sensor.grid_connected"]?.state).toBe(source);
  });

  it("leaves native and unknown relay states unchanged", () => {
    for (const state of ["on", "off", "unknown", "unavailable"]) {
      const hass = relayHass(state);
      const normalized = normalizePowerFloHass(hass, parsedConfig().entities.energy);

      expect(normalized.states).toBe(hass.states);
      expect(normalized.states["binary_sensor.grid_connected"]?.state).toBe(state);
    }
  });

  it("forwards the Home Assistant API without exposing a mutable source state map", async () => {
    const hass = relayHass("1.0");
    const normalized = normalizePowerFloHass(hass, parsedConfig().entities.energy);

    await expect(normalized.callApi?.("GET", "history/period", { minimal_response: true })).resolves.toEqual({ result: "forwarded" });
    expect(normalized.states).not.toBe(hass.states);
  });

  it("forwards the read-only forecast channel and stable connection identity", async () => {
    const connection = {
      subscribeMessage: vi.fn(async () => () => undefined),
    };
    const callWS = vi.fn(async () => ({ roof: { wh_hours: { "2026-11-03T10:00:00Z": 1200 } } }));
    const hass: HomeAssistant = {
      ...relayHass("1.0"),
      connection,
      user: { id: "operator" },
      callWS,
    };

    const normalized = normalizePowerFloHass(hass, parsedConfig().entities.energy);

    await expect(normalized.callWS?.({ type: "energy/solar_forecast" })).resolves.toEqual({
      roof: { wh_hours: { "2026-11-03T10:00:00Z": 1200 } },
    });
    expect(normalized.connection).toBe(connection);
    expect(normalized.user).toEqual({ id: "operator" });
    expect(callWS).toHaveBeenCalledWith({ type: "energy/solar_forecast" });
  });

  it.each([
    ["on", "Online"],
    ["off", "Telemetry stale"],
    ["unavailable", "Telemetry unavailable"],
  ] as const)("projects freshness %s into an honest read-only PowerFlo status", (freshnessState, expected) => {
    const config = parsedConfig();
    const { inverterStatus: _unused, ...energyWithoutStatus } = config.entities.energy;
    const hass: HomeAssistant = {
      states: {
        [energyWithoutStatus.freshness]: {
          entity_id: energyWithoutStatus.freshness,
          state: freshnessState,
          attributes: { friendly_name: "Telemetry fresh" },
          last_updated: "2026-11-03T06:00:00.000Z",
        },
      },
      callService: async () => undefined,
    };

    const normalized = normalizePowerFloHass(hass, energyWithoutStatus);
    expect(normalized.states[POWERFLO_DERIVED_STATUS_ENTITY]).toMatchObject({
      state: expected,
      attributes: { source_entity: energyWithoutStatus.freshness },
      last_updated: "2026-11-03T06:00:00.000Z",
    });
    expect(hass.states[POWERFLO_DERIVED_STATUS_ENTITY]).toBeUndefined();
  });

  it("maps the derived read-only status only when no commissioned status entity exists", () => {
    const config = parsedConfig();
    const { inverterStatus: _unused, ...energyWithoutStatus } = config.entities.energy;
    const withoutStatus = createPowerFloCardConfig({
      ...config,
      entities: { ...config.entities, energy: energyWithoutStatus },
    });

    expect(withoutStatus.entities).toMatchObject({ inverter_status: POWERFLO_DERIVED_STATUS_ENTITY });
    expect(createPowerFloCardConfig(config).entities).toMatchObject({ inverter_status: "binary_sensor.inverter_status" });
  });
});
