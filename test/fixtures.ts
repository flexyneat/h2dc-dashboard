import { createDraftConfig } from "../src/config-schema";
import type { H2DCConfig } from "../src/domain";

/** Returns a complete portable configuration fixture with no commissioned household identifiers. */
export function validConfig(): H2DCConfig {
  return createDraftConfig({
    type: "custom:h2dc-dashboard-card",
    entities: {
      alarm: "alarm_control_panel.home",
      climate: "climate.living_room",
      weather: "weather.home",
      room_temperature: "sensor.living_room_temperature",
      energy: {
        freshness: "binary_sensor.energy_fresh",
        grid_connected: "binary_sensor.grid_connected",
        solar: "sensor.solar_power",
        battery_soc: "sensor.battery_soc",
        battery: "sensor.battery_power",
        grid: "sensor.grid_power",
        load: "sensor.home_load",
      },
      media: { primary: "media_player.living_room" },
    },
  });
}
