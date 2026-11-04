import type { H2DCConfig } from "./domain";
import { readEntity, type HomeAssistant } from "./home-assistant";

/** Supported contextual Home states ordered separately from their runtime priority. */
export type HomeContextKind = "standard" | "alarm" | "outage" | "away" | "media-active" | "morning" | "evening" | "night";

/** Stable contextual emphasis projected into Home copy without changing card positions. */
export interface HomeContext {
  readonly kind: HomeContextKind;
  readonly eyebrow: string;
}

/** Returns true only when every configured room occupancy source is available and clear. */
function isVerifiedAway(config: H2DCConfig, hass: HomeAssistant): boolean {
  const occupancy = config.rooms.flatMap((room) => room.occupancy);
  if (occupancy.length === 0) return false;
  return occupancy.every((entityId) => {
    const reading = readEntity(hass, entityId);
    return reading.status === "available" && ["off", "clear", "not_home"].includes(reading.entity.state);
  });
}

/** Resolves deterministic Home emphasis using explicit signals and a fixed safety-first priority. */
export function resolveHomeContext(config: H2DCConfig, hass: HomeAssistant, now: Date): HomeContext {
  if (!config.presentation.contextualHome) return { kind: "standard", eyebrow: "Home overview" };
  const alarm = readEntity(hass, config.entities.alarm);
  const alarmState = alarm.status === "available" ? alarm.entity.state : "unknown";
  if (!["disarmed", "unknown", "unavailable"].includes(alarmState)) return { kind: "alarm", eyebrow: "Security attention" };
  const gridRelayId = config.entities.energy.gridConnected;
  if (gridRelayId !== undefined) {
    const relay = readEntity(hass, gridRelayId);
    // Match the Energy boundary's explicit binary/numeric relay vocabulary; voltage never substitutes for availability.
    const relayState = relay.status === "available" ? relay.entity.state.trim().toLowerCase() : "unknown";
    if (["off", "false", "0", "0.0", "disconnected"].includes(relayState)) return { kind: "outage", eyebrow: "Backup power active" };
  }
  if (isVerifiedAway(config, hass)) return { kind: "away", eyebrow: "Home while away" };
  const mediaEntities = Object.values(config.entities.media).filter((entityId): entityId is string => entityId !== undefined);
  const mediaActive = mediaEntities.some((entityId) => {
    const reading = readEntity(hass, entityId);
    return reading.status === "available" && ["playing", "buffering"].includes(reading.entity.state);
  });
  if (mediaActive) return { kind: "media-active", eyebrow: "Now playing at home" };
  const sun = hass.states["sun.sun"]?.state;
  const hour = now.getHours();
  if (sun === "below_horizon" && (hour >= 22 || hour < 5)) return { kind: "night", eyebrow: "Night overview" };
  if (hour >= 17 && hour < 22) return { kind: "evening", eyebrow: "Evening overview" };
  if (hour >= 5 && hour < 11) return { kind: "morning", eyebrow: "Morning overview" };
  return { kind: "standard", eyebrow: "Home overview" };
}
