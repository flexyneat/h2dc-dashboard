# H2DC Dashboard

An eight-view Home Assistant dashboard for wall-mounted 16:10 tablets. H2DC brings security, live energy flow, climate, lighting, media, Sonos, and kiosk diagnostics into one configurable card without embedding household entity IDs in the package.

[![Release](https://img.shields.io/github/v/release/flexyneat/h2dc-dashboard?display_name=tag&sort=semver)](https://github.com/flexyneat/h2dc-dashboard/releases/latest)
[![HACS validation](https://github.com/flexyneat/h2dc-dashboard/actions/workflows/hacs.yml/badge.svg)](https://github.com/flexyneat/h2dc-dashboard/actions/workflows/hacs.yml)
[![Verify](https://github.com/flexyneat/h2dc-dashboard/actions/workflows/verify.yml/badge.svg)](https://github.com/flexyneat/h2dc-dashboard/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4d7c68.svg)](LICENSE)

![H2DC Home view running on the commissioned 1920 by 1200 wall tablet](docs/images/home.png)

> **Release status:** HACS-compatible stable release. The production bundle and all eight routes have passed isolated 1920 × 1200 tablet acceptance. Every installation supplies its own entities, backgrounds, labels, and optional integrations through the visual editor or YAML.

## What H2DC provides

- **Home:** time, current weather, whole-house status, live energy flow, climate, now playing, nearby controls, and contextual summary cards.
- **Security:** alarm controls, masked keypad, and a no-scroll nine-camera overview with focused medium-stream playback.
- **Energy:** animated solar, battery, grid, and protected-load flow with focused detail surfaces and optional Complete PowerFlo analysis.
- **Climate:** room conditions, set-point controls, outdoor weather, and condition-aware imagery.
- **Lights:** curated light and switch sections, capability-aware dimmers, and full-card touch targets.
- **Media:** grouped Sonos and television endpoints with live metadata, transport controls, and album artwork when available.
- **Sonos:** an optional embedded Sonora controller behind an explicitly configured reverse proxy.
- **System:** kiosk health, battery and charging state, network status, PoE control, and operator diagnostics.

H2DC renders read-only state until the user deliberately interacts with a control. Runtime validation rejects malformed entity IDs, unsafe URLs, invalid numeric service data, and unsupported actions before Home Assistant receives a service call.

## Gallery

### Security and energy

| Security | Energy |
| --- | --- |
| [![H2DC Security view with alarm controls and nine cameras](docs/images/security.png)](docs/images/security.png) | [![H2DC Energy view with animated live power topology](docs/images/energy.png)](docs/images/energy.png) |

### Climate and lighting

| Climate | Lights and switches |
| --- | --- |
| [![H2DC Climate view with indoor and outdoor conditions](docs/images/climate.png)](docs/images/climate.png) | [![H2DC Lights view with touch-friendly cards and dimmers](docs/images/lights.png)](docs/images/lights.png) |

### Media and Sonos

| Media | Sonora controller |
| --- | --- |
| [![H2DC Media view with room groups and now-playing artwork](docs/images/media.png)](docs/images/media.png) | [![H2DC Sonos view after the Liquid Glass Sonora theme has rendered](docs/images/sonos.png)](docs/images/sonos.png) |

### System

[![H2DC System view with kiosk and infrastructure diagnostics](docs/images/system.png)](docs/images/system.png)

The gallery is captured directly from the commissioned tablet at its native **1920 × 1200** resolution. Values and media shown in screenshots are live examples, not package defaults.

## Requirements

- Home Assistant **2026.10.0 or newer**.
- HACS with Dashboard repositories enabled, or manual Lovelace resource installation.
- A modern browser or Android System WebView; Fully Kiosk Browser is recommended for wall tablets.
- [PowerFlo](https://github.com/flexyneat/PowerFlo) 0.5.0 or a compatible later release only when Complete PowerFlo analysis is enabled.
- An HTTPS Sonora endpoint with explicit frame and exact-origin CORS policies only when the Sonos view is enabled.

## Install with HACS

H2DC is currently installed as a custom HACS Dashboard repository:

1. Open **HACS → Dashboard**.
2. Open the three-dot menu and choose **Custom repositories**.
3. Add `https://github.com/flexyneat/h2dc-dashboard` with category **Dashboard**.
4. Install the latest tagged release.
5. Confirm `/hacsfiles/h2dc-dashboard/h2dc-dashboard.js` is registered as a JavaScript module under **Settings → Dashboards → Resources**.
6. Add a manual card with type `custom:h2dc-dashboard-card` to a temporary dashboard.
7. Map the required entities in the visual editor before enabling the dashboard on a kiosk.

See the full [installation and integrity guide](docs/INSTALLATION.md) before changing a production tablet's start URL.

## Minimal configuration

```yaml
type: custom:h2dc-dashboard-card
view: home
config_version: 2
dashboard_path: /wall
entities:
  alarm: alarm_control_panel.house
  climate: climate.living_room
  weather: weather.home
  room_temperature: sensor.living_room_temperature
  lights:
    - entity: light.living_room
      room: Living room
      icon: mdi:ceiling-light
  switches:
    - entity: switch.outside_lights
      room: Exterior
      icon: mdi:string-lights
  energy:
    freshness: binary_sensor.inverter_fresh
    solar: sensor.solar_power
    battery_soc: sensor.battery_soc
    battery: sensor.battery_power
    grid: sensor.grid_power
    load: sensor.home_load
battery_positive_is: discharge
grid_positive_is: import
flow_threshold_w: 40
backgrounds:
  day: /local/h2dc/day.webp
  night: /local/h2dc/night.webp
  per_view:
    security: /local/h2dc/security.webp
presentation:
  font_family: Aeonik Pro
  kiosk_profile: wall_16_10
```

The editor and schema support reusable rooms, per-view backgrounds, presentation density, House Pulse summaries, camera mappings, grouped media players, Sonora, kiosk diagnostics, PowerFlo telemetry, and installation-specific labels. Review the complete [configuration reference](docs/CONFIGURATION.md) rather than copying entity IDs from the screenshots.

## Customize safely

| Area | Configure | Important boundary |
| --- | --- | --- |
| Backgrounds | Global day/night images and per-view overrides | Only `/local/`, `/media/`, HTTPS, and `data:image/` sources are accepted. |
| Energy | Entity mappings, polarity, flow threshold, PowerFlo options | H2DC does not send inverter commands. |
| Cameras | Up to nine overview entities and dedicated medium-stream entities | Opening one camera starts only its selected stream. |
| Lights | Up to eight curated lights and eight curated switches | Keep administrative, PoE, and camera-analysis switches out of household controls. |
| Media | Named room groups and fallback players | Artwork is used only when supplied by the selected player or configured Sonora endpoint. |
| Kiosk | Fully Kiosk entities, battery sensor, and tablet PoE switch | Wake and charging automation remain separate, opt-in commissioning tasks. |

Optional automation blueprints cover presence lighting, sensor overlap migration, tablet charging windows, and kiosk wake. Every blueprint is selector-driven and contains no household entity IDs. See the [blueprint library](docs/BLUEPRINTS.md).

## Architecture and security

H2DC is a strict-TypeScript Lovelace custom card compiled into one deterministic public bundle. Configuration is parsed at the boundary before rendering or action dispatch. The runtime package excludes commissioned household configuration, private source assets, hostnames, secrets, operating logs, and preview-only artifacts; the repository gallery contains only the operator-approved tablet captures shown above.

Key guarantees:

- no production dependencies in the browser bundle;
- no hidden entity discovery or household defaults;
- explicit allowlists for climate, media, alarm, and infrastructure actions;
- finite-value checks for numeric service data;
- escaped dynamic text and validated image/background URLs;
- reduced-motion support and designed unavailable/stale states;
- keyboard focus restoration and Escape dismissal for dialogs;
- medium-stream camera policy for focused playback;
- separate public and isolated-preview custom-element registrations.

For reverse-proxy requirements and trust boundaries, use the [configuration guide](docs/CONFIGURATION.md) and [Security acceptance matrix](docs/SECURITY_PORT_ACCEPTANCE_MATRIX.md).

## Development

```bash
npm install
npm run verify
npm run verify:release
```

The project uses:

1. **Build system:** Vite 8 with deterministic library output.
2. **Frontend:** native Home Assistant custom elements written in strict TypeScript 5.9.
3. **Backend:** none; H2DC consumes the authenticated Home Assistant frontend state object.
4. **Database:** none; history and statistics remain owned by Home Assistant Recorder.
5. **Authentication:** the active Home Assistant session.
6. **Testing:** Vitest 4 plus TypeScript, distribution-isolation, HACS, and release-artifact gates.
7. **Distribution:** HACS-compatible GitHub releases with checksums and build provenance.

The build emits:

- `dist/h2dc-dashboard.js` — the release asset declared by `hacs.json`;
- `dist/h2dc-dashboard-preview.js` — an isolated acceptance build that cannot register the production custom-element tag.

`npm run verify:release` checks the HACS filename and layout, semantic version, custom-element identity, preview isolation, and distributable SHA-256 digest.

## Documentation

- [Installation](docs/INSTALLATION.md)
- [Configuration reference](docs/CONFIGURATION.md)
- [Upgrade and rollback](docs/UPGRADING.md)
- [Clean-install rehearsal](docs/CLEAN_INSTALL_REHEARSAL.md)
- [Blueprint library](docs/BLUEPRINTS.md)
- [Sensor migration runbook](docs/SENSOR_MIGRATION.md)
- [Acceptance record](docs/ACCEPTANCE.md)
- [Energy acceptance matrix](docs/ENERGY_PORT_ACCEPTANCE_MATRIX.md)
- [Security acceptance matrix](docs/SECURITY_PORT_ACCEPTANCE_MATRIX.md)
- [Product roadmap](docs/PRODUCT_ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Release and support policy

- Install tagged releases on commissioned tablets; do not point production kiosks at `main`.
- Verify `SHA256SUMS` and the GitHub build-provenance attestation before commissioning.
- Test upgrades on a temporary dashboard and retain the prior resource URL for rollback.
- Report reproducible defects through [GitHub Issues](https://github.com/flexyneat/h2dc-dashboard/issues) without attaching secrets, private camera images, or complete Home Assistant configuration exports.

## License

H2DC Dashboard is available under the [MIT License](LICENSE). Third-party products and integrations retain their own names, trademarks, and licenses.
