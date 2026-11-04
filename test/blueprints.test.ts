import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BLUEPRINTS = [
  "kiosk-wake.yaml",
  "tablet-poe-charging.yaml",
  "presence-lighting.yaml",
  "sensor-overlap-migration.yaml",
] as const;

/** Reads one distributable blueprint as source text for contract-level checks. */
function blueprint(name: (typeof BLUEPRINTS)[number]): string {
  return readFileSync(resolve(process.cwd(), "blueprints/automation/h2dc", name), "utf8");
}

describe("H2DC blueprint library", () => {
  it.each(BLUEPRINTS)("keeps %s portable and updateable", (name) => {
    const source = blueprint(name);
    expect(source).toContain("domain: automation");
    expect(source).toContain("source_url: https://github.com/flexyneat/h2dc-dashboard/");
    expect(source).toContain("selector:");
    expect(source).not.toMatch(/192\.168\.|thearach|rack_usw|dashboard_battery/u);
    expect(source).not.toMatch(/device_id:\s*[a-f0-9]{16,}/u);
  });

  it("requires typed selectors for the entities each reusable pattern observes", () => {
    expect(blueprint("kiosk-wake.yaml")).toContain("wake_actions:");
    expect(blueprint("tablet-poe-charging.yaml")).toContain("domain: sensor");
    expect(blueprint("presence-lighting.yaml")).toContain("multiple: true");
    expect(blueprint("sensor-overlap-migration.yaml")).toContain("replacement_sensors:");
  });

  it("guarantees a non-overlapping tablet charging window", () => {
    const source = blueprint("tablet-poe-charging.yaml");
    expect(source).toMatch(/charge_below:[\s\S]*?max: 49/u);
    expect(source).toMatch(/stop_above:[\s\S]*?min: 50/u);
  });

  it("publishes only a verified, checksummed, provenance-attested HACS artifact", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/release.yml"), "utf8");
    expect(workflow).toContain("npm run verify");
    expect(workflow).toContain("npm run verify:release");
    expect(workflow).toContain("RELEASE_TAG");
    expect(workflow).toContain("v${p.version}");
    expect(workflow).toContain("sha256sum dist/h2dc-dashboard.js");
    expect(workflow).toContain("actions/attest-build-provenance@");
    expect(workflow).toContain("gh release create");
    expect(workflow).not.toContain("h2dc-dashboard-preview.js");
    for (const action of workflow.matchAll(/uses:\s+([^\s]+)/gu)) {
      expect(action[1]).toMatch(/@[a-f0-9]{40}$/u);
    }
  });

  it("verifies the public bundle contract before a release can publish", () => {
    const verifier = readFileSync(
      resolve(process.cwd(), "scripts/verify-release-artifact.mjs"),
      "utf8",
    );

    expect(verifier).toContain('filename !== "h2dc-dashboard.js"');
    expect(verifier).toContain('source.includes("h2dc-dashboard-card")');
    expect(verifier).toContain('source.includes("h2dc-dashboard-preview")');
    expect(verifier).toContain('createHash("sha256")');
  });

  it("declares one root-level HACS dashboard artifact from dist", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "hacs.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(manifest).toMatchObject({
      name: "H2DC Dashboard",
      content_in_root: false,
      filename: "h2dc-dashboard.js",
      hide_default_branch: true,
    });
    expect(manifest).toHaveProperty("homeassistant");
    expect(readFileSync(resolve(process.cwd(), "dist/h2dc-dashboard.js"), "utf8")).toContain(
      "h2dc-dashboard-card",
    );
  });

  it("runs the official HACS plugin validator from an immutable action revision", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/validate.yml"), "utf8");

    expect(workflow).toContain("category: plugin");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("schedule:");
    expect(workflow).toMatch(/hacs\/action@[a-f0-9]{40}/u);
    expect(workflow).not.toContain("hacs/action@main");
  });
});
