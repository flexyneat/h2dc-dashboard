import {
  H2DC_VIEWS,
  type BackgroundConfig,
  type BatteryPositiveConvention,
  type CameraEntity,
  type ConfigParseResult,
  type DiagnosticEntities,
  type EnergyEntities,
  type GridPositiveConvention,
  type H2DCConfig,
  type H2DCView,
  type LabelledEntity,
  type LightEntity,
  type MediaEntities,
  type RoomTemperatureEntity,
} from "./domain";

/** Public defaults deliberately contain no household entity identifiers or private hosts. */
export const PUBLIC_DEFAULTS = {
  type: "custom:h2dc-dashboard-card",
  configVersion: 1,
  dashboardPath: "/h2dc",
  flowThresholdW: 40,
  batteryPositiveIs: "discharge",
  gridPositiveIs: "import",
} as const satisfies Pick<
  H2DCConfig,
  "type" | "configVersion" | "dashboardPath" | "flowThresholdW" | "batteryPositiveIs" | "gridPositiveIs"
>;

/** Tests whether an unknown boundary value is a plain object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates a Home Assistant entity ID and an optional required domain. */
export function isEntityId(value: unknown, domain?: string): value is string {
  if (typeof value !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(value)) return false;
  return domain === undefined || value.startsWith(`${domain}.`);
}

/** Validates background URLs without allowing executable schemes. */
export function isSafeBackgroundUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  return value.startsWith("/local/") || value.startsWith("/media/") || /^https:\/\//u.test(value) || value.startsWith("data:image/");
}

/** Reads one required string and records a precise validation issue. */
function requiredString(record: Record<string, unknown>, key: string, issues: string[]): string {
  const value = record[key];
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  issues.push(`${key} must be a non-empty string`);
  return "";
}

/** Reads a camelCase or legacy snake_case property. */
function compatibleValue(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake];
}

/** Parses a labelled entity array while rejecting malformed entries. */
function parseLabelledEntities(value: unknown, path: string, issues: string[]): readonly LabelledEntity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isEntityId(item.entity) || typeof item.label !== "string" || typeof item.icon !== "string") {
      issues.push(`${path}[${index}] must contain entity, label, and icon`);
      return [];
    }
    return [{ entity: item.entity, label: item.label, icon: item.icon }];
  });
}

/** Parses room-specific light entities. */
function parseLights(value: unknown, issues: string[]): readonly LightEntity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push("entities.lights must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isEntityId(item.entity, "light") || typeof item.room !== "string" || typeof item.icon !== "string") {
      issues.push(`entities.lights[${index}] must contain a light entity, room, and icon`);
      return [];
    }
    return [{ entity: item.entity, room: item.room, icon: item.icon }];
  });
}

/** Parses labelled camera entities. */
function parseCameras(value: unknown, issues: string[]): readonly CameraEntity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push("entities.cameras must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isEntityId(item.entity, "camera") || typeof item.label !== "string") {
      issues.push(`entities.cameras[${index}] must contain a camera entity and label`);
      return [];
    }
    return [{ entity: item.entity, label: item.label }];
  });
}

/** Parses room temperature entities. */
function parseRoomTemperatures(value: unknown, issues: string[]): readonly RoomTemperatureEntity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push("entities.room_temperatures must be an array");
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || !isEntityId(item.entity, "sensor") || typeof item.room !== "string" || typeof item.icon !== "string") {
      issues.push(`entities.room_temperatures[${index}] must contain a sensor entity, room, and icon`);
      return [];
    }
    return [{ entity: item.entity, room: item.room, icon: item.icon }];
  });
}

/** Reads an optional entity ID using camelCase and legacy snake_case names. */
function optionalEntity(record: Record<string, unknown>, camel: string, snake: string, path: string, issues: string[]): string | undefined {
  const value = compatibleValue(record, camel, snake);
  if (value === undefined || value === "") return undefined;
  if (isEntityId(value)) return value;
  issues.push(`${path} must be a valid entity ID`);
  return undefined;
}

