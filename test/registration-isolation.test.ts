import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("custom-element registration isolation", () => {
  it("keeps production registration out of the preview entry source", async () => {
    const source = await readFile(join(process.cwd(), "src", "preview-entry.ts"), "utf8");
    expect(source).toContain('customElements.define("h2dc-dashboard-preview"');
    expect(source).not.toContain('customElements.define("h2dc-dashboard-card"');
    expect(source).not.toContain("registerH2DCDashboardCard");
  });

  it("allows the preview artifact to register only its isolated element", async () => {
    const registry = new Map<string, CustomElementConstructor>();
    const customElementsMock = {
      define: (name: string, constructor: CustomElementConstructor): void => { registry.set(name, constructor); },
      get: (name: string): CustomElementConstructor | undefined => registry.get(name),
    } as CustomElementRegistry;
    class TestHTMLElement {}

    Object.defineProperty(globalThis, "customElements", { configurable: true, value: customElementsMock });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: TestHTMLElement });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { customCards: [] } });

    const previewUrl = pathToFileURL(join(process.cwd(), "dist", "h2dc-dashboard-preview.js"));
    previewUrl.searchParams.set("test", String(Date.now()));
    await import(previewUrl.href);

    expect(registry.has("h2dc-dashboard-preview")).toBe(true);
    expect(registry.has("h2dc-dashboard-card")).toBe(false);
    expect(registry.has("h2dc-dashboard-editor")).toBe(false);
  });

  it("emits two standalone bundles without a shared runtime dependency", async () => {
    const production = await readFile(join(process.cwd(), "dist", "h2dc-dashboard.js"), "utf8");
    const preview = await readFile(join(process.cwd(), "dist", "h2dc-dashboard-preview.js"), "utf8");
    expect(production).not.toMatch(/from\s+["']\.\/h2dc-shared\.js["']/u);
    expect(preview).not.toMatch(/from\s+["']\.\/h2dc-shared\.js["']/u);
  });

  it("ships the opt-in simulator while keeping preview registration isolated", async () => {
    const production = await readFile(join(process.cwd(), "dist", "h2dc-dashboard.js"), "utf8");
    const preview = await readFile(join(process.cwd(), "dist", "h2dc-dashboard-preview.js"), "utf8");
    expect(production).toContain("h2dc_demo_ev_status");
    expect(production).toContain("ev_charging_demo");
    expect(preview).toContain("h2dc_demo_ev_status");
    expect(preview).toContain("preview_ev_charging_demo");
  });
});
