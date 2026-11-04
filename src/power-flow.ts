import type { EnergyEntities, H2DCConfig } from "./domain";
import { readEntity, readNumericState, type HomeAssistant, type NumericReading } from "./home-assistant";
import { formatDecimal } from "./value-format";

/** Direction represented by one branch of the H2DC topology. */
export type FlowDirection = "source" | "sink" | "idle" | "unavailable";

/** Telemetry freshness is modelled separately from individual entity availability. */
export type TelemetryFreshness = "fresh" | "stale" | "unavailable";

/** Authoritative grid-supply state read only from a dedicated relay entity. */
export type GridAvailability = "available" | "unavailable" | "unknown";

/** Complete, renderable state of the Home energy topology. */
export interface PowerFlowState {
  readonly freshness: TelemetryFreshness;
  readonly gridAvailability: GridAvailability;
  readonly solar: FlowDirection;
  readonly battery: FlowDirection;
  readonly grid: FlowDirection;
  readonly load: FlowDirection;
  readonly solarPower: NumericReading;
  readonly batteryPower: NumericReading;
  readonly gridPower: NumericReading;
  readonly loadPower: NumericReading;
  readonly batterySoc: NumericReading;
  readonly summary: string;
}

/**
 * Reads the dedicated grid relay without inferring availability from voltage or power.
 * A missing, stale, or non-binary entity deliberately remains unknown.
 */
export function deriveGridAvailability(hass: HomeAssistant, entities: EnergyEntities): GridAvailability {
  if (entities.gridConnected === undefined || entities.gridConnected === "") return "unknown";
  const reading = readEntity(hass, entities.gridConnected);
  if (reading.status === "unavailable") return "unknown";
  const normalized = reading.entity.state.trim().toLowerCase();
  if (normalized === "on" || normalized === "true" || normalized === "1" || normalized === "1.0") return "available";
  if (normalized === "off" || normalized === "false" || normalized === "0" || normalized === "0.0") return "unavailable";
  return "unknown";
}

/** Returns source/sink direction after applying an installation polarity convention. */
function signedDirection(value: NumericReading, threshold: number, positiveDirection: Exclude<FlowDirection, "idle" | "unavailable">): FlowDirection {
  if (value.status === "unavailable") return "unavailable";
  if (Math.abs(value.value) < threshold) return "idle";
  if (value.value > 0) return positiveDirection;
  return positiveDirection === "source" ? "sink" : "source";
}

/** Returns a positive-only producer/consumer direction. */
function positiveDirection(value: NumericReading, threshold: number, direction: "source" | "sink"): FlowDirection {
  if (value.status === "unavailable") return "unavailable";
  return value.value >= threshold ? direction : "idle";
}

/** Derives telemetry freshness from an optional binary freshness entity. */
function freshnessState(hass: HomeAssistant, entities: EnergyEntities): TelemetryFreshness {
  if (entities.freshness === undefined) return "fresh";
  const reading = readEntity(hass, entities.freshness);
  if (reading.status === "unavailable") return "unavailable";
  return reading.entity.state === "on" ? "fresh" : "stale";
}

/** Builds a truthful topology summary from active sources and destinations. */
function flowSummary(freshness: TelemetryFreshness, solar: FlowDirection, battery: FlowDirection, grid: FlowDirection, load: FlowDirection): string {
  if (freshness === "stale") return "Telemetry stale";
  if (freshness === "unavailable") return "Telemetry freshness unavailable";
  const sources = [solar === "source" ? "Solar" : "", battery === "source" ? "battery" : "", grid === "source" ? "grid" : ""].filter(Boolean);
  const sinks = [load === "sink" ? "home" : "", battery === "sink" ? "battery" : "", grid === "sink" ? "grid" : ""].filter(Boolean);
  if (sources.length === 0 || sinks.length === 0) return "Power flow idle";
  return `${sources.join(" + ")} → ${sinks.join(" + ")}`;
}

/** Derives the live H2DC power topology from signed Home Assistant telemetry. */
export function derivePowerFlow(hass: HomeAssistant, config: H2DCConfig): PowerFlowState {
  const entities = config.entities.energy;
  const freshness = freshnessState(hass, entities);
  const gridAvailability = deriveGridAvailability(hass, entities);
  const solarPower = readNumericState(hass, entities.solar);
  const batteryPower = readNumericState(hass, entities.battery);
  const gridPower = readNumericState(hass, entities.grid);
  const loadPower = readNumericState(hass, entities.load);
  const batterySoc = readNumericState(hass, entities.batterySoc);
  if (freshness !== "fresh") {
    return {
      freshness,
      gridAvailability,
      solar: "idle",
      battery: "idle",
      grid: "idle",
      load: "idle",
      solarPower,
      batteryPower,
      gridPower,
      loadPower,
      batterySoc,
      summary: freshness === "stale" ? "Telemetry stale" : "Telemetry freshness unavailable",
    };
  }
  const solar = positiveDirection(solarPower, config.flowThresholdW, "source");
  const batteryPositive = config.batteryPositiveIs === "discharge" ? "source" : "sink";
  const gridPositive = config.gridPositiveIs === "import" ? "source" : "sink";
  const battery = signedDirection(batteryPower, config.flowThresholdW, batteryPositive);
  // A confirmed-open relay suppresses stale or residual grid-power readings.
  const grid = gridAvailability === "unavailable" ? "idle" : signedDirection(gridPower, config.flowThresholdW, gridPositive);
  const load = positiveDirection(loadPower, config.flowThresholdW, "sink");
  return {
    freshness,
    gridAvailability,
    solar,
    battery,
    grid,
    load,
    solarPower,
    batteryPower,
    gridPower,
    loadPower,
    batterySoc,
    summary: flowSummary(freshness, solar, battery, grid, load),
  };
}

/** Formats watts below 1 kW and kilowatts at or above the threshold with stable two-decimal precision. */
export function formatPower(reading: NumericReading, absolute = true): string {
  if (reading.status === "unavailable") return "—";
  const value = absolute ? Math.abs(reading.value) : reading.value;
  if (Math.abs(value) >= 1000) return `${formatDecimal(value / 1000)} kW`;
  return `${formatDecimal(value)} W`;
}
