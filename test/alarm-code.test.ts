import { describe, expect, it } from "vitest";
import { transitionAlarmCode } from "../src/alarm-code";

describe("transitionAlarmCode", () => {
  it("retains a partial code only across Security rerenders", () => {
    expect(transitionAlarmCode("1234", { reason: "render", view: "security" })).toBe("1234");
    expect(transitionAlarmCode("1234", { reason: "render", view: "home" })).toBe("");
  });

  it("clears a partial code on configuration replacement and disconnect", () => {
    expect(transitionAlarmCode("1234", { reason: "config-change" })).toBe("");
    expect(transitionAlarmCode("1234", { reason: "disconnect" })).toBe("");
  });
});
