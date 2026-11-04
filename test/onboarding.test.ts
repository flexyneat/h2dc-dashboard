import { describe, expect, it } from "vitest";
import { createDraftConfig } from "../src/config-schema";
import type { HomeAssistant } from "../src/home-assistant";
import { buildOnboardingReport } from "../src/onboarding";

/** Creates a minimal Home Assistant boundary for onboarding checks. */
function hassWith(entityIds: readonly string[]): HomeAssistant {
  return {
    states: Object.fromEntries(entityIds.map((entityId) => [entityId, { state: "on", attributes: {}, last_updated: "2026-11-04T06:00:00Z" }])),
    callService: async () => undefined,
  };
}

describe("buildOnboardingReport", () => {
  it("blocks saving when required core and energy mappings are absent", () => {
    const report = buildOnboardingReport(createDraftConfig({ type: "custom:h2dc-dashboard-card" }), hassWith([]));
    expect(report.status).toBe("blocked");
    expect(report.sections.find((section) => section.id === "core")?.status).toBe("blocked");
    expect(report.sections.find((section) => section.id === "energy")?.status).toBe("blocked");
  });

  it("reports optional product capabilities as warnings without blocking a valid core", () => {
    const config = createDraftConfig({
      type: "custom:h2dc-dashboard-card",
      entities: {
        alarm: "alarm_control_panel.home",
        climate: "climate.living_room",
        weather: "weather.home",
        room_temperature: "sensor.living_room_temperature",
        energy: {
          freshness: "binary_sensor.energy_fresh",
          solar: "sensor.solar_power",
          battery_soc: "sensor.battery_soc",
          battery: "sensor.battery_power",
          grid: "sensor.grid_power",
          load: "sensor.home_load",
        },
      },
    });
    const entityIds = [config.entities.alarm, config.entities.climate, config.entities.weather, config.entities.roomTemperature,
      config.entities.energy.freshness, config.entities.energy.solar, config.entities.energy.batterySoc,
      config.entities.energy.battery, config.entities.energy.grid, config.entities.energy.load];
    const report = buildOnboardingReport(config, hassWith(entityIds));
    expect(report.status).toBe("warning");
    expect(report.sections.find((section) => section.id === "rooms")?.status).toBe("warning");
    expect(report.sections.find((section) => section.id === "media")?.status).toBe("warning");
  });

  it("identifies mapped entities that are not present in Home Assistant", () => {
    const config = createDraftConfig({
      type: "custom:h2dc-dashboard-card",
      entities: {
        alarm: "alarm_control_panel.home",
        climate: "climate.living_room",
        weather: "weather.home",
        room_temperature: "sensor.living_room_temperature",
        energy: {
          freshness: "binary_sensor.energy_fresh",
          solar: "sensor.solar_power",
          battery_soc: "sensor.battery_soc",
          battery: "sensor.battery_power",
          grid: "sensor.grid_power",
          load: "sensor.home_load",
        },
      },
    });
    const report = buildOnboardingReport(config, hassWith([]));
    expect(report.sections.find((section) => section.id === "core")?.detail).toContain("not available");
  });
});
