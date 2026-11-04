# H2DC Security port acceptance matrix

The Security workstream remains isolated from the commissioned dashboard until the operator accepts the complete camera layout and modal behavior. Camera discovery is read-only; enabling a disabled Home Assistant entity is a separate approval-gated action.

| Requirement | Authoritative evidence | Current result | Remaining gate |
|---|---|---|---|
| Show all commissioned cameras | Read-only UniFi Protect device and entity-registry discovery | Nine Protect camera devices confirmed and all nine snapshot/medium pairs staged in the local private candidate | Enable the medium entities only after approval, then validate the isolated preview |
| No-scroll 1920×1200 overview | Three-column Security grid and bounded camera tiles | Exact private candidate renders all nine tiles at approximately 456.8×260.8 px in a 3-by-3 grid; document and viewport are exactly 1920×1200 with no overflow | Render and inspect the physical tablet viewport |
| Snapshot and playback separation | `CameraEntity.entity` for the tile; `CameraEntity.mediumStreamEntity` for modal playback | Implemented without installation-specific defaults; installation-specific mappings exist only in the local private candidate | Validate the approved preview mappings after entity enablement |
| Medium stream only | Explicit medium-stream field; no high-resolution fallback path | Regression coverage proves a missing medium mapping cannot open playback | Enable and validate the nine medium entities after approval |
| One stream at a time | One native modal and one image request source | Exact candidate opened Entrance with only `/api/camera_proxy_stream/camera.entrance_medium_resolution_channel`; no high stream was requested | Confirm real Protect network behavior in the preview |
| Release playback on close | Native dialog close handler removes the stream `src` | Browser acceptance confirmed the dialog closed with zero populated stream images | Confirm the Protect session/request ends on the tablet |
| Keyboard and focus lifecycle | Native dialog, Escape dismissal and trigger-focus restoration | Browser acceptance confirmed focus returned to the Entrance trigger after close | Exercise Escape and physical touch in Fully Kiosk |
| Unavailable/stale handling | Explicit offline snapshot and unavailable medium-stream messages | Implemented without inventing a fallback feed | Validate real entity recovery behavior |
| Reduced motion | Security modal introduces no required animation | Static path implemented | Verify Fully Kiosk media-query behavior |
| Production remains unchanged | No dashboard, entity or camera mutation in this workstream | Confirmed | Re-read immediately before and after any approved preview registration |

## Commissioning fact

All nine exact medium-resolution UniFi Protect camera entities exist in the Home Assistant entity registry, but each is currently disabled by the integration. The public package deliberately does not embed those household-specific entity IDs. Enabling them and placing them in the preview configuration requires explicit operator approval.

## Stream invariant

The modal may derive an authenticated same-origin `/api/camera_proxy_stream/` request only from the selected configured medium entity's signed camera picture path. If that signed medium path is absent, malformed, cross-origin or unavailable, the modal shows an unavailable message and never substitutes the snapshot/high-resolution entity.
