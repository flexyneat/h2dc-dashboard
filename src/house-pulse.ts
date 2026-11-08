import type { H2DCConfig } from "./domain";
import { readEntity, type HomeAssistant } from "./home-assistant";
import { formatDecimal } from "./value-format";

/** House Pulse categories rendered on the Home view. */
export const HOUSE_PULSE_CATEGORIES = ["access", "presence", "comfort", "attention"] as const;

/** One supported House Pulse category. */
export type HousePulseCategory = (typeof HOUSE_PULSE_CATEGORIES)[number];

/** Normalized state for one configured House Pulse source. */
export interface HousePulseDetailItem {
  readonly label: string;
  readonly icon: string;
  readonly state: "active" | "clear" | "unavailable";
  readonly value: string;
}

/** Complete summary and detail projection for one House Pulse category. */
export interface HousePulseProjection {
  readonly category: HousePulseCategory;
  readonly summary: string;
  readonly title: string;
  readonly description: string;
  readonly items: readonly HousePulseDetailItem[];
}

/** Returns whether an attention source represents a dedicated low-battery signal. */
function isBatteryAlert(entityId: string, icon: string): boolean {
  return entityId.endsWith("_battery_low") || icon.includes("battery");
}

/** Returns whether one available entity is active for its category. */
function isActive(category: HousePulseCategory, state: string): boolean {
  const normalized = state.toLowerCase();
  if (category === "attention") return !["0", "off", "ok", "none", "clear"].includes(normalized);
  if (category === "access") return ["on", "open", "unlocked"].includes(normalized);
  if (category === "presence") return ["on", "home", "occupied", "present"].includes(normalized);
  return true;
}

/** Returns the user-facing title and explanation for one category. */
function categoryCopy(category: HousePulseCategory, batteryOnly: boolean): readonly [string, string] {
  switch (category) {
    case "access": return ["Access", "Live state of the configured doors and locks."];
    case "presence": return ["Presence", "Rooms currently reporting occupancy or presence."];
    case "comfort": return ["Comfort", "Current environmental reading from the configured source."];
    case "attention": return batteryOnly
      ? ["Low batteries", "Devices whose native low-battery signal is active."]
      : ["Attention", "Configured sources that currently need attention."];
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

/** Projects configured Home Assistant entities into one consistent House Pulse state. */
export function projectHousePulse(config: H2DCConfig, hass: HomeAssistant, category: HousePulseCategory): HousePulseProjection {
  const configured = config.entities.housePulse[category];
  const batteryOnly = category === "attention" && configured.length > 0
    && configured.every((item) => isBatteryAlert(item.entity, item.icon));
  const [title, description] = categoryCopy(category, batteryOnly);
  if (configured.length === 0) return { category, title, description, summary: "Not configured", items: [] };

  const items = configured.map((item): HousePulseDetailItem => {
    const reading = readEntity(hass, item.entity);
    if (reading.status === "unavailable") return { label: item.label, icon: item.icon, state: "unavailable", value: "Unavailable" };
    if (category === "comfort") {
      const numericState = Number(reading.entity.state);
      const unit = typeof reading.entity.attributes.unit_of_measurement === "string" ? reading.entity.attributes.unit_of_measurement : "";
      const value = Number.isFinite(numericState) ? `${formatDecimal(numericState)}${unit}` : "Unavailable";
      return { label: item.label, icon: item.icon, state: value === "Unavailable" ? "unavailable" : "active", value };
    }
    const active = isActive(category, reading.entity.state);
    const value = category === "presence"
      ? active ? "Occupied" : "Clear"
      : category === "access"
        ? active ? "Open or unlocked" : "Secure"
        : active ? batteryOnly ? "Battery low" : "Needs attention" : "Clear";
    return { label: item.label, icon: item.icon, state: active ? "active" : "clear", value };
  });

  const unavailable = items.filter((item) => item.state === "unavailable");
  if (category === "comfort" && unavailable.length > 0) {
    return { category, title, description, items, summary: "Comfort telemetry unavailable" };
  }
  if (unavailable.length > 0) {
    return { category, title, description, items, summary: `${unavailable.length} source${unavailable.length === 1 ? "" : "s"} unavailable` };
  }
  if (category === "comfort") {
    const first = items[0];
    return { category, title, description, items, summary: first === undefined ? "Comfort telemetry unavailable" : `${first.label} ${first.value}` };
  }

  const active = items.filter((item) => item.state === "active");
  if (category === "access") return { category, title, description, items, summary: active.length === 0 ? "All secure" : `${active.length} open or unlocked` };
  if (category === "presence") return {
    category,
    title,
    description,
    items,
    summary: active.length === 0 ? "No rooms occupied" : active.length === 1 ? `${active[0]?.label ?? "Room"} occupied` : `${active.length} rooms occupied`,
  };
  return {
    category,
    title,
    description,
    items,
    summary: active.length === 0
      ? batteryOnly ? "No low batteries" : "No issues"
      : active.length === 1
        ? batteryOnly ? `${active[0]?.label ?? "Device"} battery low` : `${active[0]?.label ?? "Item"} needs attention`
        : batteryOnly ? `${active.length} low batteries` : `${active.length} items need attention`,
  };
}
