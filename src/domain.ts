/** Supported H2DC view identifiers. */
export const H2DC_VIEWS = [
  "home",
  "security",
  "energy",
  "climate",
  "lights",
  "media",
  "sonos",
  "diagnostics",
] as const;

/** A stable route rendered by the H2DC custom card. */
export type H2DCView = (typeof H2DC_VIEWS)[number];

/** The meaning of positive battery telemetry for an installation. */
export type BatteryPositiveConvention = "charge" | "discharge";

/** The meaning of positive grid telemetry for an installation. */
export type GridPositiveConvention = "import" | "export";

/** A labelled entity used by compact dashboard controls. */
export interface LabelledEntity {
  readonly entity: string;
  readonly label: string;
  readonly icon: string;
}

/** A labelled camera entity. */
export interface CameraEntity {
  readonly entity: string;
  readonly label: string;
}

/** A room-specific light entity. */
export interface LightEntity {
  readonly entity: string;
  readonly room: string;
  readonly icon: string;
}

/** A room-specific temperature entity. */
export interface RoomTemperatureEntity {
  readonly entity: string;
  readonly room: string;
  readonly icon: string;
}

/** Energy telemetry consumed by the read-only flow topology. */
export interface EnergyEntities {
  readonly freshness?: string;
  readonly solar: string;
  readonly batterySoc: string;
  readonly battery: string;
  readonly grid: string;
  readonly load: string;
  readonly batteryVoltage?: string;
  readonly batteryTemperature?: string;
  readonly acTemperature?: string;
  readonly dcTemperature?: string;
  readonly dailyPv?: string;
  readonly dailyGridImport?: string;
  readonly dailyBatteryDischarge?: string;
}

/** Optional kiosk diagnostics; each entity remains installation-defined. */
export interface DiagnosticEntities {
  readonly tabletBattery?: string;
  readonly pluggedIn?: string;
  readonly screen?: string;
  readonly currentPage?: string;
  readonly poe?: string;
  readonly poePower?: string;
}

/** Media entities shown across the media and Home views. */
export interface MediaEntities {
  readonly primary?: string;
  readonly livingTv?: string;
  readonly bedroom?: string;
  readonly study?: string;
  readonly family?: string;
  readonly kitchen?: string;
  readonly dining?: string;
}

/** Complete entity mapping supplied by the Home Assistant operator. */
export interface H2DCEntities {
  readonly alarm: string;
  readonly climate: string;
  readonly weather: string;
  readonly roomTemperature: string;
  readonly nearby: readonly LabelledEntity[];
  readonly lights: readonly LightEntity[];
  readonly cameras: readonly CameraEntity[];
  readonly roomTemperatures: readonly RoomTemperatureEntity[];
  readonly energy: EnergyEntities;
  readonly media: MediaEntities;
  readonly diagnostics: DiagnosticEntities;
}

/** Global and route-specific background configuration. */
export interface BackgroundConfig {
  readonly day?: string;
  readonly night?: string;
  readonly perView: Readonly<Partial<Record<H2DCView, string>>>;
}

/** Parsed H2DC configuration accepted by the renderer. */
export interface H2DCConfig {
  readonly type: "custom:h2dc-dashboard-card";
  readonly configVersion: 1;
  readonly view: H2DCView;
  readonly dashboardPath: string;
  readonly sonoraUrl?: string;
  readonly flowThresholdW: number;
  readonly batteryPositiveIs: BatteryPositiveConvention;
  readonly gridPositiveIs: GridPositiveConvention;
  readonly entities: H2DCEntities;
  readonly backgrounds: BackgroundConfig;
}

/** A configuration boundary that either yields parsed data or actionable issues. */
export type ConfigParseResult =
  | { readonly status: "valid"; readonly config: H2DCConfig }
  | { readonly status: "invalid"; readonly issues: readonly string[] };
