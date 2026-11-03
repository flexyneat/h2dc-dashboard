import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config-schema";
import { H2DC_VIEWS, type H2DCConfig, type H2DCView } from "../src/domain";
import type { HassEntity, HomeAssistant } from "../src/home-assistant";
import { renderView } from "../src/view-renderers";

/** Builds a complete portable configuration for pure renderer tests. */
function configFor(view: H2DCView): H2DCConfig {
  const result = parseConfig({
    type: "custom:h2dc-dashboard-card",
    view,
    dashboard_path: "/h2dc",
    sonora_url: "https://sonos.example.test",
    entities: {
      alarm: "alarm_control_panel.house",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.room_temperature",
      nearby: [{ entity: "light.recessed", label: "Recessed lights", icon: "mdi:light-recessed" }],
      lights: [{ entity: "light.recessed", room: "Living room", icon: "mdi:light-recessed" }],
      cameras: [{ entity: "camera.ante_room", label: "Ante-room" }],
      room_temperatures: [{ entity: "sensor.room_temperature", room: "Living room", icon: "mdi:sofa" }],
      energy: { freshness: "binary_sensor.inverter_fresh", solar: "sensor.solar", battery_soc: "sensor.battery_soc", battery: "sensor.battery", grid: "sensor.grid", load: "sensor.load" },
      media: { primary: "media_player.surround" },
      diagnostics: { tablet_battery: "sensor.tablet_battery" },
    },
  });
  if (result.status === "invalid") throw new Error(result.issues.join("; "));
  return result.config;
}

/** Creates a side-effect spy and representative Home Assistant state. */
function hassFixture(): { readonly hass: HomeAssistant; readonly callService: ReturnType<typeof vi.fn> } {
  const entity = (state: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({ state, attributes });
  const callService = vi.fn(async () => undefined);
  return { hass: { states: {
    "alarm_control_panel.house": entity("disarmed"),
    "climate.living_room": entity("cool", { temperature: 24, min_temp: 16, max_temp: 30 }),
    "weather.home": entity("partlycloudy", { temperature: 28.4, humidity: 79 }),
    "sensor.room_temperature": entity("28.4"),
    "light.recessed": entity("on", { friendly_name: "Recessed <lights>", brightness: 128, supported_color_modes: ["brightness"] }),
    "binary_sensor.inverter_fresh": entity("on"),
    "sensor.solar": entity("2221"), "sensor.battery_soc": entity("45"), "sensor.battery": entity("-61"), "sensor.grid": entity("1210"), "sensor.load": entity("1140"),
    "media_player.surround": entity("playing", { media_title: "This Too Shall Pass" }),
    "sensor.tablet_battery": entity("90"), "sun.sun": entity("above_horizon"),
  }, callService }, callService };
}

describe("renderView", () => {
  it("renders every stable route without crossing the service boundary", () => {
    const fixture = hassFixture();
    for (const view of H2DC_VIEWS) {
      // Construct wall-clock time in the runner's local zone so rendered UI remains deterministic across CI time zones.
      const output = renderView({ config: configFor(view), hass: fixture.hass, now: new Date(2026, 10, 2, 10, 4), reducedMotion: false });
      expect(output).toContain("<main");
    }
    expect(fixture.callService).not.toHaveBeenCalled();
  });

  it("keeps four Home summary cards and the compact climate controls", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("home"), hass: fixture.hass, now: new Date(2026, 10, 2, 10, 4), reducedMotion: false });
    expect(output.match(/class="glass summary"/gu)).toHaveLength(4);
    expect(output).toContain("10:04 AM");
    expect(output).toContain('data-action="climate-mode"');
    expect(output).toContain("weather-partlycloudy");
  });

  it("stops topology motion for reduced-motion users", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("energy"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).not.toContain("<animateMotion");
  });

  it("escapes entity-provided labels before HTML insertion", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("lights"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Recessed &lt;lights&gt;");
    expect(output).not.toContain("Recessed <lights>");
  });

  it("renders an unavailable camera state without inventing a feed", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("security"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Camera unavailable");
  });
});
