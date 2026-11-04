# Changelog

## 1.0.0 — 2026-11-04

- Promoted the physically accepted eight-route H2DC dashboard from its isolated preview to the stable HACS production package.
- Shipped configurable Home, Security, Energy, Climate, Lights, Media, Sonos, and System views with schema-validated entity mapping and no commissioned household identifiers in the public bundle.
- Included the PowerFlo energy topology, nine-camera Security layout, state-aware climate and lighting controls, resilient Sonora handoff, accessibility paths, kiosk diagnostics, onboarding, blueprints, and upgrade/rollback documentation.
- Published the official HACS plugin validation workflow plus immutable release artifact, checksum, and build-provenance attestation gates.
- Verified strict TypeScript, 149 source tests with one environment-dependent skip, three distribution-isolation tests, both production and preview builds, and a zero-vulnerability production dependency audit.

## Unreleased

- Renamed the Media whole-home group to `Common areas` and added configurable Sonos Roam support using the commissioned `media_player.roam_2` entity.
- Removed the duplicate date beneath the Home clock while preserving the primary Home date heading.
- Updated the stairwell light automation pair to use the relocated Samsung motion sensor with the existing UniFi motion fallback, removing the retired Aqara FP1 reference after exact read-back.
- Cancelled further screenshot generation at the operator's request after blank captures failed acceptance.

## Unreleased — Complete product foundation and migration handoff

- Restored the Energy topology's state-aware Charging/Discharging label to the left of the Home node and retained absolute W/kW display for signed battery telemetry.
- Applied the live weather condition class to the Climate outside card so its icon, label, temperature, and atmospheric background remain synchronized; unavailable weather now renders a neutral state rather than a misleading condition.
- Added charging, rainy-condition, and unavailable-weather regression coverage; full verification passes 147 tests with one intentional environment skip plus three distribution-isolation tests.
- Increased non-Home route headings to a tokenized H3-like 20–28 px scale with high-contrast text while retaining one semantic page `h1`; deployed only to isolated preview `2026.11.04.7`.
- Traced failed approach wake to absent FP300 PIR/occupancy events: the wake automation has zero runs, FP300 motion reporting stopped around 05:10, and direct Fully Kiosk screen control remains available. Added a physical single-press/read-back acceptance gate before sensor promotion.
- Implemented all ten roadmap foundations in the isolated package, including deterministic contextual Home states, schema-v2 room editing, guided onboarding, diagnostics, resilient media, kiosk profiles, theme tokens, blueprints, and provenance-attested release packaging.
- Added clean-install, upgrade, rollback, and blueprint documentation and expanded the verified suite to 141 passing source tests plus one environment-dependent skip and three distribution-isolation tests.
- Recorded the FP300/Samsung overlap evidence and preserved the physical-move gate before any stairwell automation references the Samsung entity.
- Left the commissioned production dashboard and final HACS release untouched pending physical and operator acceptance.

## Unreleased

- Added a portable, entity-mapped House Pulse row for access, presence, comfort, and attention summaries.
- Added strict validation for House Pulse mappings and safe empty/unavailable states.
- Commissioned a reversible FP300/Samsung living-room overlap that preserves existing lighting windows and requires all sensors clear before shutoff.

## Unreleased — Sensor migration and HACS product roadmap

- Added a rollback-safe FP300/Samsung sensor migration plan based on exact live automation hashes and behavior.
- Added a configurable House Pulse concept for the unused second Home summary row.
- Added ten prioritized luxury-product improvements and their HACS delivery order.
- Made no production dashboard or Home Assistant automation changes.

## Unreleased — Security, Sonora readiness, and System control

- Split Security alarm status from a compact masked keypad with allowlisted disarm dispatch.
- Added a confirmation-gated PoE toggle to System without showing entity identifiers in the interface.
- Extended the Sonora theme-settle curtain to cover its browser-persisted asynchronous theme application.
- Preserved private keypad state across unrelated Home Assistant updates and added regression coverage.
- Clear the masked alarm code on route exit, disconnect, or configuration identity change.
- Restrict the PoE action to the single configured `switch` entity and reject forged targets.
- Deployed only isolated preview cache key `2026.11.04.5`; commissioned production remains `1.0.17`.

