# H2DC luxury product and HACS roadmap

## Proposed second Home row: House pulse

The unused row should summarize exceptions, not duplicate the four existing navigation cards. The preferred order is:

1. **Access** — open doors/windows, unlocked locks, or “All secure”.
2. **Presence** — occupied rooms and household presence, with privacy-safe labels.
3. **Comfort** — hottest/coldest room and humidity exception, derived from configured sensors.
4. **Attention** — low batteries, unavailable devices, stale telemetry, or “No issues”.

Each item is a navigation summary, not a second control surface. A HACS installation must let the operator map entities, choose the destination view, reorder or hide items, and define normal/attention thresholds. The default public package contains no household entity IDs.

## Ten product improvements

1. **Contextual Home states** — change the information hierarchy for morning, away, evening, night, alarm, outage, and media-active contexts without moving core controls unpredictably.
2. **Guided HACS onboarding** — a visual setup flow validates required entities, shows capability gaps, previews every view, and prevents saving an unusable configuration.
3. **Capability-aware controls** — infer dimming, colour temperature, media artwork, climate modes, camera streams, and energy channels; render only controls that actually work.
4. **Kiosk layout profiles** — ship tested 16:10 wall-tablet, landscape desktop, portrait tablet, and phone profiles with explicit no-scroll acceptance fixtures.
5. **Theme Studio** — configure Aeonik/local fonts, day/night backgrounds, contrast overlays, accent colour, density, and per-view imagery through tokens rather than component edits.
6. **Room model** — define a room once, then project its temperature, occupancy, lights, media, climate, and camera consistently across views and summaries.
7. **Operational diagnostics** — add a privacy-safe health view for stale entities, missing capabilities, camera stream readiness, Fully Kiosk state, and resource-version mismatch.
8. **Resilient media presentation** — provide native HA artwork first, optional Sonora fallback, stable transport controls, and designed unavailable states without cross-origin theme flashing.
9. **Blueprint library** — ship opt-in, selector-driven blueprints for kiosk wake, battery/PoE charging, presence lighting, and safe sensor migration; never embed private entity IDs.
10. **Upgrade-safe HACS delivery** — version config schemas, migrate older configurations, publish signed release artifacts, test clean install and upgrade/rollback, and keep preview and production custom elements isolated.

## Delivery order

1. Versioned configuration schema and guided onboarding.
2. Room model and capability discovery.
3. House pulse row behind an opt-in configuration flag.
4. Kiosk profiles plus accessibility and visual regression fixtures.
5. Theme Studio and background/font packaging.
6. Diagnostics and resilient media.
7. Blueprint library.
8. HACS clean-install, upgrade, rollback, release, and support documentation.

## Acceptance boundaries

- Production remains unchanged until the isolated preview passes physical tablet acceptance.
- Every interaction is keyboard operable and at least 44 by 44 CSS pixels.
- Reduced motion preserves all information and stops continuous decorative movement.
- HACS defaults contain no household identifiers, private URLs, credentials, or commissioned imagery.
- Upgrade tests preserve the previous configuration and expose a documented rollback path.

## Implementation status — 2026-11-04

All ten product foundations are implemented in the isolated HACS package. Contextual Home state selection is deterministic and safety-prioritized; onboarding validates required capabilities before save; controls are capability-aware; tested kiosk profiles and theme tokens drive layout; the room model feeds House Pulse; diagnostics and resilient media expose degraded states; selector-driven blueprints cover wake, PoE charging, presence lighting, and sensor overlap; and the tag workflow verifies, checksums, attests, and packages the standalone public asset.

The software phase is not a production release. Remaining gates are physical FP300/Samsung cutover acceptance, proximity-wake and repeated Sonora navigation acceptance, a clean HACS install, an upgrade/rollback rehearsal, and explicit operator approval for release and production cutover.
