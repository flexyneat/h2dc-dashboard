# H2DC Dashboard

H2DC is a configurable Home Assistant wall-dashboard card designed for 16:10 kiosk displays. This repository is the upgrade-safe successor to a commissioned local card.

> Status: HACS-compatible stable release. The complete eight-route dashboard passed isolated 1920×1200 tablet acceptance before its authorized production cutover.

## Design contract

- Eight stable routes: Home, Security, Energy, Climate, Lights, Media, Sonos, and System.
- Operator-owned entity mapping; the package contains no household IDs, hostnames, or private images.
- Read-only rendering. Home Assistant service calls are allowed only after an explicit interaction.
- Configurable battery/grid polarity, telemetry threshold, day/night backgrounds, and per-view overrides.
- Capability-aware light controls and designed stale/unavailable states.
- Runtime-validated user actions; rendering itself never invokes a Home Assistant service.
- Complete Energy composition through the separately installed PowerFlo card, preserving both battery estimates, Recorder history, readiness, preparedness, simulator, solar outlook, estimate evidence, grid observations, and the full optional Modbus telemetry map.

## Development

```bash
npm install
npm run verify
npm run verify:release
```

The build emits two self-contained artifacts: `dist/h2dc-dashboard.js`, the public filename declared in `hacs.json`, and `dist/h2dc-dashboard-preview.js`, an isolated acceptance-only element that cannot claim the production tag. `verify:release` checks the HACS filename/layout, semantic version, public custom-element identity, preview isolation, and emits the distributable SHA-256 digest. The Energy view requires PowerFlo 0.5.0 or a compatible newer release to be registered separately.

## HACS installation target

The public repository includes a recognizable open-source license, this README, root-level `hacs.json`, and the matching `dist/h2dc-dashboard.js` release asset. The validation workflow runs the official HACS plugin action on pushes, pull requests, a daily schedule, and manual dispatch. Tagged releases publish an immutable dashboard asset, checksum, and build-provenance attestation.

See [installation](docs/INSTALLATION.md), [configuration](docs/CONFIGURATION.md), [upgrade and rollback](docs/UPGRADING.md), the [clean-install rehearsal](docs/CLEAN_INSTALL_REHEARSAL.md), the [blueprint library](docs/BLUEPRINTS.md), the [sensor migration runbook](docs/SENSOR_MIGRATION.md), the [luxury product roadmap](docs/PRODUCT_ROADMAP.md), and the [preview acceptance record](docs/ACCEPTANCE.md) before testing a pre-release.
