import { describe, expect, it } from "vitest";
import { resolveHomeContext } from "../src/contextual-home";
import type { H2DCConfig } from "../src/domain";
import type { HomeAssistant } from "../src/home-assistant";
import { validConfig } from "./fixtures";

/** Builds the smallest immutable Home Assistant state boundary needed by context tests. */
function hass(states: HomeAssistant["states"]): HomeAssistant {
  return { states, callService: async () => undefined };
}

/** Returns a valid configuration with contextual Home enabled. */
function contextualConfig(): H2DCConfig {
  return { ...validConfig(), presentation: { ...validConfig().presentation, contextualHome: true } };
}

describe("resolveHomeContext", () => {
  it("keeps the stable default when contextual Home is disabled", () => {
    const config = validConfig();
    expect(resolveHomeContext(config, hass({}), new Date("2026-11-04T08:00:00+01:00"))).toEqual({
      kind: "standard",
      eyebrow: "Home overview",
    });
  });

  it("prioritizes an armed or triggered alarm over every ambient context", () => {
    const config = contextualConfig();
    const result = resolveHomeContext(config, hass({
      [config.entities.alarm]: { state: "triggered", attributes: {} },
      "sun.sun": { state: "below_horizon", attributes: {} },
    }), new Date("2026-11-04T23:00:00+01:00"));
    expect(result.kind).toBe("alarm");
    expect(result.eyebrow).toBe("Security attention");
  });

  it("reports an outage only from an explicitly disconnected grid relay", () => {
    const config = contextualConfig();
    const gridConnected = config.entities.energy.gridConnected;
    expect(gridConnected).toBeDefined();
    const result = resolveHomeContext(config, hass({
      [config.entities.alarm]: { state: "disarmed", attributes: {} },
      [gridConnected ?? "binary_sensor.missing"]: { state: "off", attributes: {} },
    }), new Date("2026-11-04T12:00:00+01:00"));
    expect(result.kind).toBe("outage");
    expect(result.eyebrow).toBe("Backup power active");
  });

  it.each(["0", "0.0", "false", "disconnected"])("treats the explicit relay state %s as an outage", (state) => {
    const config = contextualConfig();
    const relay = config.entities.energy.gridConnected ?? "sensor.grid_relay";
    expect(resolveHomeContext(config, hass({
      [config.entities.alarm]: { state: "disarmed", attributes: {} },
      [relay]: { state, attributes: {} },
    }), new Date("2026-11-04T12:00:00+01:00")).kind).toBe("outage");
  });

  it.each(["on", "1", "1.0", "unavailable"])("does not infer an outage from %s", (state) => {
    const config = contextualConfig();
    const relay = config.entities.energy.gridConnected ?? "sensor.grid_relay";
    expect(resolveHomeContext(config, hass({
      [config.entities.alarm]: { state: "disarmed", attributes: {} },
      [relay]: { state, attributes: {} },
    }), new Date("2026-11-04T12:00:00+01:00")).kind).toBe("standard");
  });

  it("selects media, evening, night and morning without moving the Home layout", () => {
    const config = contextualConfig();
    const primary = config.entities.media.primary;
    expect(primary).toBeDefined();
    const base = {
      [config.entities.alarm]: { state: "disarmed", attributes: {} },
      [config.entities.energy.gridConnected ?? "binary_sensor.grid"]: { state: "on", attributes: {} },
    };
    expect(resolveHomeContext(config, hass({ ...base, [primary ?? "media_player.none"]: { state: "playing", attributes: {} } }), new Date("2026-11-04T14:00:00+01:00")).kind).toBe("media-active");
    expect(resolveHomeContext(config, hass(base), new Date("2026-11-04T19:00:00+01:00")).kind).toBe("evening");
    expect(resolveHomeContext(config, hass({ ...base, "sun.sun": { state: "below_horizon", attributes: {} } }), new Date("2026-11-04T23:00:00+01:00")).kind).toBe("night");
    expect(resolveHomeContext(config, hass(base), new Date("2026-11-04T07:00:00+01:00")).kind).toBe("morning");
  });
});
