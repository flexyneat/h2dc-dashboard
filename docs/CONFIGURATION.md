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
