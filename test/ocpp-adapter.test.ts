import { describe, expect, it } from "vitest";
import { normalizeOcppState, projectOcpp, readOcppSessions } from "../src/ocpp-adapter";
import type { HomeAssistant } from "../src/home-assistant";

/** Builds a minimal Home Assistant test boundary for OCPP telemetry. */
function hass(overrides: Readonly<Record<string, { readonly state: string; readonly attributes: Readonly<Record<string, unknown>> }>> = {}): HomeAssistant {
  return {
    states: {
      "sensor.charger_status": { state: "Charging", attributes: { sessions: [{ transaction_id: 42, started_at: "2026-11-09T10:00:00Z", energy_kwh: 7.25 }] } },
      "sensor.charger_power": { state: "7200", attributes: { unit_of_measurement: "W" } },
      "sensor.session_energy": { state: "3500", attributes: { unit_of_measurement: "Wh" } },
      "sensor.bad": { state: "unavailable", attributes: {} },
      ...overrides,
    },
    callService: async () => undefined,
  };
}

describe("OCPP adapter", () => {
  it("normalizes OCPP 1.6 connector states", () => {
    expect(normalizeOcppState("SuspendedEVSE")).toBe("suspended");
    expect(normalizeOcppState("Faulted")).toBe("faulted");
    expect(normalizeOcppState("VendorSpecificState")).toBe("unknown");
  });

  it("normalizes OCPP 2.x connector and transaction states", () => {
    expect(normalizeOcppState("EVConnected")).toBe("preparing");
    expect(normalizeOcppState("Reserved")).toBe("preparing");
    expect(normalizeOcppState("Suspended EV")).toBe("suspended");
    expect(normalizeOcppState("EVSE_Faulted")).toBe("faulted");
  });

  it("projects only available telemetry and never fabricates measurands", () => {
    const result = projectOcpp(hass(), {
      status: "sensor.charger_status",
      power: "sensor.charger_power",
      sessionEnergy: "sensor.session_energy",
      voltage: "sensor.bad",
    });
    expect(result).toMatchObject({ configured: true, simulated: false, state: "charging", powerKw: 7.2, sessionEnergyKwh: 3.5 });
    expect(result.voltageV).toBeUndefined();
    expect(result.sessions[0]).toMatchObject({ id: "42", energyKwh: 7.25 });
  });

  it("rejects malformed session history", () => {
    expect(readOcppSessions({ state: "idle", attributes: { sessions: [{ energy_kwh: 2 }, "bad"] } })).toEqual([]);
  });

  it("normalizes power, energy and duration units at the entity boundary", () => {
    const boundary = hass({ "sensor.duration": { state: "90", attributes: { unit_of_measurement: "s" } } });
    const result = projectOcpp(boundary, {
      status: "sensor.charger_status",
      power: "sensor.charger_power",
      sessionEnergy: "sensor.session_energy",
      sessionDuration: "sensor.duration",
    });
    expect(result.powerKw).toBe(7.2);
    expect(result.sessionEnergyKwh).toBe(3.5);
    expect(result.sessionDurationMinutes).toBe(1.5);
  });

  it("prefers an explicitly configured history helper over status attributes", () => {
    const boundary = hass({ "sensor.history": {
      state: "ready",
      attributes: { sessions: [{ id: "tx-2", started_at: "2026-11-09T12:00:00Z", energy_kwh: 3.4 }] },
    } });
    const result = projectOcpp(boundary, { status: "sensor.charger_status", sessionHistory: "sensor.history" });
    expect(result.sessions[0]?.id).toBe("tx-2");
  });

  it("marks only an explicitly attributed preview source as simulated", () => {
    const boundary = hass({ "sensor.charger_status": { state: "Charging", attributes: { h2dc_demo: true } } });
    expect(projectOcpp(boundary, { status: "sensor.charger_status" }).simulated).toBe(true);
  });
});
