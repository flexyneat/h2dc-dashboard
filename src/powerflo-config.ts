/**
 * @fileoverview Schema boundary for the complete embedded PowerFlo option set.
 */

import type { PowerFloOptions, PowerFloStatistics } from "./domain";

/** Tests whether an unknown boundary value is a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts only non-executable image schemes supported by Home Assistant cards. */
function isSafeImageUrl(value: string): boolean {
  return value.startsWith("/local/")
    || value.startsWith("/api/image/serve/")
    || /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/iu.test(value);
}

/** Portable PowerFlo defaults; commissioned ratings and entity IDs must be supplied by each installation. */
export const DEFAULT_POWERFLO_OPTIONS = {
  title: "Home energy",
  inverterName: "Inverter",
  inverterModel: "",
  inverterCapacityKw: 12,
  batteryCapacityKwh: 10,
  solarCapacityKw: 0,
  batteryReserveSoc: 20,
  batteryChargeTargetSoc: 100,
  runtimeWindowMinutes: 5,
  runtimeMaxSampleAgeSeconds: 60,
  chargeTaperStartSoc: 90,
  chargeTaperFloorRatio: 0.2,
  solarProjectionHours: 4,
  density: "standard",
  useLearnedTaper: false,
  runtimeLoadEfficiency: 0.9,
  energySourcesVerified: false,
  readinessEnabled: true,
  preparednessEnabled: true,
  gridPowerVerified: false,
  gridStatusFallback: false,
  gridVoltageAvailableMin: 180,
  gridVoltageAvailableMax: 270,
  gridVoltageAbsentMax: 50,
  exportThresholdW: 50,
  exportDurationSeconds: 300,
  standbyMeasurementVerified: false,
  standbyAssumedW: null,
  readinessDeadline: "06:00",
  readinessAverageW: null,
  readinessMinCoverage: 0.8,
  statistics: {},
  solarOutlookEnabled: true,
  solarForecastSources: [],
  estimateAccuracyEnabled: true,
  accuracyStorageKey: "default",
  inverterImage: "",
  clockFormat: "12",
  flowReleaseW: 20,
} as const satisfies PowerFloOptions;

/** Reads a snake-case or camel-case option without allowing aliases to drift. */
function compatible(record: Readonly<Record<string, unknown>>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake];
}

/** Reads a bounded finite number and records a precise issue when supplied input is invalid. */
function boundedNumber(record: Readonly<Record<string, unknown>>, camel: string, snake: string, fallback: number, minimum: number, maximum: number, issues: string[]): number {
  const input = compatible(record, camel, snake);
  if (input === undefined) return fallback;
  const value = Number(input);
  if (Number.isFinite(value) && value >= minimum && value <= maximum) return value;
  issues.push(`powerflo.${snake} must be between ${minimum} and ${maximum}`);
  return fallback;
}

/** Reads a nullable bounded finite number. */
function nullableNumber(record: Readonly<Record<string, unknown>>, camel: string, snake: string, fallback: number | null, minimum: number, maximum: number, issues: string[]): number | null {
  const input = compatible(record, camel, snake);
  if (input === undefined || input === null || input === "") return fallback;
  return boundedNumber(record, camel, snake, fallback ?? minimum, minimum, maximum, issues);
}

/** Reads a boolean with an explicit portable fallback. */
function booleanOption(record: Readonly<Record<string, unknown>>, camel: string, snake: string, fallback: boolean, issues: string[]): boolean {
  const input = compatible(record, camel, snake);
  if (input === undefined) return fallback;
  if (typeof input === "boolean") return input;
  issues.push(`powerflo.${snake} must be true or false`);
  return fallback;
}

/** Reads a bounded string without allowing non-string coercion at the configuration boundary. */
function stringOption(record: Readonly<Record<string, unknown>>, camel: string, snake: string, fallback: string, maximumLength: number, issues: string[]): string {
  const input = compatible(record, camel, snake);
  if (input === undefined) return fallback;
  if (typeof input === "string" && input.length <= maximumLength) return input.trim();
  issues.push(`powerflo.${snake} must be a string up to ${maximumLength} characters`);
  return fallback;
}

/** Parses optional long-term statistic IDs without treating them as entity actions. */
function parseStatistics(input: unknown, issues: string[]): PowerFloStatistics {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    issues.push("powerflo.statistics must be an object");
    return {};
  }
  const result: Record<string, string> = {};
  for (const key of ["solar", "grid", "load", "battery"] as const) {
    const value = input[key];
    if (value === undefined || value === "") continue;
    if (typeof value === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/u.test(value)) result[key] = value;
    else issues.push(`powerflo.statistics.${key} must be a statistic entity ID`);
  }
  return result;
}

