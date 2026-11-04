import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config-schema";
import type { H2DCConfig } from "../src/domain";
import { dashboardConfigSignature, shouldPreserveSonoraFrame, SONORA_THEME_SETTLE_MS, SONORA_THEME_TIMEOUT_MS, waitForSonoraThemeReady } from "../src/sonora-frame";

/** Builds one normalized Sonora configuration for lifecycle regression coverage. */
function sonoraConfig(url: string): H2DCConfig {
  const result = parseConfig({
    type: "custom:h2dc-dashboard-card",
    view: "sonos",
    dashboard_path: "/h2dc-preview",
    sonora_url: url,
    entities: {
      alarm: "alarm_control_panel.house",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.living_room_temperature",
      energy: {
        freshness: "binary_sensor.inverter_fresh",
        grid_connected: "binary_sensor.grid_connected",
        solar: "sensor.solar_power",
        battery_soc: "sensor.battery_soc",
        battery: "sensor.battery_power",
        grid: "sensor.grid_power",
        load: "sensor.load_power",
      },
    },
  });
  if (result.status === "invalid") throw new Error(result.issues.join("; "));
  return result.config;
}

describe("shouldPreserveSonoraFrame", () => {
  it("uses a bounded catalogue-aware curtain before revealing Sonora", () => {
    expect(SONORA_THEME_SETTLE_MS).toBeGreaterThanOrEqual(250);
    expect(SONORA_THEME_SETTLE_MS).toBeLessThanOrEqual(2500);
    expect(SONORA_THEME_TIMEOUT_MS).toBeGreaterThanOrEqual(3000);
    expect(SONORA_THEME_TIMEOUT_MS).toBeLessThanOrEqual(6000);
  });

  it("waits for the installed-theme catalogue and one settle interval", async () => {
    const calls: number[] = [];
    const fetcher = async (): Promise<Response> => new Response('{"items":[]}');
    const delay = async (milliseconds: number): Promise<void> => { calls.push(milliseconds); };
    await waitForSonoraThemeReady("https://sonos.example.test", fetcher, new AbortController().signal, delay);
    expect(calls).toEqual([SONORA_THEME_TIMEOUT_MS, SONORA_THEME_SETTLE_MS]);
  });

  it.each([
    ["a rejected request", async (): Promise<Response> => Promise.reject(new Error("CORS blocked"))],
    ["a non-success response", async (): Promise<Response> => new Response(null, { status: 503 })],
  ])("holds the curtain until timeout after %s", async (_label, fetcher) => {
    let releaseTimeout: (() => void) | undefined;
    let settled = false;
    const delay = (milliseconds: number): Promise<void> => {
      if (milliseconds === SONORA_THEME_TIMEOUT_MS) {
        return new Promise((resolve) => { releaseTimeout = resolve; });
      }
      return Promise.resolve();
    };
    const readiness = waitForSonoraThemeReady("https://sonos.example.test", fetcher, new AbortController().signal, delay)
      .then(() => { settled = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(releaseTimeout).toBeTypeOf("function");
    releaseTimeout?.();
    await readiness;
    expect(settled).toBe(true);
  });
  it("preserves the connected iframe during routine Sonos state updates", () => {
    expect(shouldPreserveSonoraFrame("sonos", false, true)).toBe(true);
  });

  it("replaces the iframe when configuration or navigation requires a fresh render", () => {
    expect(shouldPreserveSonoraFrame("sonos", true, true)).toBe(false);
    expect(shouldPreserveSonoraFrame("sonos", false, false)).toBe(false);
    expect(shouldPreserveSonoraFrame("home", false, true)).toBe(false);
  });

  it("distinguishes unchanged Lovelace configuration from a real Sonora URL change", () => {
    const first = sonoraConfig("https://sonos.example.test");
    const replayed = sonoraConfig("https://sonos.example.test");
    const changed = sonoraConfig("https://sonos-alt.example.test");

    expect(dashboardConfigSignature(replayed)).toBe(dashboardConfigSignature(first));
    expect(dashboardConfigSignature(changed)).not.toBe(dashboardConfigSignature(first));
  });
});
