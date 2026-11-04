# H2DC Dashboard v1.0.0

H2DC Dashboard v1.0.0 is the first stable, HACS-compatible release of the commissioned wall-tablet interface.

## Completed work

- Shipped one configurable Home Assistant custom card with Home, Security, Energy, Climate, Lights, Media, Sonos, and System views.
- Added the animated PowerFlo energy overview, focused energy detail dialogs, consistent live-value formatting, and PowerFlo configuration support.
- Added a nine-camera security layout, medium-stream camera dialogs, alarm controls, and keypad support.
- Added room-aware lighting and switch controls with whole-card touch targets, dimming controls, and accessible keyboard operation.
- Added media artwork, grouped room controls, and an isolated Sonora embed that prevents the external controller from replacing the H2DC shell.
- Added day and night backgrounds, weather-aware presentation, contextual home summaries, and reduced-motion behavior.
- Added a visual editor, schema validation, room configuration, onboarding guidance, and actionable empty and error states.
- Added reusable Home Assistant blueprints, clean-install, migration, upgrade, rollback, and acceptance documentation.
- Added immutable GitHub release assets, SHA-256 checksums, artifact provenance attestation, and HACS validation workflows.
- Verified strict TypeScript, the complete automated test suite, registration isolation, production builds, the HACS artifact contract, and a zero-vulnerability production dependency audit.

## Installation

Install the repository as a custom HACS dashboard repository, download the release, and add `/hacsfiles/h2dc-dashboard/h2dc-dashboard.js` as a JavaScript module resource. See `docs/INSTALLATION.md` and `docs/CONFIGURATION.md` for complete setup guidance.

## Upgrade safety

Keep entity mappings in Lovelace configuration rather than editing the release artifact. Before upgrading, back up the dashboard configuration and follow `docs/UPGRADING.md`.
