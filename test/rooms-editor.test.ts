import { describe, expect, it } from "vitest";
import { parseRoomsEditorDraft } from "../src/editor/rooms-editor";
import { validConfig } from "./fixtures";

describe("parseRoomsEditorDraft", () => {
  it("preserves invalid JSON as a validation result instead of mutating configuration", () => {
    expect(parseRoomsEditorDraft(validConfig(), "[{")).toEqual({
      status: "invalid",
      message: "Rooms must be valid JSON.",
    });
  });

  it("rejects schema-invalid room definitions", () => {
    const result = parseRoomsEditorDraft(validConfig(), JSON.stringify([{ id: "living-room", name: "Living room", occupancy: "binary_sensor.motion" }]));
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.message).toContain("rooms[0].occupancy must be an array");
  });

  it("returns a validated configuration for a valid room model", () => {
    const rooms = [{ id: "living-room", name: "Living room", occupancy: ["binary_sensor.motion"], lights: [], switches: [], media: [] }];
    const result = parseRoomsEditorDraft(validConfig(), JSON.stringify(rooms));
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.config.rooms).toEqual(rooms);
  });
});
