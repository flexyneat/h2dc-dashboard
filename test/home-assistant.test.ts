import { describe, expect, it } from "vitest";
import { escapeHtml, readEntity, readNumericState, type HomeAssistant } from "../src/home-assistant";

const hass: HomeAssistant = {
  states: {
    "sensor.valid": { state: "12.5", attributes: {} },
    "sensor.unknown": { state: "unknown", attributes: {} },
    "sensor.text": { state: "active", attributes: {} },
    "sensor.blank": { state: "  ", attributes: {} },
  },
  callService: async () => undefined,
};

describe("Home Assistant boundary helpers", () => {
  it("distinguishes missing and unknown entities", () => {
    expect(readEntity(hass, "sensor.missing")).toEqual({ status: "unavailable", reason: "missing" });
    expect(readEntity(hass, "sensor.unknown")).toEqual({ status: "unavailable", reason: "unknown" });
  });

  it("accepts only finite numeric states", () => {
    expect(readNumericState(hass, "sensor.valid")).toEqual({ status: "available", value: 12.5 });
    expect(readNumericState(hass, "sensor.text")).toEqual({ status: "unavailable", reason: "not_numeric" });
    expect(readNumericState(hass, "sensor.blank")).toEqual({ status: "unavailable", reason: "not_numeric" });
  });

  it("escapes renderer-bound text", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
