/** Minimal Home Assistant state shape needed for capability discovery. */
export interface HassEntityState {
  readonly state: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

/** Controls available for a configured light. */
export interface LightCapabilities {
  readonly available: boolean;
  readonly dimmable: boolean;
  readonly colorTemperature: boolean;
}

/** Derives controls only from capabilities reported by Home Assistant. */
export function lightCapabilities(entity: HassEntityState | undefined): LightCapabilities {
  if (entity === undefined || entity.state === "unavailable" || entity.state === "unknown") {
    return { available: false, dimmable: false, colorTemperature: false };
  }
  const modes = entity.attributes.supported_color_modes;
  const supported = Array.isArray(modes) ? modes.filter((mode): mode is string => typeof mode === "string") : [];
  return {
    available: true,
    dimmable: supported.some((mode) => mode !== "onoff"),
    colorTemperature: supported.includes("color_temp"),
  };
}
