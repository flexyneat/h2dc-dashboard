import type { OcppEntities } from "./domain";
import { isRecord } from "./config-schema";
import { readEntity, type HassEntity, type HomeAssistant } from "./home-assistant";

/** Normalized OCPP connector lifecycle used by the H2DC EV Charging workspace. */
export type OcppConnectorState =
  | "available"
  | "preparing"
  | "charging"
  | "suspended"
  | "finishing"
  | "faulted"
  | "offline"
  | "unknown";

/** One historical OCPP charging session exposed by a configured helper entity. */
export interface OcppSession {
  readonly id: string;
  readonly startedAt: string;
  readonly stoppedAt?: string;
  readonly energyKwh?: number;
  readonly durationMinutes?: number;
  readonly stopReason?: string;
}

/** Complete, model-independent OCPP projection consumed by the renderer. */
export interface OcppProjection {
  readonly configured: boolean;
  readonly simulated: boolean;
  readonly state: OcppConnectorState;
  readonly stateLabel: string;
  readonly powerKw?: number;
  readonly sessionEnergyKwh?: number;
  readonly totalEnergyKwh?: number;
  readonly currentA?: number;
  readonly voltageV?: number;
  readonly temperatureC?: number;
  readonly sessionDurationMinutes?: number;
  readonly transactionId?: string;
  readonly connectorId?: string;
  readonly errorCode?: string;
  readonly sessions: readonly OcppSession[];
}

/** Returns whether enough OCPP configuration exists to expose the optional EV Charging route. */
export function isOcppConfigured(entities: OcppEntities): boolean {
  return entities.status !== undefined && entities.status !== "";
}

/** Converts an integration-specific connector status into a stable H2DC lifecycle. */
export function normalizeOcppState(value: string): OcppConnectorState {
  const state = value.trim().toLocaleLowerCase().replaceAll(/[_ -]/gu, "");
  if (["available", "ready", "idle"].includes(state)) return "available";
  // OCPP 2.x may expose reservation and EV-connection states separately from active energy delivery.
  if (["preparing", "starting", "evconnected", "reserved"].includes(state)) return "preparing";
  if (["charging", "occupied"].includes(state)) return "charging";
  if (["suspendedev", "suspendedevse", "suspended", "paused"].includes(state)) return "suspended";
  if (["finishing", "stopping"].includes(state)) return "finishing";
  if (["faulted", "evsefaulted", "error"].includes(state)) return "faulted";
  if (["unavailable", "offline", "unknown"].includes(state)) return state === "unknown" ? "unknown" : "offline";
  return "unknown";
}

/** Converts a finite entity state into the canonical unit expected by H2DC. */
function optionalMeasurement(
  hass: HomeAssistant,
  entityId: string | undefined,
  conversions: Readonly<Record<string, number>>,
): number | undefined {
  if (entityId === undefined) return undefined;
  const reading = readEntity(hass, entityId);
  if (reading.status !== "available") return undefined;
  const value = Number(reading.entity.state);
  const rawUnit = reading.entity.attributes.unit_of_measurement;
  if (!Number.isFinite(value) || typeof rawUnit !== "string") return undefined;
  const multiplier = conversions[rawUnit.trim().toLocaleLowerCase()];
  return multiplier === undefined ? undefined : value * multiplier;
}

/** Parses optional history values without converting null or empty data to zero. */
function strictOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Reads a configured display value while preserving a truly absent field. */
function optionalText(hass: HomeAssistant, entityId: string | undefined): string | undefined {
  if (entityId === undefined) return undefined;
  const reading = readEntity(hass, entityId);
  if (reading.status !== "available") return undefined;
  const value = reading.entity.state.trim();
  return value === "" || value === "unknown" || value === "unavailable" ? undefined : value;
}

