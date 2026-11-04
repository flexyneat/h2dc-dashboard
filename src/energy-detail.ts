/**
 * @fileoverview Focused, read-only Energy modal projections for H2DC.
 */

import type { H2DCConfig } from "./domain";
import { escapeHtml, readNumericState, type HomeAssistant } from "./home-assistant";
import { derivePowerFlow, formatPower } from "./power-flow";
import { formatDecimal, formatNumericEntity } from "./value-format";

/** Energy modal destinations exposed by the overview controls. */
export const ENERGY_DETAILS = {
  solar: ["Solar production", "Live arrays, MPPT channels, production totals and forecast outlook."],
  battery: ["Battery detail", "State, both independent estimates, current limits, temperature and recorded energy."],
  grid: ["Grid detail", "Commissioned relay state, import/export telemetry, voltage, frequency and outage history."],
  load: ["Protected load", "Current demand, inverter output and recorded energy supplied to protected circuits."],
  inverter: ["Inverter detail", "Operating state, thermal health, rated capacity and telemetry freshness."],
  history: ["Energy history", "Recorded daily and lifetime energy counters retained by the Deye integration."],
  readiness: ["Outage readiness", "Reserve, deadline and current battery state used by PowerFlo planning."],
  analysis: ["Complete PowerFlo analysis", "All read-only PowerFlo forecasts, history, readiness and diagnostic insights."],
} as const satisfies Readonly<Record<string, readonly [string, string]>>;

/** Stable identifier for one approved Energy detail surface. */
export type EnergyDetailKey = keyof typeof ENERGY_DETAILS;

/** Detail surfaces that intentionally retain the complete embedded PowerFlo application. */
export function usesCompletePowerFlo(detail: EnergyDetailKey): detail is "analysis" {
  return detail === "analysis";
}

/** Reads an entity state with its unit without converting missing telemetry into zero. */
function entityValue(hass: HomeAssistant, entityId: string | undefined, fallback = "Unavailable"): string {
  return formatNumericEntity(hass, entityId, fallback);
}

/** Formats an optional power entity using the same W/kW threshold as the overview. */
function powerValue(hass: HomeAssistant, entityId: string | undefined): string {
  return entityId === undefined ? "Unavailable" : formatPower(readNumericState(hass, entityId));
}

/** Produces one accessible metric row for a focused Energy surface. */
function metric(label: string, value: string): string {
  return `<div class="energy-detail-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

/** Renders the selected Energy concept without exposing unrelated PowerFlo panels. */
export function renderFocusedEnergyDetail(detail: Exclude<EnergyDetailKey, "analysis">, config: H2DCConfig, hass: HomeAssistant): string {
  const entities = config.entities.energy;
  const flow = derivePowerFlow(hass, config);
  const panels: Readonly<Record<Exclude<EnergyDetailKey, "analysis">, string>> = {
    solar: [metric("Solar now", formatPower(flow.solarPower)), metric("MPPT 1", powerValue(hass, entities.pv1Power)), metric("MPPT 2", powerValue(hass, entities.pv2Power)), metric("MPPT 3", powerValue(hass, entities.pv3Power)), metric("Production today", entityValue(hass, entities.dailyPv)), metric("Forecast now", powerValue(hass, entities.solarForecastPower))].join(""),
    battery: [metric("State of charge", flow.batterySoc.status === "available" ? `${formatDecimal(flow.batterySoc.value)}%` : "Unavailable"), metric("Current flow", formatPower(flow.batteryPower)), metric("Direction", flow.battery === "source" ? "Discharging to home" : flow.battery === "sink" ? "Charging" : "Idle"), metric("Voltage", entityValue(hass, entities.batteryVoltage)), metric("Temperature", entityValue(hass, entities.batteryTemperature)), metric("Reserve", `${formatDecimal(config.powerFlo.batteryReserveSoc)}%`)].join(""),
    grid: [metric("Relay", flow.gridAvailability === "available" ? "Connected" : flow.gridAvailability === "unavailable" ? "Disconnected" : "Unknown"), metric("Power", formatPower(flow.gridPower)), metric("Direction", flow.grid === "source" ? "Importing" : flow.grid === "sink" ? "Exporting" : "Idle"), metric("L1 voltage", entityValue(hass, entities.gridVoltage)), metric("L2 voltage", entityValue(hass, entities.gridL2Voltage)), metric("Frequency", entityValue(hass, entities.gridFrequency))].join(""),
    load: [metric("Protected load", formatPower(flow.loadPower)), metric("Inverter output", powerValue(hass, entities.inverterOutputPower)), metric("Load today", entityValue(hass, entities.dailyLoad)), metric("Flow state", flow.load === "sink" ? "Consuming" : "Idle")].join(""),
    inverter: [metric("Name", config.powerFlo.inverterName), metric("Model", config.powerFlo.inverterModel || "Not configured"), metric("Rated output", `${formatDecimal(config.powerFlo.inverterCapacityKw)} kW`), metric("Telemetry", flow.freshness === "fresh" ? "Live" : flow.freshness === "stale" ? "Stale" : "Unavailable"), metric("AC stage", entityValue(hass, entities.acTemperature)), metric("DC stage", entityValue(hass, entities.dcTemperature))].join(""),
    history: [metric("Solar today", entityValue(hass, entities.dailyPv)), metric("Grid import today", entityValue(hass, entities.dailyGridImport)), metric("Grid export today", entityValue(hass, entities.gridExportToday)), metric("Battery charged today", entityValue(hass, entities.batteryChargeToday)), metric("Battery discharged today", entityValue(hass, entities.dailyBatteryDischarge)), metric("Load today", entityValue(hass, entities.dailyLoad))].join(""),
    readiness: [metric("Battery", flow.batterySoc.status === "available" ? `${formatDecimal(flow.batterySoc.value)}%` : "Unavailable"), metric("Reserve", `${formatDecimal(config.powerFlo.batteryReserveSoc)}%`), metric("Charge target", `${formatDecimal(config.powerFlo.batteryChargeTargetSoc)}%`), metric("Planning deadline", config.powerFlo.readinessDeadline), metric("Grid relay", flow.gridAvailability === "available" ? "Connected" : flow.gridAvailability === "unavailable" ? "Disconnected" : "Unknown"), metric("Current load", formatPower(flow.loadPower))].join(""),
  };
  return `<section class="energy-detail-surface" data-energy-detail-surface="${detail}"><div class="energy-detail-grid">${panels[detail]}</div><p>Open <strong>Complete PowerFlo analysis</strong> for interactive forecasts, estimator sessions, Recorder graphs and diagnostics.</p></section>`;
}
