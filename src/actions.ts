import { isEntityId, isRecord } from "./config-schema";
import type { HassServiceData, HomeAssistant } from "./home-assistant";

/** Explicit user actions supported by the dashboard. */
export type DashboardAction =
  | { readonly type: "toggle"; readonly entityId: string }
  | { readonly type: "set_climate_temperature"; readonly entityId: string; readonly temperature: number }
  | { readonly type: "set_climate_mode"; readonly entityId: string; readonly mode: "cool" | "off" }
  | { readonly type: "set_light_brightness"; readonly entityId: string; readonly brightnessPercent: number }
  | { readonly type: "media"; readonly entityId: string; readonly command: "media_play_pause" | "media_pause" | "media_previous_track" | "media_next_track" }
  | { readonly type: "alarm"; readonly entityId: string; readonly command: "alarm_arm_home" | "alarm_arm_away" | "alarm_arm_night" }
  | { readonly type: "alarm_disarm"; readonly entityId: string; readonly code: string }
  | { readonly type: "poe_toggle"; readonly entityId: string; readonly allowedEntityId: string };

/** Constrains a numeric service value to a safe inclusive range. */
function bounded(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Maps a validated interaction to one explicit Home Assistant service call. */
export async function dispatchDashboardAction(hass: HomeAssistant, input: unknown): Promise<unknown> {
  if (!isRecord(input) || !isEntityId(input.entityId) || typeof input.type !== "string") throw new Error("Action requires a valid type and entity ID");
  const entityId = input.entityId;
  switch (input.type) {
    case "toggle": {
      const domain = entityId.split(".")[0];
      if (domain !== "light" && domain !== "switch") throw new Error("Toggle supports only light and switch entities");
      return hass.callService(domain, "toggle", { entity_id: entityId });
    }
    case "set_climate_temperature": {
      if (!isEntityId(entityId, "climate")) throw new Error("Temperature action requires a climate entity");
      if (typeof input.temperature !== "number" || !Number.isFinite(input.temperature)) throw new Error("Temperature action requires a finite value");
      return hass.callService("climate", "set_temperature", { entity_id: entityId, temperature: bounded(input.temperature, 5, 35) });
    }
    case "set_climate_mode": {
      if (!isEntityId(entityId, "climate")) throw new Error("Climate mode action requires a climate entity");
      if (input.mode !== "cool" && input.mode !== "off") throw new Error("Climate mode must be cool or off");
      const data: HassServiceData = input.mode === "cool"
        ? { entity_id: entityId, hvac_mode: "cool" }
        : { entity_id: entityId };
      return hass.callService("climate", input.mode === "cool" ? "set_hvac_mode" : "turn_off", data);
    }
    case "set_light_brightness": {
      if (!isEntityId(entityId, "light")) throw new Error("Brightness action requires a light entity");
      if (typeof input.brightnessPercent !== "number" || !Number.isFinite(input.brightnessPercent)) throw new Error("Brightness action requires a finite value");
      return hass.callService("light", "turn_on", { entity_id: entityId, brightness_pct: bounded(Math.round(input.brightnessPercent), 1, 100) });
    }
    case "media": {
      if (!isEntityId(entityId, "media_player")) throw new Error("Media action requires a media_player entity");
      const commands = ["media_play_pause", "media_pause", "media_previous_track", "media_next_track"] as const;
      const command = commands.find((candidate) => candidate === input.command);
      if (command === undefined) throw new Error("Unsupported media command");
      return hass.callService("media_player", command, { entity_id: entityId });
    }
    case "alarm": {
      if (!isEntityId(entityId, "alarm_control_panel")) throw new Error("Alarm action requires an alarm_control_panel entity");
      const commands = ["alarm_arm_home", "alarm_arm_away", "alarm_arm_night"] as const;
      const command = commands.find((candidate) => candidate === input.command);
      if (command === undefined) throw new Error("Unsupported alarm command");
      return hass.callService("alarm_control_panel", command, { entity_id: entityId });
    }
    case "alarm_disarm": {
      if (!isEntityId(entityId, "alarm_control_panel")) throw new Error("Alarm disarm requires an alarm_control_panel entity");
      if (typeof input.code !== "string" || !/^\d{1,12}$/u.test(input.code)) throw new Error("Alarm code must contain 1 to 12 digits");
      // Keep the credential in the service boundary only; it is never rendered or logged.
      return hass.callService("alarm_control_panel", "alarm_disarm", { entity_id: entityId, code: input.code });
    }
    case "poe_toggle": {
      if (!isEntityId(input.allowedEntityId, "switch") || entityId !== input.allowedEntityId) throw new Error("PoE action requires the configured switch entity");
      return hass.callService("switch", "toggle", { entity_id: entityId });
    }
    default:
      throw new Error("Unsupported dashboard action");
  }
}