/** Parses the required and optional energy telemetry map. */
function parseEnergy(value: unknown, issues: string[]): EnergyEntities {
  const record = isRecord(value) ? value : {};
  if (!isRecord(value)) issues.push("entities.energy must be an object");
  const required = (key: string, snake: string, domain = "sensor"): string => {
    const candidate = compatibleValue(record, key, snake);
    if (isEntityId(candidate, domain)) return candidate;
    issues.push(`entities.energy.${snake} must be a ${domain} entity`);
    return "";
  };
  const energy: EnergyEntities & Record<string, string> = {
    solar: required("solar", "solar"),
    batterySoc: required("batterySoc", "battery_soc"),
    battery: required("battery", "battery"),
    grid: required("grid", "grid"),
    load: required("load", "load"),
  };
  const optionalKeys = {
    freshness: "freshness",
    batteryVoltage: "battery_voltage",
    batteryTemperature: "battery_temperature",
    acTemperature: "ac_temperature",
    dcTemperature: "dc_temperature",
    dailyPv: "daily_pv",
    dailyGridImport: "daily_grid_import",
    dailyBatteryDischarge: "daily_battery_discharge",
  } as const;
  Object.entries(optionalKeys).forEach(([camel, snake]) => {
    const parsed = optionalEntity(record, camel, snake, `entities.energy.${snake}`, issues);
    if (parsed !== undefined) energy[camel] = parsed;
  });
  return energy;
}

/** Parses an optional keyed entity map without inventing installation defaults. */
function parseOptionalEntityMap<T extends object>(value: unknown, keys: Readonly<Record<keyof T, string>>, path: string, issues: string[]): T {
  const record = isRecord(value) ? value : {};
  if (value !== undefined && !isRecord(value)) issues.push(`${path} must be an object`);
  const entries = Object.entries(keys).flatMap(([camel, rawSnake]) => {
    const snake = String(rawSnake);
    const parsed = optionalEntity(record, camel, snake, `${path}.${snake}`, issues);
    return parsed === undefined ? [] : [[camel, parsed] as const];
  });
  return Object.fromEntries(entries) as T;
}

/** Parses global and per-view background paths. */
function parseBackgrounds(value: unknown, issues: string[]): BackgroundConfig {
  const record = isRecord(value) ? value : {};
  const safeOptional = (key: string): string | undefined => {
    const candidate = record[key];
    if (candidate === undefined || candidate === "") return undefined;
    if (isSafeBackgroundUrl(candidate)) return candidate;
    issues.push(`backgrounds.${key} must use /local, /media, https, or data:image`);
    return undefined;
  };
  const perViewRaw = compatibleValue(record, "perView", "per_view");
  const perViewRecord = isRecord(perViewRaw) ? perViewRaw : {};
  if (perViewRaw !== undefined && !isRecord(perViewRaw)) issues.push("backgrounds.per_view must be an object");
  const perViewEntries = H2DC_VIEWS.flatMap((view) => {
    const candidate = perViewRecord[view];
    if (candidate === undefined || candidate === "") return [];
    if (isSafeBackgroundUrl(candidate)) return [[view, candidate] as const];
    issues.push(`backgrounds.per_view.${view} has an unsafe URL`);
    return [];
  });
  const day = safeOptional("day");
  const night = safeOptional("night");
  return {
    ...(day !== undefined ? { day } : {}),
    ...(night !== undefined ? { night } : {}),
    perView: Object.fromEntries(perViewEntries),
  };
}

