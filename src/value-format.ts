/**
 * @fileoverview Shared adaptive-precision formatting for H2DC telemetry.
 */

import { readEntity, readNumericState, type HassEntity, type HomeAssistant } from "./home-assistant";

const WHOLE_NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const FRACTIONAL_NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a finite numeric value without inventing fractional precision.
 *
 * @param value - Finite telemetry or configuration value.
 * @returns Locale-aware text: integers stay whole and fractional values use two decimal places.
 */
export function formatDecimal(value: number): string {
  // Normalize negative zero because it is a computation artifact, not meaningful telemetry.
  const normalized = Object.is(value, -0) ? 0 : value;
  return Number.isInteger(normalized)
    ? WHOLE_NUMBER_FORMAT.format(normalized)
    : FRACTIONAL_NUMBER_FORMAT.format(normalized);
}

/**
 * Formats a numeric Home Assistant state with adaptive precision.
 *
 * @param hass - Minimal Home Assistant state boundary.
 * @param entityId - Entity whose state is expected to be numeric.
 * @param fallback - Text shown when the entity is missing or non-numeric.
 * @returns Adaptive-precision text or the explicit fallback.
 */
export function formatNumericState(hass: HomeAssistant, entityId: string | undefined, fallback = "—"): string {
  if (entityId === undefined || entityId === "") return fallback;
  const reading = readNumericState(hass, entityId);
  return reading.status === "available" ? formatDecimal(reading.value) : fallback;
}

/**
 * Formats a finite numeric entity state together with its Home Assistant unit.
 *
 * @param hass - Minimal Home Assistant state boundary.
 * @param entityId - Entity whose state and unit should be rendered.
 * @param fallback - Text shown when the entity is missing or non-numeric.
 * @returns Adaptive-precision value and unit, or the explicit fallback.
 */
export function formatNumericEntity(hass: HomeAssistant, entityId: string | undefined, fallback = "Unavailable"): string {
  if (entityId === undefined || entityId === "") return fallback;
  const reading = readNumericState(hass, entityId);
  if (reading.status === "unavailable") return fallback;
  const entity = readEntity(hass, entityId);
  if (entity.status === "unavailable") return fallback;
  const unit = entity.entity.attributes.unit_of_measurement;
  return `${formatDecimal(reading.value)}${typeof unit === "string" && unit !== "" ? ` ${unit}` : ""}`;
}

/**
 * Formats one finite numeric entity attribute with adaptive precision.
 *
 * @param entity - Optional Home Assistant entity containing the attribute.
 * @param name - Attribute key to read.
 * @param fallback - Text shown when the attribute is missing or non-numeric.
 * @returns Adaptive-precision attribute text or the explicit fallback.
 */
export function formatNumericAttribute(entity: HassEntity | undefined, name: string, fallback = "—"): string {
  const rawValue = entity?.attributes[name];
  // Reject absent and empty attributes before numeric coercion so missing telemetry never appears as 0.00.
  if ((typeof rawValue !== "number" && typeof rawValue !== "string") || (typeof rawValue === "string" && rawValue.trim() === "")) return fallback;
  const value = Number(rawValue);
  return Number.isFinite(value) ? formatDecimal(value) : fallback;
}