## 2026-11-04 — Adaptive values, touch targets, Sonora readiness and wake repair

- Render whole numeric values without decimals and genuine fractional values to two decimal places, including power, voltage, temperature and dimmer percentages.
- Convert the complete Light card body into the toggle target while preserving the independent brightness range control.
- Remove the large date heading from every route except Home.
- Gate Sonora visibility on completion of its installed-theme catalogue request plus a bounded settle interval, replacing the former blind delay that could expose the upstream default-theme first paint.
- Enable Fully Kiosk's `Prevent from Sleep while Screen Off` setting after authenticated read-back identified it as disabled; Remote Admin now reports full and partial wakelocks active while the screen is off.
- Hold the Sonora curtain through the complete fallback timeout when the catalogue is rejected, CORS-blocked or non-successful; deploy only isolated preview cache key `2026.11.04.4`. The production H2DC resource remains unchanged.

## 2026-11-04 — Tablet theme and WebView glyph hardening

- Rendered Celsius units and key controls through HTML entities plus an accessible text equivalent so Fully Kiosk cannot expose UTF-8 mojibake as `A` or `Â`.
- Added a tokenized Sonora readiness curtain that keeps the cross-origin controller hidden while its persisted H2DC skin initializes.
- Installed isolated preview `2026.11.04.2`, cleared the Fully Kiosk web cache, and reloaded the tablet at the H2DC Home route.
- Set Home Assistant's light and dark defaults to `Liquid Glass Tinted`, disabled the legacy VisionOS startup override, and changed Fully Kiosk's persistent start URL from Aether to H2DC without deleting the Aether dashboard.

## 2026-11-03 — Fixed two-decimal telemetry formatting

- Added one shared numeric formatter for H2DC telemetry and entity attributes.
- Applied exactly two decimal places to power, energy, voltage, temperature, humidity, state-of-charge, reserve, brightness and diagnostic numeric readouts.
- Preserved semantic formatting for time, dates, device counts, identifiers, status text and integer service-control payloads.
- Added regression coverage for null, unavailable, signed, unit-bearing and boundary values.
- Installed only isolated preview resource `2026.11.03.13`; production remains outside this change.

## Unreleased

- Made repeated equivalent Lovelace `setConfig` calls idempotent so the persistent Sonora iframe, controller session and Liquid Glass theme are not rebuilt during normal dashboard updates.
- Added regression coverage for equivalent and materially changed normalized dashboard configurations.
- Installed isolated preview `2026.11.03.14`, cleared the Fully Kiosk web cache and verified Sonora remains themed through sustained live updates and Media-to-Sonos route transitions; production remains unchanged.

- Added a native Home Assistant daily utility meter for the Deye total-load counter and mapped its live value into the isolated Energy detail without changing production H2DC.
- Preserve the embedded Sonora iframe across routine HA state updates to prevent controller/theme restarts.
- Split the Lights route into bounded Lights and Switches sections, with non-destructive legacy editor recovery.
- Document the exact-origin Traefik CORS middleware required for Sonora artwork lookup.

- Preserved the connected Sonora iframe across routine Home Assistant state updates so telemetry rerenders no longer restart the controller or repeatedly expose its default theme.
- Expanded the isolated Lights view into separate, compact Lights and Switches sections backed by independently configurable, domain-validated entity lists.
- Documented an exact-origin, Sonora-router-only Traefik CORS middleware for the read-only album-art fallback.

- Rebuilt the isolated Media layout as a symmetric three-column composition with the active Now Playing card centred across both side-card rows.
- Rendered the selected active/paused player's authenticated Home Assistant album artwork as both the Media cover and restrained card backdrop; verified the paused Dining track on the physical tablet.
- Kept Sonora inside the H2DC shell so the global navigation remains available, and removed the iframe sandbox that prevented the self-hosted controller from completing its browser startup.
- Normalized the isolated Security view to three equal columns and three equal rows inside the physical 1920x1200 viewport.

