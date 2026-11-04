# H2DC Energy port acceptance matrix

This matrix keeps design approval, isolated implementation acceptance, live Home Assistant validation and production cutover as separate gates. A passing unit test does not substitute for physical-tablet or live-recorder evidence.

| Requirement | Authoritative evidence | Current result | Remaining gate |
|---|---|---|---|
| Preserve complete PowerFlo entity contract | `src/domain.ts`, `src/powerflo-adapter.ts`, exhaustive adapter tests, installed PowerFlo 0.5.0 fixture and live preview | Proven offline and live: MPPT, battery, grid, protected-load, thermal, history, readiness and forecast surfaces resolve | Physical interaction acceptance |
| Preserve complete PowerFlo option contract | `src/powerflo-config.ts`, `src/powerflo-adapter.ts`, exhaustive adapter tests, installed PowerFlo 0.5.0 fixture and live preview | Proven offline and live for identity, ratings, reserve, charge target, forecast source, readiness and Recorder-backed options | Physical interaction acceptance |
| Preserve both battery estimates | Distinct target/reserve forwarding tests and live Complete PowerFlo battery surface | Proven live: `To 95%` and `To full` remain distinct and both currently report `Target reached` at 100% SOC | Revalidate timed values during a future non-target charge/discharge state |
| Live read-only Modbus telemetry | Adapter passes only validated entity IDs and `hass`; no service calls; read-only Home Assistant state read-back | Proven live in preview. At 12:11 Africa/Lagos, PV, battery, load and relay channels were updating within seconds; Complete PowerFlo rendered 0.95 kW PV, 100% SOC, 0.05 kW charging, 1.05 kW protected load and connected grid relay | Physical interaction acceptance |
| Required PowerFlo status role | Explicit inverter-status entity when commissioned; otherwise an H2DC-only immutable projection of the freshness entity | Live preview reports `Online · On-grid`. No independent operating-status entity exists; the adapter derives only availability text from the freshness entity and never creates a helper or claims an inverter mode | Observe a natural stale transition without changing hardware |
| Stale telemetry stops flow | `test/power-flow.test.ts` and offline stale fixture | Proven offline | Verify against live freshness transition without changing hardware |
| Approved H2DC visual language | Approved mockup, exact candidate fixture and authenticated live preview | Implemented and visually inspected with live telemetry; Deye image completed at 1024×1536 and the day background resolved to the configured asset | Verify through physical tablet interaction |
| No-scroll wall-tablet composition | Installed candidate measured at exact 1920×1200 | Live document and card measured 1920×1200; Complete PowerFlo dialog measured 1286×950 with no overflow | Verify through physical tablet interaction |
| Node-specific extended detail | Native Solar, Battery, Grid, Load, Inverter, History, Readiness and complete-analysis triggers | Proven live in the isolated preview: all seven focused surfaces render distinct telemetry and only Complete PowerFlo opens the embedded application | Validate physical touch in Fully Kiosk |
| Battery flow direction | Signed battery power, installation polarity, renderer path tests and live telemetry read-back | Discharge proven as Battery → inverter → home; charge reverses. The live positive battery value represented discharge while SOC declined from 49% to 30% over the sampled Recorder window | Verify the live animation visually in the isolated preview |
| Grid availability authority | Commissioned `grid_connected` relay register only; `1.0` connected, `0.0` disconnected; voltage fallback disabled | Semantics confirmed by operator breaker tests, covered by domain tests and read back live as `0.0`/disconnected with grid power at 0 W | Validate live rendering in isolated preview |
| Grid history and outage evidence | Recorder relay, power and voltage series in Grid modal | 2 Nov deliberate breaker operations visible from 12:04; telemetry resumed at 12:50. Current raw Recorder history is available for grid power | Validate the rendered Grid graph in the isolated preview |
| History, readiness, preparedness, simulator and insights | Complete PowerFlo card embedded rather than reimplemented and retained across HA rerenders; read-only Recorder/statistics queries | Proven live: solar outlook/weather context, Grid insights, both estimate families and accuracy collection, preparedness, what-if simulator, system insights, MPPT diagnostics, supply mix, data quality, history, daily/lifetime snapshots and outage evidence all render; no controls write to HA | Physical touch acceptance |
| Solar outlook and forecast sources | Complete source/options forwarding plus read-only Forecast.Solar entity discovery | Contract preserved. `sensor.power_production_now` exists and reports the live scalar Forecast.Solar power required by PowerFlo; the commissioned Energy source ID remains `01M59QQM503Q0A4RDRNSZZY79Q` | Verify forecast presentation and update cadence in the isolated preview |
| Estimate accuracy history | Accuracy settings and storage key forwarded | Contract preserved | Verify persisted sessions and error metrics live |
| Responsive states | Installed live candidate measured at 1920×1200 and 800×1280 | Card width matched both viewports; Complete PowerFlo dialog measured 1286×950 at tablet size and 750×950 at compact size without horizontal dialog overflow | Verify physical Fully Kiosk viewport |
| Reduced-motion state | Renderer/style regression tests plus browser emulation against the exact private candidate | `prefers-reduced-motion: reduce` leaves the complete topology readable with zero `flow-arrow` or `animateMotion` nodes and no overflow | Verify tablet WebView media-query behavior |
| Keyboard and touch operation | Native buttons/dialog tested with keyboard activation, Escape dismissal and trigger focus restoration | Keyboard and rapid close/reopen behavior proven live. Preview `2026.11.03.6` preserves Battery and Complete PowerFlo selections during immediate switching and restores focus to the current Complete PowerFlo trigger after Escape | Physical touch acceptance in Fully Kiosk |
| Preview cannot claim production tag | `test/registration-isolation.test.ts` and independent bundles | Proven offline | Register only isolated preview after approval |
| Commissioned dashboard unchanged | Current production dashboard hash and resource | Proven after preview `2026.11.03.5`: production hash remains `14fe10b827338f81` on v1.0.17 | Re-read immediately before any final cutover |

## Gate order

1. Operator approved Energy mockup v2 with the corrected upward battery-discharge arrow and relay-first Grid modal.
2. Implement the approved shell around the complete embedded PowerFlo card in the isolated preview bundle.
3. Repeat unit, build, distribution-isolation, responsive, reduced-motion, stale and unavailable-state tests.
4. Obtain explicit permission to register only `custom:h2dc-dashboard-preview` in Home Assistant.
5. Validate live entity mappings, freshness, Recorder statistics, forecasts, both estimates, touch and keyboard behavior in a temporary dashboard.
6. Obtain explicit final visual and interaction acceptance before changing the commissioned production resource.

## Rollback invariant

The commissioned dashboard remains on `/local/h2dc/h2dc-dashboard-card.js?v=1.0.17` until the final gate passes. Preview registration must never define `h2dc-dashboard-card`, alter production Lovelace configuration, or invoke Home Assistant services.
