/**
 * @fileoverview Opt-in, read-only EV charging telemetry for evaluating H2DC without a physical charger.
 */

import { isRecord } from "./config-schema";
import type { H2DCConfig } from "./domain";
import type { HassEntity, HomeAssistant } from "./home-assistant";

/** Public configuration flag for the read-only simulated charger. */
export const EV_CHARGING_DEMO_FLAG = "ev_charging_demo" as const;

/** Legacy isolated-preview alias retained so existing preview cards remain compatible. */
export const LEGACY_PREVIEW_EV_CHARGING_DEMO_FLAG = "preview_ev_charging_demo" as const;

const DEMO_ENTITIES = {
  status: "sensor.h2dc_demo_ev_status",
  power: "sensor.h2dc_demo_ev_power",
  sessionEnergy: "sensor.h2dc_demo_ev_session_energy",
  totalEnergy: "sensor.h2dc_demo_ev_total_energy",
  current: "sensor.h2dc_demo_ev_current",
  voltage: "sensor.h2dc_demo_ev_voltage",
  temperature: "sensor.h2dc_demo_ev_temperature",
  sessionDuration: "sensor.h2dc_demo_ev_session_duration",
  transactionId: "sensor.h2dc_demo_ev_transaction_id",
  connectorId: "sensor.h2dc_demo_ev_connector_id",
  errorCode: "sensor.h2dc_demo_ev_error_code",
  sessionHistory: "sensor.h2dc_demo_ev_session_history",
  maximumCurrent: "number.h2dc_demo_ev_maximum_current",
  availability: "binary_sensor.h2dc_demo_ev_available",
} as const;

/** Returns whether a raw configuration explicitly requests simulated EV telemetry. */
export function isEvChargingDemoRequested(input: unknown): boolean {
  return isRecord(input)
    && (input[EV_CHARGING_DEMO_FLAG] === true || input[LEGACY_PREVIEW_EV_CHARGING_DEMO_FLAG] === true);
}

/** Returns whether static configuration or a mapped Home Assistant helper enables the simulator capability. */
export function isEvChargingDemoConfigured(input: unknown): boolean {
  if (isEvChargingDemoRequested(input)) return true;
  if (!isRecord(input) || !isRecord(input.entities) || !isRecord(input.entities.diagnostics)) return false;
  const diagnostics = input.entities.diagnostics;
  return typeof diagnostics.ev_charging_demo_control === "string"
    || typeof diagnostics.evChargingDemoControl === "string";
}

/** Resolves the simulator's live state, giving a mapped helper precedence over the static flag. */
export function isEvChargingDemoActive(config: H2DCConfig, hass: HomeAssistant): boolean {
  const control = config.entities.diagnostics.evChargingDemoControl;
  return control === undefined ? config.evChargingDemo : hass.states[control]?.state === "on";
}

/** Injects a complete read-only OCPP mapping without adding a charge-control entity. */
export function withEvChargingDemoConfig(input: unknown): unknown {
  if (!isEvChargingDemoConfigured(input) || !isRecord(input)) return input;
  const entities = isRecord(input.entities) ? input.entities : {};
  return {
    ...input,
    ev_charging_demo: true,
    entities: {
      ...entities,
      ocpp: {
        status: DEMO_ENTITIES.status,
        power: DEMO_ENTITIES.power,
        session_energy: DEMO_ENTITIES.sessionEnergy,
        total_energy: DEMO_ENTITIES.totalEnergy,
        current: DEMO_ENTITIES.current,
        voltage: DEMO_ENTITIES.voltage,
        temperature: DEMO_ENTITIES.temperature,
        session_duration: DEMO_ENTITIES.sessionDuration,
        transaction_id: DEMO_ENTITIES.transactionId,
        connector_id: DEMO_ENTITIES.connectorId,
        error_code: DEMO_ENTITIES.errorCode,
        session_history: DEMO_ENTITIES.sessionHistory,
        maximum_current: DEMO_ENTITIES.maximumCurrent,
        availability: DEMO_ENTITIES.availability,
      },
    },
  };
}

/** Builds one immutable synthetic Home Assistant state for the read-only preview. */
function demoEntity(state: string, attributes: HassEntity["attributes"] = {}): HassEntity {
  return { state, attributes };
}

/** Adds deterministic simulated charging telemetry without mutating the live Home Assistant state map. */
export function withEvChargingDemoStates(hass: HomeAssistant): HomeAssistant {
  return {
    ...hass,
    states: {
      ...hass.states,
      [DEMO_ENTITIES.status]: demoEntity("Charging", { h2dc_demo: true }),
      [DEMO_ENTITIES.power]: demoEntity("7.4", { unit_of_measurement: "kW" }),
      [DEMO_ENTITIES.sessionEnergy]: demoEntity("18.62", { unit_of_measurement: "kWh" }),
      [DEMO_ENTITIES.totalEnergy]: demoEntity("1842.6", { unit_of_measurement: "kWh" }),
      [DEMO_ENTITIES.current]: demoEntity("32", { unit_of_measurement: "A" }),
      [DEMO_ENTITIES.voltage]: demoEntity("231.4", { unit_of_measurement: "V" }),
      [DEMO_ENTITIES.temperature]: demoEntity("41.8", { unit_of_measurement: "°C" }),
      [DEMO_ENTITIES.sessionDuration]: demoEntity("151", { unit_of_measurement: "min" }),
      [DEMO_ENTITIES.transactionId]: demoEntity("DEMO-TX-2048"),
      [DEMO_ENTITIES.connectorId]: demoEntity("1"),
      [DEMO_ENTITIES.errorCode]: demoEntity("NoError"),
      [DEMO_ENTITIES.maximumCurrent]: demoEntity("32", { unit_of_measurement: "A" }),
      [DEMO_ENTITIES.availability]: demoEntity("on", { device_class: "connectivity" }),
      [DEMO_ENTITIES.sessionHistory]: demoEntity("4 sessions", {
        sessions: [
          { id: "DEMO-TX-2048", started_at: "2026-11-10T08:19:00+01:00", energy_kwh: 18.62, duration_minutes: 151 },
          { id: "DEMO-TX-2037", started_at: "2026-11-09T18:42:00+01:00", stopped_at: "2026-11-09T21:14:00+01:00", energy_kwh: 21.48, duration_minutes: 152, stop_reason: "EV disconnected" },
          { id: "DEMO-TX-2021", started_at: "2026-11-07T07:08:00+01:00", stopped_at: "2026-11-07T08:36:00+01:00", energy_kwh: 12.31, duration_minutes: 88, stop_reason: "Completed" },
          { id: "DEMO-TX-1998", started_at: "2026-11-05T19:26:00+01:00", stopped_at: "2026-11-05T22:03:00+01:00", energy_kwh: 23.05, duration_minutes: 157, stop_reason: "Local stop" },
        ],
      }),
    },
  };
}
