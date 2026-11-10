import { describe, expect, it, vi } from "vitest";
import { dispatchDashboardAction } from "../src/actions";
import type { HomeAssistant } from "../src/home-assistant";

/** Creates a service spy without exposing mutable Home Assistant state. */
function serviceHarness(): { readonly hass: HomeAssistant; readonly callService: ReturnType<typeof vi.fn> } {
  const callService = vi.fn(async () => undefined);
  return { hass: { states: {}, callService }, callService };
}

describe("dispatchDashboardAction", () => {
  it("dispatches only an explicit user light toggle", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "toggle", entityId: "light.kitchen" });
    expect(harness.callService).toHaveBeenCalledWith("light", "toggle", { entity_id: "light.kitchen" });
  });

  it("rejects arbitrary toggle domains", async () => {
    const harness = serviceHarness();
    await expect(dispatchDashboardAction(harness.hass, { type: "toggle", entityId: "lock.front_door" })).rejects.toThrow("Toggle supports only light and switch");
    expect(harness.callService).not.toHaveBeenCalled();
  });

  it("bounds climate temperature before dispatch", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "set_climate_temperature", entityId: "climate.living_room", temperature: 99 });
    expect(harness.callService).toHaveBeenCalledWith("climate", "set_temperature", { entity_id: "climate.living_room", temperature: 35 });
  });

  it("maps cool and off to distinct safe services", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "set_climate_mode", entityId: "climate.living_room", mode: "cool" });
    await dispatchDashboardAction(harness.hass, { type: "set_climate_mode", entityId: "climate.living_room", mode: "off" });
    expect(harness.callService).toHaveBeenNthCalledWith(1, "climate", "set_hvac_mode", { entity_id: "climate.living_room", hvac_mode: "cool" });
    expect(harness.callService).toHaveBeenNthCalledWith(2, "climate", "turn_off", { entity_id: "climate.living_room" });
  });

  it("rounds and bounds brightness", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "set_light_brightness", entityId: "light.lounge", brightnessPercent: 0.4 });
    expect(harness.callService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "light.lounge", brightness_pct: 1 });
  });

  it("rejects a forged climate mode without calling Home Assistant", async () => {
    const harness = serviceHarness();
    await expect(dispatchDashboardAction(harness.hass, { type: "set_climate_mode", entityId: "climate.living_room", mode: "heat" })).rejects.toThrow("Climate mode must be cool or off");
    expect(harness.callService).not.toHaveBeenCalled();
  });

  it("rejects a forged media command without calling Home Assistant", async () => {
    const harness = serviceHarness();
    await expect(dispatchDashboardAction(harness.hass, { type: "media", entityId: "media_player.speakers", command: "volume_set" })).rejects.toThrow("Unsupported media command");
    expect(harness.callService).not.toHaveBeenCalled();
  });

  it("dispatches only allowlisted alarm arming commands", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "alarm", entityId: "alarm_control_panel.house", command: "alarm_arm_home" });
    expect(harness.callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_arm_home", { entity_id: "alarm_control_panel.house" });
  });

  it("rejects forged alarm commands and incorrect domains", async () => {
    const forged = serviceHarness();
    await expect(dispatchDashboardAction(forged.hass, { type: "alarm", entityId: "alarm_control_panel.house", command: "alarm_disarm" })).rejects.toThrow("Unsupported alarm command");
    await expect(dispatchDashboardAction(forged.hass, { type: "alarm", entityId: "switch.house", command: "alarm_arm_home" })).rejects.toThrow("alarm_control_panel");
    expect(forged.callService).not.toHaveBeenCalled();
  });

  it("sends a validated alarm code only at the disarm service boundary", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "alarm_disarm", entityId: "alarm_control_panel.house", code: "1234" });
    expect(harness.callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_disarm", { entity_id: "alarm_control_panel.house", code: "1234" });
    await expect(dispatchDashboardAction(harness.hass, { type: "alarm_disarm", entityId: "alarm_control_panel.house", code: "12x4" })).rejects.toThrow("1 to 12 digits");
  });

  it("toggles only the exact configured PoE switch", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "poe_toggle", entityId: "switch.rack_poe", allowedEntityId: "switch.rack_poe" });
    expect(harness.callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.rack_poe" });

    const forged = serviceHarness();
    await expect(dispatchDashboardAction(forged.hass, { type: "poe_toggle", entityId: "switch.other", allowedEntityId: "switch.rack_poe" })).rejects.toThrow("configured switch");
    await expect(dispatchDashboardAction(forged.hass, { type: "poe_toggle", entityId: "light.kitchen", allowedEntityId: "light.kitchen" })).rejects.toThrow("configured switch");
    expect(forged.callService).not.toHaveBeenCalled();
  });

  it("toggles only the exact configured OCPP control switch", async () => {
    const harness = serviceHarness();
    await dispatchDashboardAction(harness.hass, { type: "ocpp_toggle", entityId: "switch.ev_charger", allowedEntityId: "switch.ev_charger" });
    expect(harness.callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.ev_charger" });

    const forged = serviceHarness();
    await expect(dispatchDashboardAction(forged.hass, { type: "ocpp_toggle", entityId: "switch.other", allowedEntityId: "switch.ev_charger" })).rejects.toThrow("configured control switch");
    expect(forged.callService).not.toHaveBeenCalled();
  });

  it("rejects non-finite numeric payloads", async () => {
    const harness = serviceHarness();
    await expect(dispatchDashboardAction(harness.hass, { type: "set_light_brightness", entityId: "light.lounge", brightnessPercent: Number.NaN })).rejects.toThrow("finite value");
    await expect(dispatchDashboardAction(harness.hass, { type: "set_climate_temperature", entityId: "climate.living_room", temperature: Number.POSITIVE_INFINITY })).rejects.toThrow("finite value");
    expect(harness.callService).not.toHaveBeenCalled();
  });
});
