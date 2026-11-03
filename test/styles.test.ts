import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "../src/styles";

/** Verifies the distributable visual contract without requiring a browser DOM. */
describe("CARD_STYLES", () => {
  it("retains keyboard focus and minimum touch targets", () => {
    expect(CARD_STYLES).toContain(":focus-visible");
    expect(CARD_STYLES).toContain("min-width: 2.75rem");
    expect(CARD_STYLES).toContain("min-height: 2.75rem");
  });

  it("provides compact and narrow responsive profiles", () => {
    expect(CARD_STYLES).toContain("@media (max-width: 81.25rem)");
    expect(CARD_STYLES).toContain("@media (max-width: 50rem), (orientation: portrait)");
  });

  it("provides a materially different reduced-motion path", () => {
    expect(CARD_STYLES).toContain("@media (prefers-reduced-motion: reduce)");
    expect(CARD_STYLES).toContain("animation: none !important");
  });

  it("keeps the approved weather atmosphere self-contained", () => {
    expect(CARD_STYLES).toContain("data:image/webp;base64");
    expect(CARD_STYLES).toContain("background-size: cover");
  });
});
