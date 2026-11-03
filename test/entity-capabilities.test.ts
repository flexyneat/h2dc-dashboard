import { describe, expect, it } from "vitest";
import { lightCapabilities } from "../src/entity-capabilities";

describe("lightCapabilities", () => {
  it("exposes brightness only for capable lights", () => {
    expect(lightCapabilities({ state: "on", attributes: { supported_color_modes: ["brightness"] } })).toEqual({
      available: true,
      dimmable: true,
      colorTemperature: false,
    });
  });

  it("keeps on-off lights slider-free", () => {
    expect(lightCapabilities({ state: "off", attributes: { supported_color_modes: ["onoff"] } }).dimmable).toBe(false);
  });

  it("designs unavailable state instead of inventing controls", () => {
    expect(lightCapabilities({ state: "unavailable", attributes: {} })).toEqual({
      available: false,
      dimmable: false,
      colorTemperature: false,
    });
  });

  it("treats an unknown state as unavailable", () => {
    expect(lightCapabilities({ state: "unknown", attributes: { supported_color_modes: ["brightness"] } })).toEqual({
      available: false,
      dimmable: false,
      colorTemperature: false,
    });
  });
});