- Rendered all live Energy power values with two decimal places in both watts and kilowatts.
- Counter-translated the fullscreen kiosk card out of Lovelace's transformed content column so native sidebar and inherited-theme content cannot remain exposed around H2DC.
- Pinned the H2DC shell to the physical viewport and allowed it to escape Lovelace's measured card-height clipping, verified on Energy, Climate and Lights at 1920x1200.
- Disabled the legacy `Frontend - VisionOS Theme` startup automation after confirming it globally reapplied the obsolete theme on every Home Assistant start.

- Added native Home Assistant/Sonos album artwork to the compact Home Now Playing card and full Media view, including exact-title child-speaker fallback when a group entity omits artwork.
- Added a privacy-bounded Sonora fallback that reads `/api/state` without credentials, proxies only Sonora-vouched artwork through `/api/art`, rejects unsafe URLs, cancels stale lookups, and preserves resolved covers across routine Home Assistant updates.
- Preserved Home Assistant's read-only WebSocket forecast channel, connection identity and user context through the PowerFlo relay-normalization adapter.
- Captured the installed Energy preview from the physical 1920×1200 Fully Kiosk tablet. The approved no-scroll shell, central live topology, side analytics, connected relay state and current solar-to-home-and-battery state render together without document overflow; production remains unchanged.

- Installed the exact private candidate only in the hidden admin preview dashboard and registered the isolated preview custom element; the commissioned H2DC dashboard remained at hash `14fe10b827338f81`.
- Enabled the nine explicitly approved UniFi Protect medium-resolution camera entities and reloaded their integration so the isolated Security modal can request medium streams without high-resolution fallback.
- Added a tracked tablet reliability workstream after proving that direct Fully Kiosk screen-on control works but motion-activity wake does not; no Fully Kiosk setting was changed without a current-value read-back.
- Corrected Energy and Security native-dialog focus restoration in live Home Assistant by deferring the return until browser dialog teardown completes, with deterministic regression coverage.
- Verified the installed Energy modal against live PowerFlo and Recorder data, and verified the Security view renders nine cameras, opens only the selected medium-resolution entity, removes the request on close and returns focus to the originating tile.
- Prevented routine Home Assistant rerenders from detaching the persistent PowerFlo element and resetting its estimator sessions; installed preview `2026.11.03.3` now renders both target and full-charge estimates with live moderate-confidence evidence.

- Staged a local-only private acceptance configuration covering the full PowerFlo entity map, live Forecast.Solar scalar/source mapping, and all nine explicit UniFi Protect snapshot/medium camera pairs without changing public defaults or Home Assistant state.
- Added a read-only freshness-derived status projection for installations that lack PowerFlo's required separate inverter-status entity; commissioned status entities still take precedence.
- Added an opt-in private-candidate parser check and browser acceptance harness so installation mappings can be tested without embedding household identifiers in public fixtures.

