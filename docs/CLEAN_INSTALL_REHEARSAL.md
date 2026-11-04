# Clean-install and rollback rehearsal

Use this runbook on a disposable Home Assistant dashboard and a tagged H2DC release. It does not authorize a production resource change, kiosk URL change, automation import, or release publication.

## Evidence to capture before starting

- Home Assistant version and browser/tablet viewport.
- HACS version and the exact H2DC release tag under test.
- SHA-256 of `h2dc-dashboard.js` and the matching published checksum.
- Exported candidate Lovelace card configuration with secrets and private URLs redacted.
- Current commissioned dashboard URL and resource version for rollback reference only.

## Clean-install rehearsal

1. Create a new temporary dashboard that is not the Fully Kiosk start URL.
2. Add the tagged H2DC repository to HACS as a **Dashboard** custom repository.
3. Install the selected release and verify that the resource URL is `/hacsfiles/h2dc-dashboard/h2dc-dashboard.js` with type **JavaScript module**.
4. Add one `custom:h2dc-dashboard-card` to the temporary dashboard.
5. Confirm the setup state identifies every required mapping without exposing entity IDs outside the authenticated editor.
6. Map alarm, climate, weather, room temperature, and the five required Energy entities. Add optional rooms, cameras, media players, lights, switches, backgrounds, and Sonora only after the required schema passes.
7. Verify all eight routes at desktop, 1920 by 1200 wall-tablet, portrait-tablet, and phone profiles.
8. Exercise one non-critical light, one dimmer, one switch, Climate Off/Cool, media playback, one medium camera stream, and modal close/focus restoration.
9. Enable reduced motion and confirm that flow direction remains understandable without continuous animation.
10. Reload Home Assistant, clear only the temporary browser cache, and confirm configuration and route state survive.

## Rollback rehearsal

1. Record the candidate release and configuration export, then select the previously installed H2DC release in HACS.
2. Reload the temporary dashboard and verify the previous custom-element version is active.
3. Restore the prior configuration export only if the candidate changed its schema.
4. Confirm that Home Assistant entities, integrations, blueprints, and unrelated automations were not changed by the frontend rollback.
5. Remove the temporary dashboard after evidence is retained. Do not alter the commissioned dashboard or Fully Kiosk start URL.

## Pass criteria

- The installed JavaScript matches the published checksum and provenance.
- No private household identifier exists in the public artifact or default configuration.
- Every route fits its target viewport and all interactions are keyboard and touch operable.
- Missing, unavailable, stale, and invalid telemetry states remain legible and non-actionable where appropriate.
- The prior tagged release and configuration can be restored without entity, integration, automation, or recorder changes.
- Physical Fully Kiosk wake, Sonora stability, camera teardown, and PoE behavior are recorded as separate acceptance gates.

Any failure stops commissioning. Preserve the exact tag, browser console evidence, configuration export, and screenshot; fix and repeat the rehearsal on the temporary dashboard before requesting production approval.
