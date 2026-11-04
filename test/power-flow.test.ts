import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config-schema";
import type { H2DCConfig } from "../src/domain";
import type { HassEntity, HomeAssistant } from "../src/home-assistant";
import { deriveGridAvailability, derivePowerFlow, formatPower } from "../src/power-flow";

/** Builds a validated portable configuration for topology tests. */
function testConfig(overrides: Readonly<Record<string, unknown>> = {}): H2DCConfig {
  const result = parseConfig({
    type: "custom:h2dc-dashboard-card",
    view: "home",
    entities: {
      alarm: "alarm_control_panel.house",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.room_temperature",
      energy: {
        freshness: "binary_sensor.inverter_fresh",
        grid_connected: "binary_sensor.grid_relay",
        solar: "sensor.solar",
        battery_soc: "sensor.battery_soc",
        battery: "sensor.battery",
        grid: "sensor.grid",
        load: "sensor.load",
      },
    },
    ...overrides,
  });
  if (result.status === "invalid") throw new Error(result.issues.join("; "));
  return result.config;
}

/** Builds a read-only Home Assistant state map. */
function hassWith(states: Readonly<Record<string, string>>): HomeAssistant {
  const entities = Object.fromEntries(Object.entries(states).map(([entityId, state]) => [entityId, { state, attributes: {} } satisfies HassEntity]));
  return { states: entities, callService: async () => undefined };
}

describe("derivePowerFlow", () => {
  it("derives commissioned import/discharge polarity", () => {
    const flow = derivePowerFlow(hassWith({
      "binary_sensor.inverter_fresh": "on",
      "binary_sensor.grid_relay": "on",
      "sensor.solar": "2280",
      "sensor.battery_soc": "37",
      "sensor.battery": "-400",
      "sensor.grid": "1200",
      "sensor.load": "3080",
    }), testConfig());
    expect(flow).toMatchObject({ freshness: "fresh", solar: "source", battery: "sink", grid: "source", load: "sink" });
    expect(flow.summary).toBe("Solar + grid → home + battery");
  });

  it("honours inverted installation conventions", () => {
    const flow = derivePowerFlow(hassWith({
      "binary_sensor.inverter_fresh": "on",
      "binary_sensor.grid_relay": "on",
      "sensor.solar": "0",
      "sensor.battery_soc": "50",
      "sensor.battery": "500",
      "sensor.grid": "-600",
      "sensor.load": "1000",
    }), testConfig({ battery_positive_is: "charge", grid_positive_is: "export" }));
    expect(flow).toMatchObject({ battery: "sink", grid: "source", load: "sink" });
  });

  it("stops animation when freshness is stale", () => {
    const flow = derivePowerFlow(hassWith({
      "binary_sensor.inverter_fresh": "off",
      "binary_sensor.grid_relay": "on",
      "sensor.solar": "2000",
      "sensor.battery_soc": "50",
      "sensor.battery": "500",
      "sensor.grid": "600",
      "sensor.load": "1000",
    }), testConfig());
    expect(flow).toMatchObject({ freshness: "stale", solar: "idle", battery: "idle", grid: "idle", load: "idle", summary: "Telemetry stale" });
  });

  it("preserves unavailable telemetry instead of rendering zero", () => {
    const flow = derivePowerFlow(hassWith({
      "binary_sensor.inverter_fresh": "on",
      "binary_sensor.grid_relay": "on",
      "sensor.solar": "unavailable",
      "sensor.battery_soc": "unknown",
      "sensor.battery": "0",
      "sensor.grid": "0",
      "sensor.load": "0",
    }), testConfig());
    expect(flow.solar).toBe("unavailable");
    expect(formatPower(flow.solarPower)).toBe("—");
  });

  it("switches between W and kW at exactly 1000 W", () => {
    expect(formatPower({ status: "available", value: 999 })).toBe("999 W");
    expect(formatPower({ status: "available", value: 1000 })).toBe("1 kW");
    expect(formatPower({ status: "available", value: 1234.56 })).toBe("1.23 kW");
    expect(formatPower({ status: "available", value: -920.4 }, false)).toBe("-920.40 W");
  });

  it("routes battery discharge toward the inverter and home", () => {
    const flow = derivePowerFlow(hassWith({
      "binary_sensor.inverter_fresh": "on",
      "binary_sensor.grid_relay": "off",
      "sensor.solar": "0",
      "sensor.battery_soc": "47",
      "sensor.battery": "1580",
      "sensor.grid": "1200",
      "sensor.load": "1450",
    }), testConfig());
    expect(flow).toMatchObject({ battery: "source", grid: "idle", gridAvailability: "unavailable", load: "sink" });
    expect(flow.summary).toBe("battery → home");
  });

  it("uses only the dedicated relay entity for grid availability", () => {
    const unavailable = deriveGridAvailability(hassWith({ "binary_sensor.grid_relay": "off", "sensor.grid_voltage": "242" }), testConfig().entities.energy);
    const unknown = deriveGridAvailability(hassWith({ "binary_sensor.grid_relay": "unavailable", "sensor.grid_voltage": "242" }), testConfig().entities.energy);
    expect(unavailable).toBe("unavailable");
    expect(unknown).toBe("unknown");
  });

  it("accepts the commissioned Modbus relay register's numeric states", () => {
    const connected = deriveGridAvailability(hassWith({ "binary_sensor.grid_relay": "1.0" }), testConfig().entities.energy);
    const disconnected = deriveGridAvailability(hassWith({ "binary_sensor.grid_relay": "0.0" }), testConfig().entities.energy);
    expect(connected).toBe("available");
    expect(disconnected).toBe("unavailable");
  });
});
