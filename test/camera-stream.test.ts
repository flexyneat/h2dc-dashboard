import { describe, expect, it } from "vitest";
import { buildMediumStreamUrl } from "../src/camera-stream";

describe("buildMediumStreamUrl", () => {
  it("converts only a signed same-origin picture path for the selected entity", () => {
    expect(buildMediumStreamUrl(
      "camera.front_medium",
      "/api/camera_proxy/camera.front_medium?token=signed",
      "https://home.example",
    )).toBe("/api/camera_proxy_stream/camera.front_medium?token=signed");
  });

  it("rejects unsigned, mismatched, malformed, and cross-origin sources", () => {
    const origin = "https://home.example";
    expect(buildMediumStreamUrl("camera.front_medium", "/api/camera_proxy/camera.front_medium", origin)).toBeUndefined();
    expect(buildMediumStreamUrl("camera.front_medium", "/api/camera_proxy/camera.front_high?token=signed", origin)).toBeUndefined();
    expect(buildMediumStreamUrl("camera.front_medium", "https://attacker.example/api/camera_proxy/camera.front_medium?token=stolen", origin)).toBeUndefined();
    expect(buildMediumStreamUrl("camera.front_medium", undefined, origin)).toBeUndefined();
  });
});
