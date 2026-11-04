/** Scalar attribute values commonly returned by Home Assistant. */
export type HassAttributeValue = string | number | boolean | null | readonly unknown[] | Readonly<Record<string, unknown>>;

/** Minimal immutable Home Assistant entity state used by the dashboard. */
export interface HassEntity {
  readonly entity_id?: string;
  readonly state: string;
  readonly attributes: Readonly<Record<string, HassAttributeValue | undefined>>;
  readonly last_changed?: string;
  readonly last_updated?: string;
}

/** Service payload accepted at the Home Assistant boundary. */
export type HassServiceData = Readonly<Record<string, string | number | boolean>>;

/** Minimal Home Assistant frontend API required by H2DC. */
export interface HomeAssistant {
  readonly states: Readonly<Record<string, HassEntity | undefined>>;
  readonly config?: Readonly<{ readonly time_zone?: string }>;
  readonly connection?: unknown;
  readonly user?: unknown;
  callService(domain: string, service: string, data: HassServiceData): Promise<unknown>;
  callApi?(method: string, path: string, parameters?: unknown): Promise<unknown>;
  callWS?(message: Readonly<Record<string, unknown>>): Promise<unknown>;
}

/** Explicit state availability prevents missing telemetry from becoming a fake zero. */
export type EntityReading =
  | { readonly status: "available"; readonly entity: HassEntity }
  | { readonly status: "unavailable"; readonly reason: "missing" | "unknown" | "unavailable" };

/** Reads one entity while preserving why telemetry cannot be trusted. */
export function readEntity(hass: HomeAssistant, entityId: string): EntityReading {
  const entity = hass.states[entityId];
  if (entity === undefined) return { status: "unavailable", reason: "missing" };
  if (entity.state === "unknown") return { status: "unavailable", reason: "unknown" };
  if (entity.state === "unavailable") return { status: "unavailable", reason: "unavailable" };
  return { status: "available", entity };
}

/** Numeric telemetry either carries a finite value or an explicit failure reason. */
export type NumericReading =
  | { readonly status: "available"; readonly value: number }
  | { readonly status: "unavailable"; readonly reason: "missing" | "unknown" | "unavailable" | "not_numeric" };

/** Reads a finite numeric state without coercing missing data to zero. */
export function readNumericState(hass: HomeAssistant, entityId: string): NumericReading {
  const reading = readEntity(hass, entityId);
  if (reading.status === "unavailable") return reading;
  if (reading.entity.state.trim() === "") return { status: "unavailable", reason: "not_numeric" };
  const value = Number(reading.entity.state);
  return Number.isFinite(value) ? { status: "available", value } : { status: "unavailable", reason: "not_numeric" };
}

/** Escapes text before insertion into renderer-owned HTML templates. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