/** Parses unknown Lovelace YAML/JSON into the stable H2DC configuration contract. */
export function parseConfig(input: unknown): ConfigParseResult {
  const issues: string[] = [];
  if (!isRecord(input)) return { status: "invalid", issues: ["configuration must be an object"] };
  if (input.type !== PUBLIC_DEFAULTS.type) issues.push(`type must be ${PUBLIC_DEFAULTS.type}`);
  const versionValue = compatibleValue(input, "configVersion", "config_version") ?? PUBLIC_DEFAULTS.configVersion;
  if (versionValue !== PUBLIC_DEFAULTS.configVersion) issues.push(`config_version must be ${PUBLIC_DEFAULTS.configVersion}`);
  const entities = isRecord(input.entities) ? input.entities : {};
  if (!isRecord(input.entities)) issues.push("entities must be an object");

  const viewValue = input.view;
  const view = H2DC_VIEWS.find((candidate) => candidate === viewValue);
  if (view === undefined) issues.push("view must be a supported H2DC route");

  const alarm = entities.alarm;
  const climate = entities.climate;
  const weather = entities.weather;
  const roomTemperature = compatibleValue(entities, "roomTemperature", "room_temperature");
  if (!isEntityId(alarm, "alarm_control_panel")) issues.push("entities.alarm must be an alarm_control_panel entity");
  if (!isEntityId(climate, "climate")) issues.push("entities.climate must be a climate entity");
  if (!isEntityId(weather, "weather")) issues.push("entities.weather must be a weather entity");
  if (!isEntityId(roomTemperature, "sensor")) issues.push("entities.room_temperature must be a sensor entity");

  const flowThresholdRaw = compatibleValue(input, "flowThresholdW", "flow_threshold_w") ?? PUBLIC_DEFAULTS.flowThresholdW;
  const flowThresholdW = Number(flowThresholdRaw);
  if (!Number.isFinite(flowThresholdW) || flowThresholdW < 0) issues.push("flow_threshold_w must be zero or greater");

  const batteryConvention = compatibleValue(input, "batteryPositiveIs", "battery_positive_is") ?? PUBLIC_DEFAULTS.batteryPositiveIs;
  const gridConvention = compatibleValue(input, "gridPositiveIs", "grid_positive_is") ?? PUBLIC_DEFAULTS.gridPositiveIs;
  if (batteryConvention !== "charge" && batteryConvention !== "discharge") issues.push("battery_positive_is must be charge or discharge");
  if (gridConvention !== "import" && gridConvention !== "export") issues.push("grid_positive_is must be import or export");

  const media = parseOptionalEntityMap<MediaEntities>(entities.media, {
    primary: "primary", livingTv: "living_tv", bedroom: "bedroom", study: "study", family: "family", kitchen: "kitchen", dining: "dining",
  }, "entities.media", issues);
  const diagnostics = parseOptionalEntityMap<DiagnosticEntities>(entities.diagnostics, {
    tabletBattery: "tablet_battery", pluggedIn: "plugged_in", screen: "screen", currentPage: "current_page", poe: "poe", poePower: "poe_power",
  }, "entities.diagnostics", issues);
  const dashboardPathCandidate = compatibleValue(input, "dashboardPath", "dashboard_path");
  const dashboardPath = typeof dashboardPathCandidate === "string" ? dashboardPathCandidate : PUBLIC_DEFAULTS.dashboardPath;
  if (!/^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/u.test(dashboardPath)) {
    issues.push("dashboard_path must be a root-relative Home Assistant path without a scheme, query, fragment, backslash, or control character");
  }
  const sonoraCandidate = compatibleValue(input, "sonoraUrl", "sonora_url");
  const sonoraUrl = typeof sonoraCandidate === "string" && /^https:\/\//u.test(sonoraCandidate) ? sonoraCandidate : undefined;
  if (sonoraCandidate !== undefined && sonoraUrl === undefined) issues.push("sonora_url must be an HTTPS URL");

  // Parse every nested boundary before the final gate so no malformed optional section is silently discarded.
  const nearby = parseLabelledEntities(entities.nearby, "entities.nearby", issues);
  const lights = parseLights(entities.lights, issues);
  const cameras = parseCameras(entities.cameras, issues);
  const roomTemperatures = parseRoomTemperatures(compatibleValue(entities, "roomTemperatures", "room_temperatures"), issues);
  const energy = parseEnergy(entities.energy, issues);
  const backgrounds = parseBackgrounds(input.backgrounds, issues);

  if (issues.length > 0 || view === undefined || !isEntityId(alarm) || !isEntityId(climate) || !isEntityId(weather) || !isEntityId(roomTemperature)) {
    return { status: "invalid", issues };
  }

  const config: H2DCConfig = {
    type: PUBLIC_DEFAULTS.type,
    configVersion: 1,
    view,
    dashboardPath,
    ...(sonoraUrl !== undefined ? { sonoraUrl } : {}),
    flowThresholdW,
    batteryPositiveIs: batteryConvention as BatteryPositiveConvention,
    gridPositiveIs: gridConvention as GridPositiveConvention,
    entities: {
      alarm,
      climate,
      weather,
      roomTemperature,
      nearby,
      lights,
      cameras,
      roomTemperatures,
      energy,
      media,
      diagnostics,
    },
    backgrounds,
  };
  return { status: "valid", config };
}

