import { describe, expect, it } from "vitest";
import type { H2DCConfig } from "../src/domain";
import { projectHousePulse } from "../src/house-pulse";
import type { HassEntity, HomeAssistant } from "../src/home-assistant";
import { validConfig } from "./fixtures";

/** Returns a complete H2DC configuration with commissioned-style House Pulse sources. */
function pulseConfig(): H2DCConfig {
  const config = validConfig();
  return {
    ...config,
    entities: {
      ...config.entities,
      housePulse: {
        access: [],
        comfort: [{ entity: "sensor.humidity", label: "Living room humidity", icon: "mdi:water-percent" }],
        presence: [
          { entity: "binary_sensor.living_presence", label: "Living room", icon: "mdi:motion-sensor" },
          { entity: "binary_sensor.dining_presence", label: "Dining room", icon: "mdi:motion-sensor" },
        ],
        attention: [
          { entity: "binary_sensor.front_door_battery_low", label: "Front door", icon: "mdi:battery-alert" },
          { entity: "binary_sensor.study_door_battery_low", label: "Study door", icon: "mdi:battery-alert" },
        ],
      },
    },
  };
}

/** Builds one immutable Home Assistant state fixture. */
function hass(states: Readonly<Record<string, HassEntity>>): HomeAssistant {
  return { states, callService: async () => undefined };
}

describe("projectHousePulse", () => {
  it("counts multiple occupied rooms without a duplicate template helper", () => {
    const projection = projectHousePulse(pulseConfig(), hass({
      "binary_sensor.living_presence": { state: "on", attributes: {} },
      "binary_sensor.dining_presence": { state: "occupied", attributes: {} },
    }), "presence");

    expect(projection.summary).toBe("2 rooms occupied");
    expect(projection.items.map((item) => item.label)).toEqual(["Living room", "Dining room"]);
  });

  it("counts and lists only active native low-battery signals", () => {
    const projection = projectHousePulse(pulseConfig(), hass({
      "binary_sensor.front_door_battery_low": { state: "on", attributes: {} },
      "binary_sensor.study_door_battery_low": { state: "off", attributes: {} },
    }), "attention");

    expect(projection.summary).toBe("Front door battery low");
    expect(projection.items).toEqual([
      { label: "Front door", icon: "mdi:battery-alert", state: "active", value: "Battery low" },
      { label: "Study door", icon: "mdi:battery-alert", state: "clear", value: "Clear" },
    ]);
  });
});
