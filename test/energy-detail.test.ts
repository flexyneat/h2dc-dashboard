import { describe, expect, it } from "vitest";

import { renderFocusedEnergyDetail, usesCompletePowerFlo } from "../src/energy-detail";
import { createDraftConfig } from "../src/config-schema";
import type { HomeAssistant } from "../src/home-assistant";

/** Builds a portable configuration populated with representative Energy entities. */
function config() {
  return createDraftConfig({
    view: "energy",
    powerflo: { inverter_name: "Deye", inverter_model: "SUN-12K", battery_reserve_soc: 20 },
    entities: { energy: { freshness: "binary_sensor.fresh", grid_connected: "binary_sensor.grid", solar: "sensor.solar", battery_soc: "sensor.soc", battery: "sensor.battery", grid: "sensor.grid", load: "sensor.load", pv1_power: "sensor.pv1" } },
  });
}

/** Builds representative live Home Assistant telemetry. */
function hass(): HomeAssistant {
  const state = (value: string) => ({ state: value, attributes: {} });
  return { states: { "binary_sensor.fresh": state("on"), "binary_sensor.grid": state("on"), "sensor.solar": state("3700"), "sensor.battery": state("-2550"), "sensor.grid": state("0"), "sensor.load": state("1240"), "sensor.soc": state("99"), "sensor.pv1": state("1790") }, callService: async () => undefined };
}

describe("Energy detail surfaces", () => {
  it("reserves the complete embedded PowerFlo application for the explicit analysis trigger", () => {
    expect(usesCompletePowerFlo("analysis")).toBe(true);
    expect(usesCompletePowerFlo("solar")).toBe(false);
  });

  it("renders concept-specific telemetry without unrelated PowerFlo panels", () => {
    const solar = renderFocusedEnergyDetail("solar", config(), hass());
    const battery = renderFocusedEnergyDetail("battery", config(), hass());
    expect(solar).toContain("Solar now");
    expect(solar).toContain("MPPT 1");
    expect(solar).not.toContain("State of charge");
    expect(battery).toContain("State of charge");
    expect(battery).toContain("Charging");
    expect(battery).not.toContain("MPPT 1");
    expect(battery).toContain("99%");
    expect(battery).toContain("20%");
  });

  it("renders a distinct focused surface for every non-analysis trigger", () => {
    const expected = {
      solar: "Solar now",
      battery: "State of charge",
      grid: "Relay",
      load: "Protected load",
      inverter: "Rated output",
      history: "Solar today",
      readiness: "Planning deadline",
    } as const;
    const outputs = Object.entries(expected).map(([detail, marker]) => {
      const output = renderFocusedEnergyDetail(detail as keyof typeof expected, config(), hass());
      expect(output).toContain(`data-energy-detail-surface="${detail}"`);
      expect(output).toContain(marker);
      return output;
    });
    expect(new Set(outputs).size).toBe(outputs.length);
  });
});
