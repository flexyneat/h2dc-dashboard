# Commissioned-card migration

1. Export the current storage-dashboard JSON and preserve the local JavaScript resource.
2. Convert every compatibility default into explicit card configuration. Do not infer or rename entity IDs.
3. Keep the HACS/pre-release JavaScript out of Home Assistant's global resource registry until its standalone artifact and registration-isolation tests pass.
4. Test the standalone preview bundle in an offline browser fixture first. If an HA preview is later approved, add only the preview artifact, whose sole element is `custom:h2dc-dashboard-preview`.
5. Compare all eight views at 1920×1200 and verify that rendering causes no service calls.
6. Exercise keyboard, touch, reduced-motion, unavailable-entity, and stale-telemetry paths.
7. Change only the production Lovelace resource URL after parity passes.
8. Clear the Fully Kiosk cache, restart its browser, and repeat visual/interaction acceptance.
9. Retain the previous `/local/` file and resource record for one release cycle.

The preview bundle and public bundle are independent, self-contained outputs. The preview bundle must never register `h2dc-dashboard-card`, its editor, or custom-card picker metadata. The supported public element remains `custom:h2dc-dashboard-card`.

Rollback changes only the Lovelace resource URL back to the frozen local asset.