/** Returns the configured view after exhaustive validation. */
export function assertView(view: H2DCView): H2DCView {
  switch (view) {
    case "home": case "security": case "energy": case "climate": case "lights": case "media": case "sonos": case "diagnostics": return view;
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

/**
 * Creates an entity-free editor draft from a partial Lovelace configuration.
 * Drafts are not renderer-safe; callers must use parseConfig before rendering.
 */
export function createDraftConfig(input: unknown): H2DCConfig {
  const root = isRecord(input) ? input : {};
  const entities = isRecord(root.entities) ? root.entities : {};
  const energy = isRecord(entities.energy) ? entities.energy : {};
  const backgrounds = isRecord(root.backgrounds) ? root.backgrounds : {};
  const stringValue = (record: Record<string, unknown>, camel: string, snake = camel): string => {
    const value = compatibleValue(record, camel, snake);
    return typeof value === "string" ? value : "";
  };
  const viewValue = root.view;
  const view = H2DC_VIEWS.find((candidate) => candidate === viewValue) ?? "home";
  const flowValue = Number(compatibleValue(root, "flowThresholdW", "flow_threshold_w") ?? PUBLIC_DEFAULTS.flowThresholdW);
  const batteryValue = compatibleValue(root, "batteryPositiveIs", "battery_positive_is");
  const gridValue = compatibleValue(root, "gridPositiveIs", "grid_positive_is");
  const sonoraUrl = stringValue(root, "sonoraUrl", "sonora_url");
  const day = stringValue(backgrounds, "day");
  const night = stringValue(backgrounds, "night");
  const draftEnergy = parseEnergy(energy, []);
  const draftBackgrounds = parseBackgrounds(backgrounds, []);
  return {
    type: PUBLIC_DEFAULTS.type,
    configVersion: 1,
    view,
    dashboardPath: stringValue(root, "dashboardPath", "dashboard_path") || PUBLIC_DEFAULTS.dashboardPath,
    ...(sonoraUrl !== "" ? { sonoraUrl } : {}),
    flowThresholdW: Number.isFinite(flowValue) && flowValue >= 0 ? flowValue : PUBLIC_DEFAULTS.flowThresholdW,
    batteryPositiveIs: batteryValue === "charge" ? "charge" : "discharge",
    gridPositiveIs: gridValue === "export" ? "export" : "import",
    entities: {
      alarm: stringValue(entities, "alarm"),
      climate: stringValue(entities, "climate"),
      weather: stringValue(entities, "weather"),
      roomTemperature: stringValue(entities, "roomTemperature", "room_temperature"),
      nearby: parseLabelledEntities(entities.nearby, "entities.nearby", []),
      lights: parseLights(entities.lights, []),
      cameras: parseCameras(entities.cameras, []),
      roomTemperatures: parseRoomTemperatures(compatibleValue(entities, "roomTemperatures", "room_temperatures"), []),
      energy: {
        ...draftEnergy,
        solar: stringValue(energy, "solar"),
        batterySoc: stringValue(energy, "batterySoc", "battery_soc"),
        battery: stringValue(energy, "battery"),
        grid: stringValue(energy, "grid"),
        load: stringValue(energy, "load"),
      },
      media: parseOptionalEntityMap<MediaEntities>(entities.media, {
        primary: "primary", livingTv: "living_tv", bedroom: "bedroom", study: "study", family: "family", kitchen: "kitchen", dining: "dining",
      }, "entities.media", []),
      diagnostics: parseOptionalEntityMap<DiagnosticEntities>(entities.diagnostics, {
        tabletBattery: "tablet_battery", pluggedIn: "plugged_in", screen: "screen", currentPage: "current_page", poe: "poe", poePower: "poe_power",
      }, "entities.diagnostics", []),
    },
    backgrounds: {
      ...draftBackgrounds,
      ...(day !== "" ? { day } : {}),
      ...(night !== "" ? { night } : {}),
    },
  };
}