/** Parses one durable session record from an integration or template-helper attribute. */
function parseSession(value: unknown, index: number): OcppSession | undefined {
  if (!isRecord(value)) return undefined;
  const idValue = value.id ?? value.transaction_id ?? value.transactionId ?? `session-${index + 1}`;
  const startedValue = value.started_at ?? value.startedAt ?? value.start;
  if ((typeof idValue !== "string" && typeof idValue !== "number") || typeof startedValue !== "string") return undefined;
  const stoppedValue = value.stopped_at ?? value.stoppedAt ?? value.stop;
  const energyValue = strictOptionalNumber(value.energy_kwh ?? value.energyKwh ?? value.energy);
  const durationValue = strictOptionalNumber(value.duration_minutes ?? value.durationMinutes ?? value.duration);
  const reasonValue = value.stop_reason ?? value.stopReason ?? value.reason;
  return {
    id: String(idValue),
    startedAt: startedValue,
    ...(typeof stoppedValue === "string" ? { stoppedAt: stoppedValue } : {}),
    ...(energyValue === undefined ? {} : { energyKwh: energyValue }),
    ...(durationValue === undefined ? {} : { durationMinutes: durationValue }),
    ...(typeof reasonValue === "string" ? { stopReason: reasonValue } : {}),
  };
}

/** Reads recent sessions from `sessions` or `recent_sessions` attributes without inventing history. */
export function readOcppSessions(entity: HassEntity | undefined): readonly OcppSession[] {
  const candidate = entity?.attributes.sessions ?? entity?.attributes.recent_sessions;
  if (!Array.isArray(candidate)) return [];
  return candidate.flatMap((value, index) => {
    const session = parseSession(value, index);
    return session === undefined ? [] : [session];
  }).slice(0, 6);
}

/** Projects arbitrary Home Assistant OCPP entities into a strict, renderer-safe model. */
export function projectOcpp(hass: HomeAssistant, entities: OcppEntities): OcppProjection {
  const statusReading = entities.status === undefined ? undefined : readEntity(hass, entities.status);
  const statusEntity = statusReading?.status === "available" ? statusReading.entity : undefined;
  const state = statusEntity === undefined ? "offline" : normalizeOcppState(statusEntity.state);
  const labels: Readonly<Record<OcppConnectorState, string>> = {
    available: "Ready",
    preparing: "Preparing",
    charging: "Charging",
    suspended: "Paused",
    finishing: "Finishing",
    faulted: "Faulted",
    offline: "Offline",
    unknown: "Unknown",
  };
  const powerKw = optionalMeasurement(hass, entities.power, { w: 0.001, kw: 1 });
  const sessionEnergyKwh = optionalMeasurement(hass, entities.sessionEnergy, { wh: 0.001, kwh: 1 });
  const totalEnergyKwh = optionalMeasurement(hass, entities.totalEnergy, { wh: 0.001, kwh: 1, mwh: 1000 });
  const currentA = optionalMeasurement(hass, entities.current, { a: 1, ma: 0.001 });
  const voltageV = optionalMeasurement(hass, entities.voltage, { v: 1, kv: 1000 });
  const temperatureC = optionalMeasurement(hass, entities.temperature, { "°c": 1, c: 1 });
  const sessionDurationMinutes = optionalMeasurement(hass, entities.sessionDuration, { s: 1 / 60, sec: 1 / 60, min: 1, h: 60 });
  const transactionId = optionalText(hass, entities.transactionId);
  const connectorId = optionalText(hass, entities.connectorId);
  const errorCode = optionalText(hass, entities.errorCode);
  return {
    configured: isOcppConfigured(entities),
    simulated: statusEntity?.attributes.h2dc_demo === true,
    state,
    stateLabel: labels[state],
    ...(powerKw === undefined ? {} : { powerKw }),
    ...(sessionEnergyKwh === undefined ? {} : { sessionEnergyKwh }),
    ...(totalEnergyKwh === undefined ? {} : { totalEnergyKwh }),
    ...(currentA === undefined ? {} : { currentA }),
    ...(voltageV === undefined ? {} : { voltageV }),
    ...(temperatureC === undefined ? {} : { temperatureC }),
    ...(sessionDurationMinutes === undefined ? {} : { sessionDurationMinutes }),
    ...(transactionId === undefined ? {} : { transactionId }),
    ...(connectorId === undefined ? {} : { connectorId }),
    ...(errorCode === undefined ? {} : { errorCode }),
    sessions: (() => {
      const configuredHistory = entities.sessionHistory === undefined ? undefined : hass.states[entities.sessionHistory];
      const historySessions = readOcppSessions(configuredHistory);
      return historySessions.length > 0 ? historySessions : readOcppSessions(statusEntity);
    })(),
  };
}
