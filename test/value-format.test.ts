import { describe, expect, it } from "vitest";

import type { HomeAssistant } from "../src/home-assistant";
import { formatDecimal, formatNumericAttribute, formatNumericEntity, formatNumericState } from "../src/value-format";

/** Builds a minimal state boundary for adaptive-precision formatter tests. */
function hass(): HomeAssistant {
  return {
    states: {
      "sensor.integer": { state: "45", attributes: { unit_of_measurement: "%" } },
      "sensor.decimal": { state: "28.456", attributes: { unit_of_measurement: "°C" } },
      "sensor.unknown": { state: "unknown", attributes: {} },
    },
    callService: async () => undefined,
  };
}

describe("adaptive-precision telemetry formatting", () => {
  it("keeps integers whole and rounds fractional values to two places", () => {
    expect(formatDecimal(45)).toBe("45");
    expect(formatDecimal(28.456)).toBe("28.46");
    expect(formatDecimal(-0)).toBe("0");
  });

  it("preserves units and explicit unavailable states", () => {
    expect(formatNumericState(hass(), "sensor.integer")).toBe("45");
    expect(formatNumericEntity(hass(), "sensor.decimal")).toBe("28.46 °C");
    expect(formatNumericEntity(hass(), "sensor.unknown")).toBe("Unavailable");
  });

  it("applies the same precision to numeric attributes", () => {
    expect(formatNumericAttribute({ state: "on", attributes: { temperature: 24 } }, "temperature")).toBe("24");
  });
});
