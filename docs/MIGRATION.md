# Commissioned-card migration

1. Export the current storage-dashboard JSON and preserve the local JavaScript resource.
2. Convert every compatibility default into explicit card configuration. Do not infer or rename entity IDs.
3. Install the HACS pre-release without removing the local resource.
4. Create a temporary dashboard whose cards use the HACS resource and the explicit entity map.
5. Compare all eight views at 1920×1200 and verify that rendering causes no service calls.
6. Exercise keyboard, touch, reduced-motion, unavailable-entity, and stale-telemetry paths.
7. Change only the production Lovelace resource URL after parity passes.
8. Clear the Fully Kiosk cache, restart its browser, and repeat visual/interaction acceptance.
9. Retain the previous `/local/` file and resource record for one release cycle.

The temporary preview can use a distinct custom-element alias so Home Assistant may load the commissioned and candidate resources concurrently. Remove that alias from the public release after cutover; the supported public element remains `custom:h2dc-dashboard-card`.

Rollback changes only the Lovelace resource URL back to the frozen local asset.
