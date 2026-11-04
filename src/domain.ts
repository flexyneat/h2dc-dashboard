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

/** Tested viewport profile used to keep the dashboard within a no-scroll canvas. */
export type KioskProfile = "wall_16_10" | "desktop_landscape" | "tablet_portrait" | "phone";

/** Operator-selected information density. */
export type PresentationDensity = "compact" | "comfortable";

/** A labelled entity used by compact dashboard controls. */
export interface LabelledEntity {
  readonly entity: string;
  readonly label: string;
  readonly icon: string;
}

/** A labelled camera tile with an optional, explicitly separate medium-quality live source. */
export interface CameraEntity {
  readonly entity: string;
  readonly mediumStreamEntity?: string;
  readonly label: string;
}

/** A room-specific light entity. */
export interface LightEntity {
  readonly entity: string;
  readonly room: string;
  readonly icon: string;
}

/** A room-specific binary switch exposed as an intentional household control. */
export interface SwitchEntity {
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
  readonly freshness: string;
  readonly inverterStatus?: string;
  readonly gridConnected?: string;
  readonly solar: string;
  readonly pv1Power?: string;
  readonly pv2Power?: string;
  readonly pv3Power?: string;
  readonly batterySoc: string;
  readonly battery: string;
  readonly grid: string;
  readonly load: string;
  readonly batteryVoltage?: string;
  readonly batteryTemperature?: string;
  readonly acTemperature?: string;
  readonly dcTemperature?: string;
  readonly gridVoltage?: string;
  readonly gridFrequency?: string;
  readonly gridL2Voltage?: string;
  readonly inverterOutputPower?: string;
  readonly externalCtPowerCandidate?: string;
  readonly batteryChargeToday?: string;
  readonly gridExportToday?: string;
  readonly solarTotal?: string;
  readonly gridImportTotal?: string;
  readonly gridExportTotal?: string;
  readonly batteryChargeTotal?: string;
  readonly batteryDischargeTotal?: string;
  readonly dailyPv?: string;
  readonly dailyGridImport?: string;
  readonly dailyLoad?: string;
  readonly dailyBatteryDischarge?: string;
  readonly solarForecastPower?: string;
  readonly batteryCurrent?: string;
  readonly bmsChargeCurrentLimit?: string;
  readonly bmsDischargeCurrentLimit?: string;
  readonly inverterStandbyPower?: string;
  readonly pv1Voltage?: string;
  readonly pv1Current?: string;
  readonly pv2Voltage?: string;
  readonly pv2Current?: string;
  readonly pv3Voltage?: string;
  readonly pv3Current?: string;
}

/** PowerFlo history statistic mappings used by Today, Week and Month views. */
export interface PowerFloStatistics {
  readonly solar?: string;
  readonly grid?: string;
  readonly load?: string;
  readonly battery?: string;
}

/** Complete presentation and estimate configuration forwarded to PowerFlo. */
export interface PowerFloOptions {
  readonly title: string;
  readonly inverterName: string;
  readonly inverterModel: string;
  readonly inverterCapacityKw: number;
  readonly batteryCapacityKwh: number;
  readonly solarCapacityKw: number;
  readonly batteryReserveSoc: number;
  readonly batteryChargeTargetSoc: number;
  readonly runtimeWindowMinutes: number;
  readonly runtimeMaxSampleAgeSeconds: number;
  readonly chargeTaperStartSoc: number;
  readonly chargeTaperFloorRatio: number;
  readonly solarProjectionHours: number;
  readonly density: "compact" | "standard" | "expanded";
  readonly useLearnedTaper: boolean;
  readonly runtimeLoadEfficiency: number;
  readonly energySourcesVerified: boolean;
  readonly readinessEnabled: boolean;
  readonly preparednessEnabled: boolean;
  readonly gridPowerVerified: boolean;
  readonly gridStatusFallback: boolean;
  readonly gridVoltageAvailableMin: number;
  readonly gridVoltageAvailableMax: number;
  readonly gridVoltageAbsentMax: number;
  readonly exportThresholdW: number;
  readonly exportDurationSeconds: number;
  readonly standbyMeasurementVerified: boolean;
  readonly standbyAssumedW: number | null;
  readonly readinessDeadline: string;
  readonly readinessAverageW: number | null;
  readonly readinessMinCoverage: number;
  readonly statistics: PowerFloStatistics;
  readonly solarOutlookEnabled: boolean;
  readonly solarForecastSources: readonly string[];
  readonly estimateAccuracyEnabled: boolean;
  readonly accuracyStorageKey: string;
  readonly inverterImage: string;
  readonly clockFormat: "12" | "24";
  readonly flowReleaseW: number;
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
  readonly roam?: string;
}

/** Installation-defined entities used by one House Pulse summary category. */
export interface HousePulseEntities {
  readonly access: readonly LabelledEntity[];
  readonly presence: readonly LabelledEntity[];
  readonly comfort: readonly LabelledEntity[];
  readonly attention: readonly LabelledEntity[];
}

/** Reusable room mapping projected consistently across dashboard views. */
export interface RoomDefinition {
  readonly id: string;
  readonly name: string;
  readonly temperature?: string;
  readonly humidity?: string;
  readonly occupancy: readonly string[];
  readonly lights: readonly string[];
  readonly switches: readonly string[];
  readonly media: readonly string[];
  readonly climate?: string;
  readonly camera?: string;
}

/** Token-driven presentation settings shared by every H2DC view. */
export interface PresentationConfig {
  readonly kioskProfile: KioskProfile;
  readonly density: PresentationDensity;
  readonly accent: string;
  readonly fontFamily: string;
  readonly overlayStrength: number;
  readonly contextualHome: boolean;
}

/** Complete entity mapping supplied by the Home Assistant operator. */
export interface H2DCEntities {
  readonly alarm: string;
  readonly climate: string;
  readonly weather: string;
  readonly roomTemperature: string;
  readonly nearby: readonly LabelledEntity[];
  readonly lights: readonly LightEntity[];
  readonly switches: readonly SwitchEntity[];
  readonly cameras: readonly CameraEntity[];
  readonly roomTemperatures: readonly RoomTemperatureEntity[];
  readonly energy: EnergyEntities;
  readonly media: MediaEntities;
  readonly diagnostics: DiagnosticEntities;
  readonly housePulse: HousePulseEntities;
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
  readonly configVersion: 2;
  readonly view: H2DCView;
  readonly dashboardPath: string;
  readonly sonoraUrl?: string;
  readonly flowThresholdW: number;
  readonly batteryPositiveIs: BatteryPositiveConvention;
  readonly gridPositiveIs: GridPositiveConvention;
  readonly powerFlo: PowerFloOptions;
  readonly entities: H2DCEntities;
  readonly backgrounds: BackgroundConfig;
  readonly rooms: readonly RoomDefinition[];
  readonly presentation: PresentationConfig;
}

/** A configuration boundary that either yields parsed data or actionable issues. */
export type ConfigParseResult =
  | { readonly status: "valid"; readonly config: H2DCConfig }
  | { readonly status: "invalid"; readonly issues: readonly string[] };