/** Parses configured Forecast.Solar source IDs as inert identifiers. */
function parseForecastSources(input: unknown, issues: string[]): readonly string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    issues.push("powerflo.solar_forecast_sources must be an array");
    return [];
  }
  const values = input.filter((value): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/u.test(value));
  if (values.length !== input.length) issues.push("powerflo.solar_forecast_sources contains an invalid source ID");
  return [...new Set(values)].slice(0, 12);
}

/** Parses the full PowerFlo feature configuration while retaining actionable validation issues. */
export function parsePowerFloOptions(input: unknown, issues: string[]): PowerFloOptions {
  const record = isRecord(input) ? input : {};
  if (input !== undefined && !isRecord(input)) issues.push("powerflo must be an object");
  const densityValue = compatible(record, "density", "density");
  const density = densityValue === undefined || densityValue === "compact" || densityValue === "standard" || densityValue === "expanded"
    ? (densityValue ?? DEFAULT_POWERFLO_OPTIONS.density)
    : DEFAULT_POWERFLO_OPTIONS.density;
  if (densityValue !== undefined && density === DEFAULT_POWERFLO_OPTIONS.density && densityValue !== "standard") issues.push("powerflo.density must be compact, standard, or expanded");
  const clockValue = compatible(record, "clockFormat", "clock_format");
  const clockFormat = clockValue === undefined || clockValue === "12" || clockValue === "24" ? (clockValue ?? "12") : "12";
  if (clockValue !== undefined && clockValue !== "12" && clockValue !== "24") issues.push("powerflo.clock_format must be 12 or 24");
  const deadline = stringOption(record, "readinessDeadline", "readiness_deadline", DEFAULT_POWERFLO_OPTIONS.readinessDeadline, 5, issues);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(deadline)) issues.push("powerflo.readiness_deadline must be HH:mm");
  const image = stringOption(record, "inverterImage", "inverter_image", "", 4096, issues);
  if (image !== "" && !isSafeImageUrl(image)) issues.push("powerflo.inverter_image must use /local, /api/image/serve, or a PNG/JPEG/WebP data URL");
  return {
    title: stringOption(record, "title", "title", DEFAULT_POWERFLO_OPTIONS.title, 60, issues),
    inverterName: stringOption(record, "inverterName", "inverter_name", DEFAULT_POWERFLO_OPTIONS.inverterName, 40, issues),
    inverterModel: stringOption(record, "inverterModel", "inverter_model", DEFAULT_POWERFLO_OPTIONS.inverterModel, 80, issues),
    inverterCapacityKw: boundedNumber(record, "inverterCapacityKw", "inverter_capacity_kw", DEFAULT_POWERFLO_OPTIONS.inverterCapacityKw, 0.1, 1000, issues),
    batteryCapacityKwh: boundedNumber(record, "batteryCapacityKwh", "battery_capacity_kwh", DEFAULT_POWERFLO_OPTIONS.batteryCapacityKwh, 0.1, 10000, issues),
    solarCapacityKw: boundedNumber(record, "solarCapacityKw", "solar_capacity_kw", DEFAULT_POWERFLO_OPTIONS.solarCapacityKw, 0, 10000, issues),
    batteryReserveSoc: boundedNumber(record, "batteryReserveSoc", "battery_reserve_soc", DEFAULT_POWERFLO_OPTIONS.batteryReserveSoc, 0, 100, issues),
    batteryChargeTargetSoc: boundedNumber(record, "batteryChargeTargetSoc", "battery_charge_target_soc", DEFAULT_POWERFLO_OPTIONS.batteryChargeTargetSoc, 1, 100, issues),
    runtimeWindowMinutes: boundedNumber(record, "runtimeWindowMinutes", "runtime_window_minutes", DEFAULT_POWERFLO_OPTIONS.runtimeWindowMinutes, 1, 60, issues),
    runtimeMaxSampleAgeSeconds: boundedNumber(record, "runtimeMaxSampleAgeSeconds", "runtime_max_sample_age_seconds", DEFAULT_POWERFLO_OPTIONS.runtimeMaxSampleAgeSeconds, 5, 300, issues),
    chargeTaperStartSoc: boundedNumber(record, "chargeTaperStartSoc", "charge_taper_start_soc", DEFAULT_POWERFLO_OPTIONS.chargeTaperStartSoc, 50, 99, issues),
    chargeTaperFloorRatio: boundedNumber(record, "chargeTaperFloorRatio", "charge_taper_floor_ratio", DEFAULT_POWERFLO_OPTIONS.chargeTaperFloorRatio, 0.05, 1, issues),
    solarProjectionHours: boundedNumber(record, "solarProjectionHours", "solar_projection_hours", DEFAULT_POWERFLO_OPTIONS.solarProjectionHours, 0, 24, issues),
    density,
    useLearnedTaper: booleanOption(record, "useLearnedTaper", "use_learned_taper", DEFAULT_POWERFLO_OPTIONS.useLearnedTaper, issues),
    runtimeLoadEfficiency: boundedNumber(record, "runtimeLoadEfficiency", "runtime_load_efficiency", DEFAULT_POWERFLO_OPTIONS.runtimeLoadEfficiency, 0.5, 1, issues),
    energySourcesVerified: booleanOption(record, "energySourcesVerified", "energy_sources_verified", DEFAULT_POWERFLO_OPTIONS.energySourcesVerified, issues),
    readinessEnabled: booleanOption(record, "readinessEnabled", "readiness_enabled", DEFAULT_POWERFLO_OPTIONS.readinessEnabled, issues),
    preparednessEnabled: booleanOption(record, "preparednessEnabled", "preparedness_enabled", DEFAULT_POWERFLO_OPTIONS.preparednessEnabled, issues),
    gridPowerVerified: booleanOption(record, "gridPowerVerified", "grid_power_verified", DEFAULT_POWERFLO_OPTIONS.gridPowerVerified, issues),
    gridStatusFallback: booleanOption(record, "gridStatusFallback", "grid_status_fallback", DEFAULT_POWERFLO_OPTIONS.gridStatusFallback, issues),
    gridVoltageAvailableMin: boundedNumber(record, "gridVoltageAvailableMin", "grid_voltage_available_min", DEFAULT_POWERFLO_OPTIONS.gridVoltageAvailableMin, 60, 500, issues),
    gridVoltageAvailableMax: boundedNumber(record, "gridVoltageAvailableMax", "grid_voltage_available_max", DEFAULT_POWERFLO_OPTIONS.gridVoltageAvailableMax, 60, 500, issues),
    gridVoltageAbsentMax: boundedNumber(record, "gridVoltageAbsentMax", "grid_voltage_absent_max", DEFAULT_POWERFLO_OPTIONS.gridVoltageAbsentMax, 0, 59, issues),
    exportThresholdW: boundedNumber(record, "exportThresholdW", "export_threshold_w", DEFAULT_POWERFLO_OPTIONS.exportThresholdW, 1, 1_000_000, issues),
    exportDurationSeconds: boundedNumber(record, "exportDurationSeconds", "export_duration_seconds", DEFAULT_POWERFLO_OPTIONS.exportDurationSeconds, 30, 86_400, issues),
    standbyMeasurementVerified: booleanOption(record, "standbyMeasurementVerified", "standby_measurement_verified", DEFAULT_POWERFLO_OPTIONS.standbyMeasurementVerified, issues),
    standbyAssumedW: nullableNumber(record, "standbyAssumedW", "standby_assumed_w", DEFAULT_POWERFLO_OPTIONS.standbyAssumedW, 0, 100_000, issues),
    readinessDeadline: /^([01]\d|2[0-3]):[0-5]\d$/u.test(deadline) ? deadline : DEFAULT_POWERFLO_OPTIONS.readinessDeadline,
    readinessAverageW: nullableNumber(record, "readinessAverageW", "readiness_average_w", DEFAULT_POWERFLO_OPTIONS.readinessAverageW, 0, 1_000_000, issues),
    readinessMinCoverage: boundedNumber(record, "readinessMinCoverage", "readiness_min_coverage", DEFAULT_POWERFLO_OPTIONS.readinessMinCoverage, 0.5, 1, issues),
    statistics: parseStatistics(record.statistics, issues),
    solarOutlookEnabled: booleanOption(record, "solarOutlookEnabled", "solar_outlook_enabled", DEFAULT_POWERFLO_OPTIONS.solarOutlookEnabled, issues),
    solarForecastSources: parseForecastSources(compatible(record, "solarForecastSources", "solar_forecast_sources"), issues),
    estimateAccuracyEnabled: booleanOption(record, "estimateAccuracyEnabled", "estimate_accuracy_enabled", DEFAULT_POWERFLO_OPTIONS.estimateAccuracyEnabled, issues),
    accuracyStorageKey: stringOption(record, "accuracyStorageKey", "accuracy_storage_key", DEFAULT_POWERFLO_OPTIONS.accuracyStorageKey, 100, issues),
    inverterImage: image === "" || isSafeImageUrl(image) ? image : "",
    clockFormat,
    flowReleaseW: boundedNumber(record, "flowReleaseW", "flow_release_w", DEFAULT_POWERFLO_OPTIONS.flowReleaseW, 0, 5000, issues),
  };
}
