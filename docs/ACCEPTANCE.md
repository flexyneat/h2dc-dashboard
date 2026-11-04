# Preview acceptance record

## Isolation boundary

The commissioned dashboard remains pinned to `/local/h2dc/h2dc-dashboard-card.js?v=1.0.17`. The current candidate is registered only as `/local/h2dc-preview/h2dc-dashboard-preview.js?v=2026.11.04.7` and defines only `h2dc-dashboard-preview`.

Automated distribution tests import both standalone artifacts and prove the preview cannot register the production card, editor, or picker metadata. The earlier colliding preview resource was removed; it is not an accepted migration path.

## Accepted candidate behavior

The isolated candidate has passed the following software and physical checks without replacing the commissioned production resource:

- Home retains its single primary date heading, compact Climate control, photographic weather treatment, centered live power topology, Nearby Controls, four navigation summaries, and the contextual Access, Presence, Comfort, and Attention row.
- Energy composes the complete PowerFlo experience, including live topology, MPPT readings, both battery estimates, relay-backed grid evidence, load history, preparedness, simulator, insights, and solar outlook.
- Security uses a bounded 3×3 camera grid, separate snapshot and medium-stream mappings, one accessible live-view modal, and a split alarm/keypad column.
- Climate, Lights, Media, Sonos, and System use concise semantic page headings with a high-contrast H3-like visual treatment; the large date remains Home-only.
- Lights separate curated lights from switches, make the card body the primary toggle target, preserve independent brightness sliders, and render whole values without a trailing `.00`.
- Media uses native Home Assistant artwork first and the exact-origin Sonora state endpoint only as a fallback.
- Sonora retains the H2DC navigation shell, preserves the connected iframe across normal Home Assistant updates, and masks its startup until the installed H2DC theme is ready.
- Numeric formatting preserves whole values and limits genuine fractional readings to two decimal places.
- Reduced-motion mode stops decorative flow motion while retaining static paths, readings, direction labels, and complete keyboard/touch interaction.

## Verified packaging gates

- `hacs.json` is root-level and selects the single `dist/h2dc-dashboard.js` dashboard artifact, consistent with current HACS plugin repository rules.
- The official HACS validator runs with `category: plugin` on pushes, pull requests, a daily schedule, and manual dispatch; its action reference is pinned to an immutable commit.
- The public and preview bundles are self-contained and have no shared runtime dependency.
- A deterministic pre-release verifier rejects the wrong HACS filename, root-layout drift, an empty artifact, a missing production registration, or preview registration leakage, then prints the public artifact's SHA-256 digest.
- The release workflow verifies the tag against `package.json`, runs the complete verification suite, publishes only the public artifact, creates a SHA-256 manifest, and requests GitHub build-provenance attestation.
- Household identifiers, hostnames, credentials, and private images are excluded from distributable defaults.

## Remaining acceptance gates

1. Wake the FP300 with one physical button press, read back high sensitivity and a two-second PIR interval, confirm fresh PIR/occupancy events, and pass three touch-free sleep/approach cycles.
2. Keep the Samsung sensor in the living room until the FP300-only gate passes; after physical relocation, commission and validate the stairwell cutover using the recorded rollback hashes.
3. Repeat rapid Media/Home-to-Sonos navigation and a multi-minute idle test on the tablet, confirming the default Sonora skin never becomes visible and H2DC navigation remains available.
4. Perform a clean HACS install from a release artifact in a disposable dashboard, followed by one upgrade and one rollback rehearsal.
5. Obtain explicit operator approval before replacing the frozen production resource, committing a release batch, tagging, pushing, publishing a release, or submitting to HACS.

The candidate remains a preview. Passing automated checks does not constitute physical wake acceptance, production cutover, or public release approval.
