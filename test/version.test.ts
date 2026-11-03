import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { H2DC_PACKAGE_VERSION } from "../src/version";

/** Prevents release metadata and the runtime custom-card version from drifting apart. */
describe("H2DC_PACKAGE_VERSION", () => {
  it("matches package.json", () => {
    const packageText = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const packageVersion = /"version"\s*:\s*"([^"]+)"/u.exec(packageText)?.[1];
    expect(packageVersion).toBeDefined();
    expect(H2DC_PACKAGE_VERSION).toBe(packageVersion);
  });
});
