# Preview acceptance record

## 2026-11-02 tablet parity gate

The distributable renderer was installed as a separate admin-only `h2dc-preview` dashboard and a separate `custom:h2dc-dashboard-preview` element. The commissioned `/dashboard-h2dc` dashboard and `/local/h2dc/h2dc-dashboard-card.js?v=1.0.17` resource were not replaced.

Verified on the Samsung Fully Kiosk tablet at its native 1920×1200 viewport:

- Home: compact Climate control remains inside its card; the clock, photographic weather treatment, centered energy topology, Nearby Controls, and all four bottom navigation cards remain in bounds.
- Security: alarm actions and the 3×2 live camera grid remain above the fold.
- Energy: battery health, centered live topology, and current-day metrics remain in bounds.
- Climate: room readings, thermostat controls, and outdoor conditions render without overlap.
- Lights: eight configured controls form a 4×2 grid; brightness sliders appear only for capable entities and active lights use the state treatment.
- Media: room groups, now-playing state, and quick controls remain legible and bounded.
- Sonos: the safe direct-controller handoff renders without a nested iframe or theme loop.
- System: tablet, charging, screen, current-page, PoE state, and PoE draw diagnostics render read-only.

The final Home evidence is retained outside the public package as `H2DC-Preview-Home-Tablet-1920x1200.png`, SHA-256 `5fbbc35a185ed684dfc76120259f8778f269bcb03a4a862d6d38ed72a5e239a6`. After acceptance capture, Fully Kiosk was returned to the commissioned H2DC Home route with its screen off. No climate, light, alarm, media, PoE, or charging automation action was exercised during visual testing.

## Remaining acceptance and release gates

This record proves visual-layout parity only. Before a production cutover, exercise and record keyboard navigation, touch controls, reduced-motion behavior, unavailable entities, stale telemetry, and rollback against a non-production entity set. The preview is a migration candidate, not a public release. A remote repository, semantic version tag, GitHub release asset, and HACS submission require explicit operator authorization. The temporary `h2dc-dashboard-preview` alias is test-only and should be removed from the public release build after the production resource cutover is accepted.