- Added an explicit per-camera medium-stream mapping that remains separate from the snapshot entity and never falls back to a high-resolution channel.
- Added an accessible native Security modal that starts only one selected medium stream, removes its source on close, restores trigger focus, and reports a bounded unavailable state when the authenticated stream cannot be resolved.
- Added Security regression coverage for medium-stream parsing, high-stream fallback prevention, and unconfigured-stream states.
- Confirmed read-only that all nine commissioned UniFi Protect devices expose medium-resolution channel entities; Home Assistant currently keeps those entities integration-disabled pending operator approval.
- Confirmed raw Recorder history for SOC, battery power, grid power and protected load plus hourly long-term statistics for total PV, grid import and battery discharge.
- Normalize the commissioned numeric grid-relay representation at the PowerFlo boundary without changing Home Assistant state or using voltage as availability evidence.
- Project H2DC semantic contrast and Aeonik typography tokens into the complete embedded PowerFlo card.
- Give every Energy node and shortcut its own focused detail surface instead of routing all triggers to the same complete PowerFlo modal.
- Restore per-view day/night background configuration and the approved Deye inverter reference image in the isolated preview; keep the complete PowerFlo card available only from Complete PowerFlo analysis.
- Prevent delayed native-dialog close events from overwriting a newly selected Energy detail or restoring focus to an older trigger during rapid repeated taps.
- Verify installed PowerFlo rendering, persistent estimate sessions, both battery targets, and overflow-free desktop/compact layouts in the isolated implementation fixture.
- Implemented the approved no-scroll Energy workspace with the Home power topology anchored centrally, live analytic rails on both sides, and native node/detail dialogs.
- Preserved a single PowerFlo element across Home Assistant state rerenders so Recorder history and both estimator sessions are not reset by routine telemetry updates.
- Added an isolated 1920×1200 implementation fixture and visually verified the commissioned relay state, 1.58 kW upward battery discharge, three-column hierarchy, modal semantics, and production-registration isolation.
- Corrected battery discharge flow to travel upward from battery through inverter to home, with regression coverage for the signed polarity path.
- Added a relay-first grid-availability state that never infers supply availability from voltage and suppresses stale grid flow when the commissioned relay is open.
- Accepted the commissioned Modbus relay's native `1.0`/`0.0` states and exposed both sensor and binary-sensor choices in the visual editor.
- Added the critical Grid detail mockup with independent relay, grid-power and L1-voltage history evidence for the 2 November interruption window.
- Added a requirement-by-requirement Energy-port acceptance matrix that keeps offline, visual, isolated-preview, live-telemetry and production-cutover evidence distinct.
- Expanded PowerFlo adapter regression coverage to include every optional Modbus channel, MPPT/BMS diagnostic, daily/lifetime counter, readiness assumption, statistic, forecast and estimate-accuracy setting.
- Replaced the rejected Energy mockup v1 with a no-scroll v2 that preserves the approved Home power-flow card as the central focal point and moves extended PowerFlo solar, battery, grid, load, inverter, history, readiness, forecast and diagnostic data into accessible detail modals.
- Added a production-isolated H2DC Energy design mockup that preserves PowerFlo's live topology, dual battery estimates, outage readiness, daily totals, thermal health, and history hierarchy for operator review before implementation.
- Split production and preview custom-element entry points so a globally loaded preview resource cannot claim `h2dc-dashboard-card`.
- Added a deterministic `h2dc-dashboard-preview.js` artifact and regression coverage for registration isolation.
- Removed the conflicting preview resource from the commissioned Home Assistant instance; the production dashboard configuration remained unchanged.
- Added the complete typed PowerFlo option and Modbus telemetry contract, including `load_today`, daily/lifetime counters, MPPT electrical readings, grid evidence, readiness, solar outlook, and estimate evidence.
- Preserved distinct battery target and full estimates by forwarding both the configured target and reserve semantics unchanged.
- Added a full visual editor surface for PowerFlo telemetry, statistics, identity, ratings, estimate assumptions, readiness, grid evidence, and observation settings.
- Added strict freshness validation, raster-only inverter-image validation, and flow activation/release hysteresis validation.
- Restyled the embedded PowerFlo domains with H2DC semantic colors while retaining upstream responsive and reduced-motion behavior.
- Replaced the shared-chunk build with independent standalone public and preview bundles suitable for HACS and isolated acceptance.

## 0.1.0-alpha.2 — 2026-11-03

- Made wall-clock renderer tests deterministic across GitHub Actions time zones.
- Retained the native 1920×1200 visual-layout acceptance evidence and migration gates from alpha.1.
- Kept the commissioned Home Assistant resource unchanged; this remains an isolated preview candidate.

## 0.1.0-alpha.1 — 2026-11-02

- Added the strict-TypeScript domain and schema boundary for all eight stable H2DC routes.
- Added portable, household-free public defaults and legacy snake_case normalization.
- Added safe background URL validation and configurable energy polarity/threshold fields.
- Added capability detection for dimmable and color-temperature lights.
- Added explicit missing/unknown/not-numeric entity readings and stale-aware PowerFlo derivation.
- Added runtime-validated service dispatch with finite-value checks and strict media/climate allowlists.
- Added a portable visual editor that preserves recognized configuration while required fields are incomplete.
- Added HACS metadata, deterministic Vite library output, tests, and rollback-safe migration guidance.
- Kept the commissioned live renderer outside this pre-release while the candidate is tested in isolation.
# 2026-11-04 — Route subheadings and resilient tablet wake

