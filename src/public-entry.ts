/**
 * @fileoverview Public HACS entry point for the production H2DC custom element.
 */

import { registerH2DCDashboardCard } from "./index";

// Only the distributable entry point is allowed to claim the production tag.
registerH2DCDashboardCard();
