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
        freshness: "binary_sensor.telemetry_fresh",
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

  it("accepts a dedicated Sonos Roam mapping", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.media = { roam: "media_player.roam_2" };
    const result = parseConfig(input);
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.config.entities.media.roam).toBe("media_player.roam_2");
  });

  it("parses a portable House Pulse mapping without household defaults", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.house_pulse = {
      access: [{ entity: "binary_sensor.front_door", label: "Front door", icon: "mdi:door" }],
      presence: [{ entity: "binary_sensor.living_room_presence", label: "Living room", icon: "mdi:motion-sensor" }],
      comfort: [{ entity: "sensor.living_room_humidity", label: "Humidity", icon: "mdi:water-percent" }],
      attention: [{ entity: "sensor.low_battery_count", label: "Low batteries", icon: "mdi:battery-alert" }],
    };
    const result = parseConfig(input);
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.config.entities.housePulse.access[0]?.entity).toBe("binary_sensor.front_door");
      expect(result.config.entities.housePulse.attention[0]?.label).toBe("Low batteries");
    }
  });

  it("rejects malformed House Pulse mappings", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.house_pulse = { access: [{ entity: "not-an-entity", label: "Door", icon: "mdi:door" }] };
    const result = parseConfig(input);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.issues).toContain("entities.house_pulse.access[0] must contain entity, label, and icon");
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
    const parsedLegacy = parseConfig(legacy);
    expect(parsedLegacy.status).toBe("valid");
    if (parsedLegacy.status === "valid") expect(parsedLegacy.config.configVersion).toBe(2);
    const current = validConfig();
    current.config_version = 2;
    expect(parseConfig(current).status).toBe("valid");
    legacy.config_version = 999;
    expect(parseConfig(legacy).status).toBe("invalid");
  });

  it("parses reusable rooms, kiosk profiles, and theme controls without private defaults", () => {
    const input = validConfig();
    input.rooms = [{
      id: "living-room",
      name: "Living room",
      temperature: "sensor.living_room_temperature",
      occupancy: ["binary_sensor.living_room_presence"],
      lights: ["light.living_room"],
      media: ["media_player.living_room"],
      climate: "climate.living_room",
      camera: "camera.living_room",
    }];
    input.presentation = {
      kiosk_profile: "wall_16_10",
      density: "comfortable",
      accent: "oklch(0.78 0.16 78)",
      font_family: "Aeonik Pro",
      overlay_strength: 0.42,
      contextual_home: true,
    };
    const result = parseConfig(input);
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.config.rooms[0]?.id).toBe("living-room");
      expect(result.config.presentation.kioskProfile).toBe("wall_16_10");
      expect(result.config.presentation.contextualHome).toBe(true);
      expect(result.config.configVersion).toBe(2);
    }
  });

  it("rejects unsafe room identifiers and unrecognized presentation values", () => {
    const input = validConfig();
    input.rooms = [{ id: "../living", name: "Living", occupancy: ["binary_sensor.living"] }];
    input.presentation = { kiosk_profile: "television", accent: "red", overlay_strength: 4 };
    const result = parseConfig(input);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues).toContain("rooms[0].id must use lowercase letters, numbers, and hyphens");
      expect(result.issues).toContain("presentation.kiosk_profile is unsupported");
      expect(result.issues).toContain("presentation.accent must be an OKLCH color");
      expect(result.issues).toContain("presentation.overlay_strength must be between 0 and 1");
    }
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

  it("requires a binary telemetry freshness signal", () => {
    const input = validConfig();
    if (!isRecord(input.entities) || !isRecord(input.entities.energy)) throw new Error("fixture energy missing");
    delete input.entities.energy.freshness;
    const missing = parseConfig(input);
    expect(missing.status).toBe("invalid");
    input.entities.energy.freshness = "sensor.not_a_binary_signal";
    const wrongDomain = parseConfig(input);
    expect(wrongDomain.status).toBe("invalid");
  });

  it("rejects active or remote inverter image sources", () => {
    const input = validConfig();
    input.powerflo = { inverter_image: "https://example.invalid/inverter.svg" };
    expect(parseConfig(input).status).toBe("invalid");
  });

  it("rejects a flow release threshold above activation", () => {
    const input = validConfig();
    input.flow_threshold_w = 40;
    input.powerflo = { flow_release_w: 80 };
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
    input.entities.switches = [{ entity: "switch.outside", room: "Exterior", icon: "mdi:string-lights" }];
    input.entities.cameras = [{ entity: "camera.front", medium_stream_entity: "camera.front_medium", label: "Front" }];
    input.entities.media = { primary: "media_player.speakers" };
    input.entities.diagnostics = { tablet_battery: "sensor.tablet_battery" };
    if (!isRecord(input.entities.energy)) throw new Error("fixture energy missing");
    input.entities.energy.battery_voltage = "sensor.battery_voltage";
    input.backgrounds = { per_view: { security: "/local/security.webp" } };
    const draft = createDraftConfig(input);
    expect(draft.entities.lights).toHaveLength(1);
    expect(draft.entities.switches).toHaveLength(1);
    expect(draft.entities.cameras).toHaveLength(1);
    expect(draft.entities.cameras[0]?.mediumStreamEntity).toBe("camera.front_medium");
    expect(draft.entities.media.primary).toBe("media_player.speakers");
    expect(draft.entities.diagnostics.tabletBattery).toBe("sensor.tablet_battery");
    expect(draft.entities.energy.batteryVoltage).toBe("sensor.battery_voltage");
    expect(draft.backgrounds.perView.security).toBe("/local/security.webp");
  });

  it("rejects a non-camera medium stream mapping", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.cameras = [{ entity: "camera.front", medium_stream_entity: "sensor.front", label: "Front" }];
    const result = parseConfig(input);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.issues).toContain("entities.cameras[0].medium_stream_entity must be a camera entity");
  });

  it("rejects device lists that cannot fit the no-scroll Lights workspace", () => {
    const input = validConfig();
    if (!isRecord(input.entities)) throw new Error("fixture entities missing");
    input.entities.lights = Array.from({ length: 9 }, (_, index) => ({ entity: `light.fixture_${index}`, room: `Light ${index}`, icon: "mdi:lightbulb" }));
    input.entities.switches = Array.from({ length: 9 }, (_, index) => ({ entity: `switch.fixture_${index}`, room: `Switch ${index}`, icon: "mdi:toggle-switch" }));
    const result = parseConfig(input);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues).toContain("entities.lights supports at most 8 entries in the no-scroll layout");
      expect(result.issues).toContain("entities.switches supports at most 8 entries in the no-scroll layout");
    }
    const recoveredDraft = createDraftConfig(input);
    expect(recoveredDraft.entities.lights).toHaveLength(9);
    expect(recoveredDraft.entities.switches).toHaveLength(9);
  });
});
