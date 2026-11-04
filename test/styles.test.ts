import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "../src/styles";

/** Verifies the distributable visual contract without requiring a browser DOM. */
describe("CARD_STYLES", () => {
  it("exposes configuration-driven theme and kiosk profile hooks", () => {
    expect(CARD_STYLES).toContain("--h2dc-font-family");
    expect(CARD_STYLES).toContain("--h2dc-overlay-strength");
    expect(CARD_STYLES).toContain('[data-density="compact"]');
    expect(CARD_STYLES).toContain('[data-kiosk-profile="tablet_portrait"]');
  });
  it("retains keyboard focus and minimum touch targets", () => {
    expect(CARD_STYLES).toContain(":focus-visible");
    expect(CARD_STYLES).toContain("min-width: 2.75rem");
    expect(CARD_STYLES).toContain("min-height: 2.75rem");
  });

  it("provides compact and narrow responsive profiles", () => {
    expect(CARD_STYLES).toContain("@media (max-width: 81.25rem)");
    expect(CARD_STYLES).toContain("@media (max-width: 50rem), (orientation: portrait)");
  });

  it("counter-translates the runtime card across the physical viewport", () => {
    expect(CARD_STYLES).toContain("height: 100vh");
    expect(CARD_STYLES).toContain("overflow: visible");
    expect(CARD_STYLES).toContain(".shell {\n  position: fixed;\n  inset: 0;");
    expect(CARD_STYLES).toContain("transform: translate(var(--h2dc-offset-x, 0), var(--h2dc-offset-y, 0))");
  });

  it("provides a materially different reduced-motion path", () => {
    expect(CARD_STYLES).toContain("@media (prefers-reduced-motion: reduce)");
    expect(CARD_STYLES).toContain("animation: none !important");
  });

  it("keeps the approved weather atmosphere self-contained", () => {
    expect(CARD_STYLES).toContain("data:image/webp;base64");
    expect(CARD_STYLES).toContain("background-size: cover");
  });

  it("projects H2DC contrast and typography tokens into embedded PowerFlo", () => {
    expect(CARD_STYLES).toContain("--primary-text-color:");
    expect(CARD_STYLES).toContain("--secondary-text-color:");
    expect(CARD_STYLES).toContain("--ha-card-background:");
    expect(CARD_STYLES).toContain("--ha-font-family: Aeonik");
  });
});
