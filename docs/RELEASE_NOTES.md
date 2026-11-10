# H2DC Dashboard v1.3.1

H2DC Dashboard v1.3.1 adds a live System-view control for the read-only EV Charging simulator while retaining the version-neutral OCPP workspace introduced in v1.3.0.

## Completed work

- Added an allowlisted `input_boolean` control beside the System-view PoE control for showing or hiding the simulated EV Charging workspace at runtime.
- Made the mapped helper authoritative over the portable static simulator flag, so an operator can disable both simulated telemetry and the EV Charging navigation tab without editing Lovelace YAML.
- Commissioned a four-second Living Room Apple TV console-light transition for both dimming and brightening while preserving the automation's guarantee that it never turns the light off.
- Shipped one configurable Home Assistant custom card with Home, Security, Energy, EV Charging, Climate, Lights, Media, Sonos, and System views.
- Added normalized OCPP 1.6J, 2.0.1 and 2.1 entity mappings for connector state, power, current, voltage, temperature, session energy, lifetime energy, transaction identity, availability and recent history.
- Added an opt-in `ev_charging_demo` feature flag and visual-editor toggle that renders labelled sample telemetry without exposing a charger command.
- Added a complete charger onboarding and entity-mapping guide with security, acceptance and troubleshooting checkpoints.
- Added the animated PowerFlo energy overview, focused energy detail dialogs, consistent live-value formatting, and PowerFlo configuration support.
- Added a nine-camera security layout, medium-stream camera dialogs, alarm controls, and keypad support.
- Added room-aware lighting and switch controls with whole-card touch targets, dimming controls, and accessible keyboard operation.
- Rendered configured lighting names exactly once, including `Recessed Lights`, `Accent Lights`, and the grouped `Lounge Lights`, with short room captions and no registry-name duplication.
- Moved commissioned lighting-circuit switches into the Lights section while retaining utility switches in the separate Switches section.
- Increased active-card contrast so on-state labels remain legible over both day and night photography.
- Added media artwork, grouped room controls, and an isolated Sonora embed that prevents the external controller from replacing the H2DC shell.
- Added day and night backgrounds, weather-aware presentation, contextual home summaries, and reduced-motion behavior.
- Added a visual editor, schema validation, room configuration, onboarding guidance, and actionable empty and error states.
- Added configurable labels and visibility for all nine routes, with automatic Energy hiding when PowerFlo is unavailable and EV Charging hiding until a charger mapping or the explicit simulator is enabled.
- Added portable House Pulse summaries and room-based climate configuration.
- Restored verified day/night backgrounds across every route.
- Prioritized medium-channel Security thumbnails while retaining medium-channel popup streams.
- Added reusable Home Assistant blueprints, clean-install, migration, upgrade, rollback, and acceptance documentation.
- Added immutable GitHub release assets, SHA-256 checksums, artifact provenance attestation, recognized repository topics, a README product image, and HACS validation workflows.
- Verified strict TypeScript, the complete automated test suite, registration isolation, production builds, the HACS artifact contract, and a zero-vulnerability production dependency audit.

## Installation

Install the repository as a custom HACS dashboard repository, download the release, and add `/hacsfiles/h2dc-dashboard/h2dc-dashboard.js` as a JavaScript module resource. See `docs/INSTALLATION.md` and `docs/CONFIGURATION.md` for complete setup guidance.

## Upgrade safety

Keep entity mappings in Lovelace configuration rather than editing the release artifact. Before upgrading, back up the dashboard configuration and follow `docs/UPGRADING.md`.