- Promoted non-Home route labels to each route's semantic `h1`, using a dedicated H3-like typography token and high-contrast surface colour.
- Added regression coverage for the route heading hierarchy and passed the complete strict TypeScript, source-test, build, and distribution-test suite.
- Commissioned a reversible Home Assistant fallback that wakes only the Fully Kiosk screen from FP300 PIR/presence or temporary Samsung living-room occupancy; physical repeated-cycle acceptance remains pending.
## 2026-11-04 — Acceptance and HACS metadata gate

- Reconciled the acceptance record with isolated preview `2026.11.04.7` and the frozen production `v1.0.17` resource.
- Added an automated root-level HACS manifest and `dist/h2dc-dashboard.js` artifact contract test using current HACS plugin requirements.
- Reconfirmed read-only that FP300 PIR and occupancy have emitted no transition since 05:10; the physical sensor wake remains the acceptance blocker.

## 2026-11-04 — Official HACS validation

- Added scheduled, push, pull-request, and manual HACS plugin validation using an immutable `hacs/action` revision.
- Extended release metadata regression coverage and passed the complete local verification pipeline.
## 2026-11-04 — Release artifact hardening

- Added a deterministic HACS artifact verifier for filename/layout, semantic version, custom-element identity, preview isolation, and SHA-256 output.
- Pinned every executable GitHub Action in validation and release workflows to an immutable commit SHA.

## 2026-11-04 — Installation rehearsal

- Added a production-isolated HACS clean-install and rollback runbook with explicit evidence, stop conditions, and pass criteria.
- Corrected the tablet-wake boundary by deleting the unreferenced FP300/Samsung screen-wake automation. Tablet wake is now specified as a device-local Fully Kiosk proximity/camera function; living-room sensor migration, PoE charging, and production H2DC remain separate and unchanged.
- Reapplied the device-local Fully Kiosk wake configuration (`motionDetection`, `motionDetectionProximity`, and `screenOnOnMotion`) to the ante-room tablet. Home Assistant room sensors are not involved.
- Passed the first physical touch-free approach wake test using only Fully Kiosk's local tablet detection.

## 2026-11-04 — Energy status and weather-state alignment

- Restored Charging/Discharging copy and live battery-flow magnitude beside the Home node in the Energy topology.
- Derived the Climate outside icon, label, temperature, and background treatment from one sanitized live weather condition.
- Added an explicit neutral unavailable state so stale or missing weather data cannot present a fabricated condition.
- Installed and visually verified isolated preview `2026.11.04.8`; the commissioned production resource was not changed.

## 2026-11-04 — Live weather and Sonos entity reconciliation

- Added a battery-green charging label, value and lightning marker while preserving amber discharge semantics.
- Restored `weather.forecast_home` by reloading its Met integration and verified live cloudy conditions, temperature and humidity render with the matching weather image.
- Replaced stale media mappings with `media_player.beam` for Master Bedroom and `media_player.ray` for Family Lounge.
- Installed isolated preview `2026.11.04.9`, cleared Fully Kiosk's web cache and reloaded the preview start URL; production remains pinned to `v1.0.17`.

## 2026-11-04 — Home heading and shareable tablet captures

- Removed the redundant generic `Home overview` eyebrow while preserving contextual Home status labels.
- Confirmed the Family Lounge mapping remains `media_player.ray` across the isolated preview.
- Installed preview `2026.11.04.10` and captured the dashboard at the tablet's native 1920 × 1200 resolution.
- Kept production pinned to `v1.0.17`.

## 2026-11-04 — Isolated Common areas and Roam installation

- Installed preview bundle `2026.11.04.11` only under `/local/h2dc-preview/`.
- Added the live `media_player.roam_2` mapping to all eight preview views so Media can render Sonos Roam under `Common areas`.
- Cleared Fully Kiosk's browser cache and reloaded `/h2dc-preview/home`.
- Verified the commissioned production resource remains `/local/h2dc/h2dc-dashboard-card.js?v=1.0.17` and its dashboard hash remains `14fe10b827338f81`.
