import { describe, expect, it, vi } from "vitest";
import { isEvChargingDemoRequested, withEvChargingDemoConfig, withEvChargingDemoStates } from "../src/ev-charging-demo";
import type { HomeAssistant } from "../src/home-assistant";

/** Builds the smallest Home Assistant boundary needed to validate preview-state isolation. */
function hassFixture(): HomeAssistant {
  return {
    states: { "sensor.real": { state: "42", attributes: {} } },
    callService: vi.fn(async () => undefined),
  };
}

describe("EV charging preview demo", () => {
  it("does nothing unless the isolated preview flag is explicitly true", () => {
    const input = { type: "custom:h2dc-dashboard-preview", entities: { alarm: "alarm_control_panel.home" } };
    expect(isEvChargingDemoRequested(input)).toBe(false);
    expect(withEvChargingDemoConfig(input)).toBe(input);
  });

  it("injects read-only OCPP mappings without a charge-control entity", () => {
    const result = withEvChargingDemoConfig({
      type: "custom:h2dc-dashboard-preview",
      ev_charging_demo: true,
      entities: { alarm: "alarm_control_panel.home" },
    });
    expect(result).toMatchObject({
      entities: {
        alarm: "alarm_control_panel.home",
        ocpp: {
          status: "sensor.h2dc_demo_ev_status",
          power: "sensor.h2dc_demo_ev_power",
          session_history: "sensor.h2dc_demo_ev_session_history",
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("charge_control");
  });

  it("retains the legacy isolated-preview flag while promoting the public flag", () => {
    const result = withEvChargingDemoConfig({ preview_ev_charging_demo: true });
    expect(result).toMatchObject({ ev_charging_demo: true });
  });

  it("adds deterministic demo states while preserving live state and service methods", () => {
    const live = hassFixture();
    const result = withEvChargingDemoStates(live);
    expect(result.states["sensor.real"]?.state).toBe("42");
    expect(result.states["sensor.h2dc_demo_ev_status"]?.state).toBe("Charging");
    expect(result.states["sensor.h2dc_demo_ev_status"]?.attributes.h2dc_demo).toBe(true);
    expect(result.states["sensor.h2dc_demo_ev_session_history"]?.attributes.sessions).toHaveLength(4);
    expect(result.callService).toBe(live.callService);
  });
});
