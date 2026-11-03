import { describe, expect, it } from "vitest";
import { createDraftConfig, isRecord, isSafeBackgroundUrl, parseConfig } from "../src/config-schema";

/** Returns a complete portable test configuration with fictional entity IDs. */
function validConfig(): Record<string, unknown> {
  return {
    type: "custom:h2dc-dashboard-card",
    view: "home",
    dashboard_path: "/wall",
    entities: {
      alarm: "alarm_control_panel.house",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.living_room_temperature",
      energy: {
        solar: "sensor.solar_power",
        battery_soc: "sensor.battery_soc",
        battery: "sensor.battery_power",
        grid: "sensor.grid_power",
        load: "sensor.home_load",
      },
    },
  };
}

describe("parseConfig", () => {
  it("normalizes the legacy snake_case boundary", () => {
    const result = parseConfig(validConfig());
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.config.dashboardPath).toBe("/wall");
      expect(result.config.entities.energy.batterySoc).toBe("sensor.battery_soc");
    }
  });

  it("rejects a missing required entity map", () => {
    const result = parseConfig({ type: "custom:h2dc-dashboard-card", view: "home" });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.issues).toContain("entities must be an object");
  });

  it("rejects a wrong custom-element type", () => {
    const input = validConfig();
    input.type = "custom:other-card";
    expect(parseConfig(input).status).toBe("invalid");
  });

  it("accepts legacy version one and rejects future versions", () => {
    const legacy = validConfig();
    legacy.config_version = 1;
    expect(parseConfig(legacy).status).toBe("valid");
    legacy.config_version = 999;
    expect(parseConfig(legacy).status).toBe("invalid");
  });

  it("rejects unsafe background schemes", () => {
    expect(isSafeBackgroundUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeBackgroundUrl("/local/h2dc/day.webp")).toBe(true);
    const input = validConfig();
    input.backgrounds = { day: "javascript:alert(1)" };
    expect(parseConfig(input).status).toBe("invalid");
  });

  it("rejects executable, protocol-relative, and control-bearing dashboard paths", () => {
    for (const dashboardPath of ["javascript:alert(1)", "//evil.example", "/wall?next=javascript:alert(1)", "/wall\nother"]) {
      const input = validConfig();
      input.dashboard_path = dashboardPath;
      expect(parseConfig(input).status).toBe("invalid");
    }
  });

  it("rejects an invalid required energy entity", () => {
    const input = validConfig();
    const entities = input.entities;
    if (isRecord(entities) && isRecord(entities.energy)) {
      entities.energy.solar = "switch.not_a_sensor";
    }
    expect(parseConfig(input).status).toBe("invalid");
  });

  it("does not inject commissioned household identifiers", () => {
    const result = parseConfig(validConfig());
    expect(JSON.stringify(result)).not.toContain("thearach");
    expect(JSON.stringify(result)).not.toContain("deye_12_kw");
  });

  it("creates an entity-free visual-editor draft", () => {
    const draft = createDraftConfig({ type: "custom:h2dc-dashboard-card", view: "lights" });
    expect(draft.view).toBe("lights");
    expect(draft.entities.alarm).toBe("");
    expect(draft.entities.energy.solar).toBe("");
    expect(JSON.stringify(draft)).not.toContain("sensor.dashboard");
  });

  it("preserves unrelated recognized fields while repairing an invalid draft", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.alarm = "";
    input.entities.lights = [{ entity: "light.kitchen", room: "Kitchen", icon: "mdi:lightbulb" }];
    input.entities.cameras = [{ entity: "camera.front", label: "Front" }];
    input.entities.media = { primary: "media_player.speakers" };
    input.entities.diagnostics = { tablet_battery: "sensor.tablet_battery" };
    if (!isRecord(input.entities.energy)) throw new Error("fixture energy missing");
    input.entities.energy.battery_voltage = "sensor.battery_voltage";
    input.backgrounds = { per_view: { security: "/local/security.webp" } };
    const draft = createDraftConfig(input);
    expect(draft.entities.lights).toHaveLength(1);
    expect(draft.entities.cameras).toHaveLength(1);
    expect(draft.entities.media.primary).toBe("media_player.speakers");
    expect(draft.entities.diagnostics.tabletBattery).toBe("sensor.tablet_battery");
    expect(draft.entities.energy.batteryVoltage).toBe("sensor.battery_voltage");
    expect(draft.backgrounds.perView.security).toBe("/local/security.webp");
  });
});
