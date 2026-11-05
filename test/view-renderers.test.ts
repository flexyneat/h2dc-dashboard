import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config-schema";
import { H2DC_VIEWS, type H2DCConfig, type H2DCView } from "../src/domain";
import type { HassEntity, HomeAssistant } from "../src/home-assistant";
import type { MediaArtwork } from "../src/media-artwork";
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
      switches: [{ entity: "switch.outside", room: "Exterior", icon: "mdi:string-lights" }],
      cameras: [{ entity: "camera.ante_room", label: "Ante-room" }],
      room_temperatures: [{ entity: "sensor.room_temperature", room: "Living room", icon: "mdi:sofa" }],
      energy: { freshness: "binary_sensor.inverter_fresh", grid_connected: "sensor.grid_relay", solar: "sensor.solar", battery_soc: "sensor.battery_soc", battery: "sensor.battery", grid: "sensor.grid", load: "sensor.load" },
      media: { primary: "media_player.surround", roam: "media_player.roam" },
      diagnostics: { tablet_battery: "sensor.tablet_battery", poe: "switch.tablet_poe" },
      house_pulse: {
        access: [{ entity: "binary_sensor.front_door", label: "Front door", icon: "mdi:door" }],
        presence: [{ entity: "binary_sensor.living_presence", label: "Living room", icon: "mdi:motion-sensor" }],
        comfort: [{ entity: "sensor.room_humidity", label: "Humidity", icon: "mdi:water-percent" }],
        attention: [{ entity: "sensor.low_battery_count", label: "Low batteries", icon: "mdi:battery-alert" }],
      },
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
    "sensor.grid_relay": entity("1.0"),
    "sensor.solar": entity("2221"), "sensor.battery_soc": entity("45"), "sensor.battery": entity("-61"), "sensor.grid": entity("1210"), "sensor.load": entity("1140"),
    "media_player.surround": entity("playing", { media_title: "This Too Shall Pass" }),
    "media_player.roam": entity("idle", { friendly_name: "Mobile" }),
    "sensor.tablet_battery": entity("90"), "switch.tablet_poe": entity("on"), "sun.sun": entity("above_horizon"),
    "binary_sensor.front_door": entity("off"), "binary_sensor.living_presence": entity("on"),
    "sensor.room_humidity": entity("58.4", { unit_of_measurement: "%" }), "sensor.low_battery_count": entity("0"),
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

  it("renders each non-Home page label as its semantic h1 at the compact subheading scale", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("energy"), hass: fixture.hass, now: new Date(), reducedMotion: true });

    expect(output).toContain('<h1 class="page-subheading">Energy overview</h1>');
    expect(output).not.toContain('<span>Energy overview</span>');
  });

  it("omits the generic Home overview eyebrow while preserving the Home summary", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("home"), hass: fixture.hass, now: new Date(2026, 10, 2, 12, 0), reducedMotion: false });

    expect(output).not.toContain("Home overview");
    expect(output).toContain("selected lights on");
  });

  it("keeps four Home summary cards and the compact climate controls", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("home"), hass: fixture.hass, now: new Date(2026, 10, 2, 10, 4), reducedMotion: false });
    expect(output.match(/class="glass summary"/gu)).toHaveLength(4);
    expect(output.match(/class="glass pulse-card"/gu)).toHaveLength(4);
    expect(output).toContain("All secure");
    expect(output).toContain("Living room occupied");
    expect(output).toContain("Humidity 58.40%");
    expect(output).toContain("No issues");
    expect(output).toContain("10:04 AM");
    expect(output.match(/Monday, November 2/gu)).toHaveLength(1);
    expect(output).not.toMatch(/class="glass clock"[^<]*<strong>[^<]*<\/strong><span>/u);
    expect(output).toContain('data-action="climate-mode"');
    expect(output).toContain("weather-partlycloudy");
    expect(output).toContain('28.40 <span class="temperature-unit" aria-hidden="true">&deg;C</span>');
    expect(output).toContain("Humidity 79%");
    expect(output).toContain('Set to 24 <span class="temperature-unit" aria-hidden="true">&deg;C</span>');
    expect(output).toContain("45%");
    expect(output).toContain('class="battery-flow-status charging"');
    expect(output).toContain('class="charging-bolt"');
    expect(output).toContain("Charging");
    expect(output).toContain("61 W");
  });

  it("keeps Climate outside conditions and its image treatment on the same live weather state", () => {
    const fixture = hassFixture();
    const rainyHass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "weather.home": { state: "rainy", attributes: { temperature: 26.25, humidity: 88 } } satisfies HassEntity,
      },
    };
    const output = renderView({ config: configFor("climate"), hass: rainyHass, now: new Date(), reducedMotion: true });

    expect(output).toContain('class="glass outside weather-surface weather-rainy"');
    expect(output).toContain('data-weather-condition="rainy"');
    expect(output).toContain('26.25 <span class="temperature-unit" aria-hidden="true">&deg;C</span>');
    expect(output).toContain("mdi:weather-rainy");
  });

  it("renders an explicit neutral Climate weather state instead of inventing unavailable telemetry", () => {
    const fixture = hassFixture();
    const unavailableHass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "weather.home": { state: "unavailable", attributes: {} } satisfies HassEntity,
      },
    };
    const output = renderView({ config: configFor("climate"), hass: unavailableHass, now: new Date(), reducedMotion: true });

    expect(output).toContain("weather-unavailable");
    expect(output).toContain('data-weather-condition="unavailable"');
    expect(output).toContain('— <span class="temperature-unit" aria-hidden="true">&deg;C</span>');
  });

  it("never reports a false-safe House Pulse state when configured coverage is degraded", () => {
    const fixture = hassFixture();
    const configured = configFor("home");
    const config: H2DCConfig = {
      ...configured,
      entities: {
        ...configured.entities,
        housePulse: {
          ...configured.entities.housePulse,
          access: [...configured.entities.housePulse.access, { entity: "binary_sensor.side_door", label: "Side door", icon: "mdi:door" }],
          attention: [...configured.entities.housePulse.attention, { entity: "sensor.unavailable_count", label: "Unavailable devices", icon: "mdi:alert" }],
        },
      },
    };
    const output = renderView({ config, hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("1 source unavailable");
    expect(output).not.toContain("All secure");
    expect(output).not.toContain("No issues");
  });

  it("renders a safe Comfort fallback for nonnumeric telemetry", () => {
    const fixture = hassFixture();
    const hass: HomeAssistant = { ...fixture.hass, states: { ...fixture.hass.states, "sensor.room_humidity": { state: "unknown", attributes: { unit_of_measurement: "%" } } satisfies HassEntity } };
    const output = renderView({ config: configFor("home"), hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Comfort telemetry unavailable");
    expect(output).not.toContain("NaN");
  });

  it("keeps the bold date on Home only and makes the light surface the toggle target", () => {
    const fixture = hassFixture();
    const home = renderView({ config: configFor("home"), hass: fixture.hass, now: new Date(2026, 10, 2, 10, 4), reducedMotion: false });
    const lights = renderView({ config: configFor("lights"), hass: fixture.hass, now: new Date(2026, 10, 2, 10, 4), reducedMotion: false });
    expect(home).toContain("<h1>Monday, November 2</h1>");
    expect(lights).not.toContain("<h1>Monday, November 2</h1>");
    expect(lights).toContain('class="light-card-surface" data-action="toggle"');
    expect(lights).toContain('class="switch-card-surface" data-action="toggle"');
    expect(lights).toContain("50%");
    expect(lights).not.toContain("50.00%");
  });

  it("renders album artwork in the compact Home card without changing its control target", () => {
    const fixture = hassFixture();
    const mediaArtwork: MediaArtwork = { status: "available", source: "home-assistant", url: "/api/media_player_proxy/media_player.surround?token=safe", alt: "This Too Shall Pass album artwork" };
    const output = renderView({ config: configFor("home"), hass: fixture.hass, now: new Date(), reducedMotion: false, mediaArtwork });
    expect(output).toContain('class="media-artwork compact-artwork"');
    expect(output).toContain('src="/api/media_player_proxy/media_player.surround?token=safe"');
    expect(output).toContain('data-entity="media_player.surround"');
  });

  it("centres the artwork-backed Now Playing card across both Media rows", () => {
    const fixture = hassFixture();
    const mediaArtwork: MediaArtwork = { status: "available", source: "home-assistant", url: "/api/media_player_proxy/media_player.surround?token=safe", alt: "This Too Shall Pass album artwork" };
    const output = renderView({ config: configFor("media"), hass: fixture.hass, now: new Date(), reducedMotion: false, mediaArtwork });
    expect(output).toContain('class="glass now media-now"');
    expect(output).toContain('class="now-artwork-backdrop"');
    expect(output.indexOf("media-living")).toBeLessThan(output.indexOf("media-now"));
    expect(output.indexOf("media-now")).toBeLessThan(output.indexOf("media-private"));
    expect(output).toContain('<div class="card-title">Common areas</div>');
    expect(output).toContain("Sonos Roam");
    expect(output).toContain('data-entity="media_player.roam"');
    expect(output).not.toContain('<div class="card-title">Whole home</div>');
  });

  it("keeps Sonora inside the persistent H2DC navigation shell", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("sonos"), hass: fixture.hass, now: new Date(), reducedMotion: false });
    expect(output).toContain('class="sonos-frame"');
    expect(output).toContain('title="Sonos whole-house controller"');
    expect(output).not.toContain("sandbox=");
    expect(output).toContain('href="/h2dc/home"');
    expect(output).not.toContain("Open Sonos controller</a>");
  });

  it("splits alarm status from a masked operational keypad", () => {
    const output = renderView({ config: configFor("security"), hass: hassFixture().hass, now: new Date(), reducedMotion: false });
    expect(output).toContain('class="alarm-stack"');
    expect(output).toContain('data-action="alarm-code-digit"');
    expect(output).toContain('data-action="alarm-code-submit"');
  });

  it("exposes a confirmed PoE control without rendering entity identifiers", () => {
    const output = renderView({ config: configFor("diagnostics"), hass: hassFixture().hass, now: new Date(), reducedMotion: false });
    expect(output).toContain('data-action="poe-toggle"');
    expect(output).toContain("Tap to turn off");
    expect(output).not.toContain("<code>switch.tablet_poe</code>");
  });

  it("stops topology motion for reduced-motion users", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("energy"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).not.toContain("<animateMotion");
  });

  it("moves battery discharge upward from battery to inverter and home", () => {
    const fixture = hassFixture();
    const hass: HomeAssistant = { ...fixture.hass, states: {
      ...fixture.hass.states,
      "sensor.battery": { state: "1580", attributes: {} } satisfies HassEntity,
      "sensor.grid": { state: "0", attributes: {} } satisfies HassEntity,
    } };
    const output = renderView({ config: configFor("home"), hass, now: new Date(), reducedMotion: false });
    expect(output).toContain('path="M300 256 L300 196"');
    expect(output).toContain('path="M300 196 L300 142"');
  });

  it("renders the approved no-scroll Energy hierarchy with complete analysis access", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("energy"), hass: fixture.hass, now: new Date(), reducedMotion: false });
    expect(output).toContain('class="energy-workspace"');
    expect(output).toContain("Today");
    expect(output).toContain("System health");
    expect(output).toContain("Battery outlook");
    expect(output).toContain("Outage readiness");
    expect(output).toContain("Two independent estimates");
    expect(output).toContain('data-detail="grid"');
    expect(output).toContain('data-detail="battery"');
    expect(output).toContain("Complete PowerFlo analysis");
    expect(output).toContain("Grid relay Connected");
  });

  it("escapes entity-provided labels before HTML insertion", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("lights"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Recessed &lt;lights&gt;");
    expect(output).not.toContain("Recessed <lights>");
  });

  it("uses concise configured labels instead of device-prefixed friendly names", () => {
    const fixture = hassFixture();
    const parsed = parseConfig({
      ...configFor("lights"),
      entities: {
        ...configFor("lights").entities,
        lights: [{ entity: "light.recessed", room: "Living Room Lights", icon: "mdi:light-recessed", label: "Recessed Lights" }],
        switches: [{ entity: "switch.outside", room: "Kitchen Accent Lights", icon: "mdi:string-lights", label: "Accent Lights" }],
      },
    });
    if (parsed.status === "invalid") throw new Error(parsed.issues.join("; "));

    const output = renderView({ config: parsed.config, hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("<strong>Recessed Lights</strong>");
    expect(output).toContain("<strong>Accent Lights</strong>");
    expect(output).toContain("<small>Living Room</small>");
    expect(output).toContain("<small>Kitchen</small>");
    expect(output).not.toContain("<small>Living Room Lights</small>");
    expect(output).not.toContain("<small>Kitchen Accent Lights</small>");
    expect(output).not.toContain("Recessed &lt;lights&gt;");
  });

  it("removes a repeated room prefix from registry-provided light names", () => {
    const fixture = hassFixture();
    const hass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "light.recessed": { state: "on", attributes: { friendly_name: "Living room Recessed Lights" } } satisfies HassEntity,
      },
    };
    const output = renderView({ config: configFor("lights"), hass, now: new Date(), reducedMotion: true });

    expect(output).toContain("<small>Living room</small>");
    expect(output).toContain("<strong>Recessed Lights</strong>");
    expect(output).not.toContain("<strong>Living room Recessed Lights</strong>");
  });

  it("preserves a meaningful generic friendly name and never exposes an entity ID fallback", () => {
    const fixture = hassFixture();
    const configured = configFor("lights");
    const config: H2DCConfig = {
      ...configured,
      entities: {
        ...configured.entities,
        lights: [
          { entity: "light.stairwell", room: "Stairwell", icon: "mdi:stairs" },
          { entity: "light.missing", room: "Utility", icon: "mdi:lightbulb-outline" },
        ],
      },
    };
    const hass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "light.stairwell": { state: "off", attributes: { friendly_name: "Stairwell Lights" } } satisfies HassEntity,
      },
    };
    const output = renderView({ config, hass, now: new Date(), reducedMotion: true });

    expect(output).toContain("<strong>Stairwell Lights</strong>");
    expect(output).toContain("<strong>Light</strong>");
    expect(output).not.toContain(">light.missing<");
  });

  it("keeps the grouped lounge lights and standalone lounge switch as separate cards", () => {
    const fixture = hassFixture();
    const configured = configFor("lights");
    const config: H2DCConfig = {
      ...configured,
      entities: {
        ...configured.entities,
        lights: [{ entity: "light.lounge_lighting", room: "Family lounge", icon: "mdi:lightbulb-group", label: "Lounge Lights" }],
        switches: [
          { entity: "switch.light_one", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_two", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_three", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_four", room: "Exterior", icon: "mdi:string-lights" },
          { entity: "switch.plug_2", room: "Family lounge", icon: "mdi:power-socket-uk", label: "Lounge Switch" },
        ],
      },
    };
    const hass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "light.lounge_lighting": { state: "off", attributes: { friendly_name: "Lounge Lights" } } satisfies HassEntity,
        "switch.plug_2": { state: "off", attributes: { friendly_name: "Lounge Switch" } } satisfies HassEntity,
      },
    };
    const output = renderView({ config, hass, now: new Date(), reducedMotion: true });
    const switchesStart = output.indexOf('id="switches-heading"');

    expect(output.indexOf('data-entity="light.lounge_lighting"')).toBeLessThan(switchesStart);
    expect(output.indexOf('data-entity="switch.plug_2"')).toBeGreaterThan(switchesStart);
    expect(output).toContain("<strong>Lounge Lights</strong>");
    expect(output).toContain("<strong>Lounge Switch</strong>");
  });

  it("renders household lights above household switches with independent state summaries", () => {
    const fixture = hassFixture();
    const hass: HomeAssistant = {
      ...fixture.hass,
      states: {
        ...fixture.hass.states,
        "switch.outside": { state: "on", attributes: { friendly_name: "Outside lights" } } satisfies HassEntity,
      },
    };
    const output = renderView({ config: configFor("lights"), hass, now: new Date(), reducedMotion: true });
    expect(output).toContain('id="lights-heading"');
    expect(output).toContain('id="switches-heading"');
    expect(output.indexOf('id="lights-heading"')).toBeLessThan(output.indexOf('id="switches-heading"'));
    expect(output).toContain('class="glass switch-card on"');
    expect(output).toContain('aria-pressed="true"');
    expect(output).toContain("50%");
  });

  it("promotes the first configured switch row into the Lights section without changing toggle semantics", () => {
    const fixture = hassFixture();
    const configured = configFor("lights");
    const config = {
      ...configured,
      entities: {
        ...configured.entities,
        switches: [
          { entity: "switch.light_one", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_two", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_three", room: "Ante-room", icon: "mdi:ceiling-light" },
          { entity: "switch.light_four", room: "Exterior", icon: "mdi:string-lights" },
          { entity: "switch.utility", room: "Living room", icon: "mdi:power-socket-uk" },
        ],
      },
    };
    const output = renderView({ config, hass: fixture.hass, now: new Date(), reducedMotion: true });
    const lightsStart = output.indexOf('id="lights-heading"');
    const switchesStart = output.indexOf('id="switches-heading"');

    expect(output.indexOf('data-entity="switch.light_one"', lightsStart)).toBeLessThan(switchesStart);
    expect(output.indexOf('data-entity="switch.utility"', switchesStart)).toBeGreaterThan(switchesStart);
    expect(output).toContain('class="switch-card-surface" data-action="toggle" data-entity="switch.light_one"');
  });

  it("renders an unavailable camera state without inventing a feed", () => {
    const fixture = hassFixture();
    const output = renderView({ config: configFor("security"), hass: fixture.hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Camera unavailable");
  });

  it("uses only the explicit medium camera mapping for modal playback", () => {
    const fixture = hassFixture();
    const configured = configFor("security");
    const config = {
      ...configured,
      entities: {
        ...configured.entities,
        cameras: [{ entity: "camera.ante_room", mediumStreamEntity: "camera.ante_room_medium", label: "Ante-room" }],
      },
    };
    const hass = { ...fixture.hass, states: {
      ...fixture.hass.states,
      "camera.ante_room": { entity_id: "camera.ante_room", state: "idle", attributes: { entity_picture: "/api/camera_proxy/camera.ante_room" } },
      "camera.ante_room_medium": { entity_id: "camera.ante_room_medium", state: "idle", attributes: {} },
    } };
    const output = renderView({ config, hass, now: new Date(), reducedMotion: true });
    expect(output).toContain('data-action="camera-detail"');
    expect(output).toContain('data-entity="camera.ante_room_medium"');
    expect(output).not.toContain('data-entity="camera.ante_room"');
  });

  it("does not fall back to the high camera when no medium stream is configured", () => {
    const fixture = hassFixture();
    const hass = { ...fixture.hass, states: {
      ...fixture.hass.states,
      "camera.ante_room": { entity_id: "camera.ante_room", state: "idle", attributes: {} },
    } };
    const output = renderView({ config: configFor("security"), hass, now: new Date(), reducedMotion: true });
    expect(output).toContain("Medium stream not configured");
    expect(output).not.toContain('data-action="camera-detail"');
  });
});
