# Configuration model

Every installation supplies its own entity map. Entity IDs below are examples, not package defaults.

```yaml
type: custom:h2dc-dashboard-card
view: home
config_version: 1
dashboard_path: /wall
entities:
  alarm: alarm_control_panel.house
  climate: climate.living_room
  weather: weather.home
  room_temperature: sensor.living_room_temperature
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
```

Only `/local/`, `/media/`, HTTPS, and `data:image/` background sources are accepted. Executable and insecure URL schemes are rejected at the configuration boundary.
