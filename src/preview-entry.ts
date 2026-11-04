/**
 * @fileoverview Isolated preview entry point that cannot claim the production tag.
 */

import { isRecord } from "./config-schema";
import { H2DCDashboardCard } from "./index";
import { H2DC_PACKAGE_VERSION } from "./version";

/** Preview-only element that normalizes its alias to the public configuration contract. */
class H2DCPreviewDashboardCard extends H2DCDashboardCard {
  /** Normalizes the preview tag before the shared strict parser sees the configuration. */
  public override setConfig(input: unknown): void {
    super.setConfig(isRecord(input) ? { ...input, type: "custom:h2dc-dashboard-card" } : input);
  }
}

// This artifact deliberately does not register h2dc-dashboard-card or picker metadata.
if (!customElements.get("h2dc-dashboard-preview")) {
  customElements.define("h2dc-dashboard-preview", H2DCPreviewDashboardCard);
}

console.info(`H2DC Dashboard preview ${H2DC_PACKAGE_VERSION} loaded`);
