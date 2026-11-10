# Configuration model

Every installation supplies its own entity map. Entity IDs below are examples, not package defaults.

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
  media:
    roam: media_player.roam
  energy:
    freshness: binary_sensor.inverter_fresh
    solar: sensor.solar_power
    battery_soc: sensor.battery_soc
    battery: sensor.battery_power
    grid: sensor.grid_power
    load: sensor.home_load
  ocpp:
    status: sensor.ev_charger_status
    power: sensor.ev_charger_power
    session_energy: sensor.ev_charger_session_energy
    total_energy: sensor.ev_charger_total_energy
    current: sensor.ev_charger_current
    voltage: sensor.ev_charger_voltage
    temperature: sensor.ev_charger_temperature
    session_duration: sensor.ev_charger_session_duration
    transaction_id: sensor.ev_charger_transaction_id
    connector_id: sensor.ev_charger_connector_id
    error_code: sensor.ev_charger_error_code
    session_history: sensor.ev_charger_session_history
    charge_control: switch.ev_charger
    maximum_current: number.ev_charger_maximum_current
    availability: binary_sensor.ev_charger_available
battery_positive_is: discharge
grid_positive_is: import
flow_threshold_w: 40
backgrounds:
  day: /local/h2dc/day.webp
  night: /local/h2dc/night.webp
  per_view:
    security: /local/h2dc/security.webp
presentation:
  accent: oklch(0.78 0.16 78)
  density: comfortable
  font_family: Aeonik Pro
  kiosk_profile: wall_16_10
  contextual_home: true
rooms:
  - id: living-room
    name: Living room
    occupancy:
      - binary_sensor.living_room_occupancy
    temperature: sensor.living_room_temperature
    lights:
      - light.living_room
    media:
      - media_player.living_room
```

Only `/local/`, `/media/`, HTTPS, and `data:image/` background sources are accepted. Executable and insecure URL schemes are rejected at the configuration boundary.

Schema version 2 adds reusable rooms, presentation tokens, contextual Home rules, and House Pulse sources. When contextual Home is enabled, its away state requires every configured room occupancy source to be available and clear; there is no hidden room-selection list. The visual editor accepts the room model as validated JSON so it cannot bypass the same schema boundary used for YAML. Older configurations migrate without deleting unrelated arrays, optional PowerFlo mappings, media settings, diagnostics, or per-view backgrounds.

The Lights view renders the explicitly configured `light.*` entries first and the explicitly configured `switch.*` entries below them. Each section supports up to eight controls so the commissioned 1920 × 1200 kiosk remains scroll-free. Keep this list curated: administrative, camera-analytics, network, PoE, and tablet-management switches should not be exposed as household controls.

## EV Charging with OCPP 1.6J and 2.x

The EV Charging view is an optional projection over normalized entities from a compatible Home Assistant OCPP integration. It is hidden until `entities.ocpp.status` is mapped or the explicit read-only simulator is enabled, so installations without a charger keep the existing navigation and layout by default. H2DC does not act as an OCPP Central System and does not invent unsupported charger telemetry.

For sales, layout and training previews without hardware, enable **EV Charging → Simulation mode** in the visual editor or set `ev_charging_demo: true` on the card. The simulator is visibly labelled, never maps `charge_control`, and never calls a Home Assistant service. Disable it before commissioning a real charger.

Configure the charger to connect to the selected OCPP central-system integration first. After the integration creates its Home Assistant entities, map only the entities it actually exposes in the visual editor. The minimum useful mapping is `status`; power, session energy, current, voltage, temperature, transaction ID and session history remain independently optional. The adapter accepts OCPP 1.6J, 2.0.1 and 2.1 lifecycle terminology at this entity boundary; protocol negotiation and message handling remain the responsibility of the central-system integration. Unsupported measurands render as unavailable rather than zero.

The first release supports one connector and an optional allowlisted `switch` for start/stop control. Session history is accepted from a mapped entity attribute named `sessions` or `recent_sessions`; each record may contain `id` or `transaction_id`, `started_at`, `stopped_at`, `energy_kwh`, `duration_minutes`, and `stop_reason`. Equivalent camel-case keys are accepted. This keeps the dashboard adapter portable while allowing a helper or future recorder-backed companion integration to provide durable history.

The isolated `custom:h2dc-dashboard-preview` artifact also accepts the legacy alias `preview_ev_charging_demo: true`. Both custom elements use the same deterministic, local-only sample telemetry when simulation is explicitly enabled. With simulation disabled, the EV Charging route still requires a real `entities.ocpp.status` mapping and contains no fabricated live values.

Because the charger model is not yet known, commissioning must verify its exact OCPP URL format, connector ID, authorization behavior, supported measurands, remote-start policy and current-limit support on the physical unit. Do not expose the OCPP WebSocket endpoint to the public internet without TLS, authentication and a deliberately scoped network policy.

## Sonora reverse-proxy headers

The embedded Sonora page requires its existing `frame-ancestors` allowance. H2DC's optional album-art fallback also reads Sonora's `/api/state`, so the Sonora router must return an exact-origin CORS header for the Home Assistant origin. Attach this middleware only to the Sonora router, not to the global default-header chain:

```yaml
http:
  middlewares:
    sonora-cors:
      headers:
        accessControlAllowMethods:
          - GET
          - OPTIONS
        accessControlAllowHeaders:
          - Content-Type
        accessControlAllowOriginList:
          - "https://home-assistant.example.com"
        accessControlMaxAge: 600
        addVaryHeader: true
```

Reference it as `sonora-cors@file` on the Sonora router. Do not use `*`: the dashboard has one known origin and the narrower policy is easier to audit. CORS permits the read-only artwork lookup; it does not grant iframe embedding, which remains governed separately by Content Security Policy.

## Complete PowerFlo Energy configuration

The Energy view composes the installed `custom:powerflo-card` rather than duplicating a reduced subset. Install and register PowerFlo 0.5.0 or a compatible newer release before enabling the H2DC Energy view. H2DC forwards only validated, read-only configuration and the normal Home Assistant state object; it never invokes an inverter service.

`entities.energy.freshness`, `solar`, `battery_soc`, `battery`, `grid`, and `load` are required. The freshness entity must be a `binary_sensor`. Optional mappings cover inverter/grid state, three MPPT channels, voltage/current/temperature diagnostics, daily and lifetime counters, BMS limits, forecast power, and verified standby power. The visual editor exposes every supported mapping.

```yaml
powerflo:
  title: Home energy
  inverter_name: My inverter
  inverter_model: My model
  inverter_capacity_kw: 12
  battery_capacity_kwh: 16
  solar_capacity_kw: 10.54
  battery_reserve_soc: 20
  battery_charge_target_soc: 100
  density: standard
  readiness_enabled: true
  preparedness_enabled: true
  solar_outlook_enabled: true
  estimate_accuracy_enabled: true
  grid_status_fallback: false
  statistics:
    solar: sensor.solar_energy_total
    grid: sensor.grid_import_total
    load: sensor.load_energy_total
    battery: sensor.battery_discharge_total
  solar_forecast_sources: []
```

The target and full estimates are independent: `battery_charge_target_soc` controls the configured goal, while PowerFlo always retains its separate 100% projection. `battery_reserve_soc` is the runtime reserve and is never an inverter command.

PowerFlo inverter images accept `/local/`, `/api/image/serve/`, or embedded PNG/JPEG/WebP data URLs. Remote URLs, SVG, and executable image sources are rejected. `powerflo.flow_release_w` must not exceed the top-level `flow_threshold_w`.
