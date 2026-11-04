import type { H2DCConfig } from "./domain";
import type { HomeAssistant } from "./home-assistant";

/** Stable identifiers for guided H2DC setup sections. */
export type OnboardingSectionId = "core" | "energy" | "rooms" | "media" | "presentation";

/** Exhaustive readiness state for one setup section. */
export type OnboardingSectionState =
  | { readonly status: "ready"; readonly detail: string }
  | { readonly status: "warning"; readonly detail: string }
  | { readonly status: "blocked"; readonly detail: string };

/** One guided setup section with a stable identity and operator-facing label. */
export interface OnboardingSection {
  readonly id: OnboardingSectionId;
  readonly label: string;
  readonly status: OnboardingSectionState["status"];
  readonly detail: string;
}

/** Complete onboarding report used by the editor and diagnostics view. */
export interface OnboardingReport {
  readonly status: OnboardingSectionState["status"];
  readonly sections: readonly OnboardingSection[];
}

/** Returns the highest-severity readiness status across all setup sections. */
function overallStatus(sections: readonly OnboardingSection[]): OnboardingSectionState["status"] {
  if (sections.some((section) => section.status === "blocked")) return "blocked";
  if (sections.some((section) => section.status === "warning")) return "warning";
  return "ready";
}

/** Evaluates whether every non-empty entity mapping currently exists in Home Assistant. */
function mappedState(entityIds: readonly string[], hass: HomeAssistant | undefined, readyDetail: string): OnboardingSectionState {
  const configured = entityIds.filter((entityId) => entityId !== "");
  if (configured.length !== entityIds.length) return { status: "blocked", detail: "Required entity mappings are incomplete." };
  if (hass === undefined) return { status: "warning", detail: "Connect Home Assistant to validate mapped entities." };
  const missing = configured.filter((entityId) => hass.states[entityId] === undefined);
  return missing.length === 0
    ? { status: "ready", detail: readyDetail }
    : { status: "blocked", detail: `${missing.length} mapped ${missing.length === 1 ? "entity is" : "entities are"} not available in Home Assistant.` };
}

/** Builds a deterministic, privacy-safe setup report from the parsed configuration. */
export function buildOnboardingReport(config: H2DCConfig, hass?: HomeAssistant): OnboardingReport {
  const core = mappedState([
    config.entities.alarm,
    config.entities.climate,
    config.entities.weather,
    config.entities.roomTemperature,
  ], hass, "Alarm, climate, weather, and room temperature are ready.");
  const energy = mappedState([
    config.entities.energy.freshness,
    config.entities.energy.solar,
    config.entities.energy.batterySoc,
    config.entities.energy.battery,
    config.entities.energy.grid,
    config.entities.energy.load,
  ], hass, "Required live energy channels are ready.");
  const roomState: OnboardingSectionState = config.rooms.length === 0
    ? { status: "warning", detail: "Add rooms to reuse occupancy, comfort, lighting, media, and camera mappings." }
    : { status: "ready", detail: `${config.rooms.length} ${config.rooms.length === 1 ? "room is" : "rooms are"} configured.` };
  const mediaCount = Object.values(config.entities.media).filter((entityId) => entityId !== undefined).length;
  const mediaState: OnboardingSectionState = mediaCount === 0
    ? { status: "warning", detail: "Add a media player to enable artwork and transport controls." }
    : { status: "ready", detail: `${mediaCount} media ${mediaCount === 1 ? "source is" : "sources are"} configured.` };
  const presentationState: OnboardingSectionState = {
    status: "ready",
    detail: `${config.presentation.kioskProfile.replaceAll("_", " ")} · ${config.presentation.density} density`,
  };
  const states = [
    ["core", "Core entities", core],
    ["energy", "Energy", energy],
    ["rooms", "Rooms", roomState],
    ["media", "Media", mediaState],
    ["presentation", "Presentation", presentationState],
  ] as const satisfies readonly (readonly [OnboardingSectionId, string, OnboardingSectionState])[];
  const sections = states.map(([id, label, state]) => ({ id, label, status: state.status, detail: state.detail }));
  return { status: overallStatus(sections), sections };
}
