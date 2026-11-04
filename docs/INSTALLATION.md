# Installation

## Requirements

- Home Assistant 2026.10.0 or newer.
- HACS with the Frontend category enabled.
- PowerFlo 0.5.0 or a compatible later version when the complete Energy view is required.
- HTTPS for any remotely hosted Sonora controller.

## Clean HACS installation

1. Add the public H2DC repository as a HACS custom repository with category **Dashboard**.
2. Download a tagged release. Do not install a branch build on a commissioned tablet.
3. Confirm `/hacsfiles/h2dc-dashboard/h2dc-dashboard.js` exists in **Settings → Dashboards → Resources** as a JavaScript module.
4. Add `custom:h2dc-dashboard-card` to a temporary dashboard.
5. Use the visual editor readiness panel to map required entities before enabling any view.
6. Import only the blueprints needed by the installation. Every blueprint is opt-in and selector-driven.
7. Validate desktop, wall-tablet, portrait-tablet, and phone profiles before changing the kiosk start URL.

## Integrity check

Every release includes `SHA256SUMS` and a GitHub build-provenance attestation. Compare the downloaded JavaScript hash with `SHA256SUMS`, then verify the attestation from the release page before commissioning.

## Safe acceptance order

1. Configuration readiness has no blocked items.
2. Home, Security, Energy, Climate, Lights, Media, Sonos, and System render without scrolling on their intended profile.
3. Keyboard focus and Escape behavior work for every modal.
4. Reduced motion leaves all content visible and stops continuous path animation.
5. Entity actions are tested on non-critical devices.
6. Fully Kiosk wake and PoE charging are tested separately from dashboard rendering.
7. Only after all gates pass should the operator change the kiosk start URL.
