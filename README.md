# H2DC Dashboard

H2DC is a configurable Home Assistant wall-dashboard card designed for 16:10 kiosk displays. This repository is the upgrade-safe successor to a commissioned local card.

> Status: pre-release migration candidate. Native 1920×1200 visual-layout parity has passed in an isolated preview dashboard; interaction and accessibility acceptance remain required before replacing a commissioned `/local/` resource.

## Design contract

- Eight stable routes: Home, Security, Energy, Climate, Lights, Media, Sonos, and System.
- Operator-owned entity mapping; the package contains no household IDs, hostnames, or private images.
- Read-only rendering. Home Assistant service calls are allowed only after an explicit interaction.
- Configurable battery/grid polarity, telemetry threshold, day/night backgrounds, and per-view overrides.
- Capability-aware light controls and designed stale/unavailable states.
- Runtime-validated user actions; rendering itself never invokes a Home Assistant service.

## Development

```bash
npm install
npm run verify
```

The build emits `dist/h2dc-dashboard.js`, the filename declared in `hacs.json`. The current pre-release includes the strict configuration/editor, all eight visual routes, state-aware controls, diagnostics, responsive profiles, and reduced-motion behavior.

## HACS installation target

The eventual public repository must be public on GitHub, include a recognizable open-source license, repository description/topics, this README, root-level `hacs.json`, and the matching `dist/h2dc-dashboard.js` asset. Published releases will provide selectable versions.

See [migration](docs/MIGRATION.md), [configuration](docs/CONFIGURATION.md), and the [preview acceptance record](docs/ACCEPTANCE.md) before testing a pre-release.
