import { resolveHomeContext } from "./contextual-home";
import { H2DC_VIEWS, type CameraEntity, type H2DCConfig, type H2DCView } from "./domain";
import { lightCapabilities } from "./entity-capabilities";
import { escapeHtml, readEntity, readNumericState, type HassAttributeValue, type HassEntity, type HomeAssistant } from "./home-assistant";
import { projectHousePulse, type HousePulseCategory } from "./house-pulse";
import { resolveCurrentMedia, resolveHomeAssistantArtwork, type MediaArtwork } from "./media-artwork";
import { isOcppConfigured, projectOcpp, type OcppProjection } from "./ocpp-adapter";
import { derivePowerFlow, formatPower, type FlowDirection } from "./power-flow";
import { formatDecimal, formatNumericAttribute, formatNumericState } from "./value-format";

/** Immutable inputs shared by every route renderer. */
export interface RenderContext {
  readonly config: H2DCConfig;
  readonly hass: HomeAssistant;
  readonly now: Date;
  readonly reducedMotion: boolean;
  readonly mediaArtwork?: MediaArtwork;
  readonly powerFloAvailable?: boolean;
  readonly evChargingDemoActive?: boolean;
}

/** Returns an escaped Material Design icon element. */
function icon(name: string): string {
  return `<ha-icon icon="${escapeHtml(name)}" aria-hidden="true"></ha-icon>`;
}

/** Reads an attribute without asserting a broader Home Assistant shape. */
function attribute(entity: HassEntity | undefined, name: string): HassAttributeValue | undefined {
  return entity?.attributes[name];
}

/** Reads a displayable string attribute. */
function stringAttribute(entity: HassEntity | undefined, name: string, fallback: string): string {
  const value = attribute(entity, name);
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

/** Renders a resolved cover or the stable accessible fallback glyph. */
function mediaArtwork(context: RenderContext, compact: boolean): string {
  const artwork = resolvedMediaArtwork(context);
  if (artwork.status === "available") {
    return `<img class="media-artwork${compact ? " compact-artwork" : ""}" src="${escapeHtml(artwork.url)}" alt="${escapeHtml(artwork.alt)}" loading="eager" referrerpolicy="no-referrer">`;
  }
  return `<span class="media-artwork media-artwork-fallback${compact ? " compact-artwork" : ""}" role="img" aria-label="Album artwork unavailable">${icon("mdi:music-note")}</span>`;
}

/** Resolves the current cover once through the commissioned native-first artwork pipeline. */
function resolvedMediaArtwork(context: RenderContext): MediaArtwork {
  return context.mediaArtwork ?? resolveHomeAssistantArtwork(context.hass, context.config.entities.media);
}

/** Renders non-semantic cover art behind the Media focus card when a cover is available. */
function mediaArtworkBackdrop(context: RenderContext): string {
  const artwork = resolvedMediaArtwork(context);
  if (artwork.status !== "available") return "";
  return `<img class="now-artwork-backdrop" src="${escapeHtml(artwork.url)}" alt="" aria-hidden="true" loading="eager" referrerpolicy="no-referrer">`;
}

/** Reads a finite numeric attribute. */
function numericAttribute(entity: HassEntity | undefined, name: string, fallback: number): number {
  const value = Number(attribute(entity, name));
  return Number.isFinite(value) ? value : fallback;
}

/** Returns a presentable entity state without hiding unavailable telemetry as zero. */
function stateText(context: RenderContext, entityId: string | undefined, fallback = "Unavailable"): string {
  if (entityId === undefined || entityId === "") return fallback;
  const reading = readEntity(context.hass, entityId);
  return reading.status === "available" ? reading.entity.state.replaceAll("_", " ") : fallback;
}

/** Formats one numeric entity with dashboard-wide adaptive precision. */
function numericText(context: RenderContext, entityId: string | undefined): string {
  return formatNumericState(context.hass, entityId);
}

/** Builds an internal dashboard route. */
function viewPath(config: H2DCConfig, view: H2DCView): string {
  return `${config.dashboardPath.replace(/\/$/u, "")}/${view}`;
}

/** Renders persistent navigation and the current route context. */
function header(context: RenderContext, eyebrow: string, summary: string): string {
  const tabs = H2DC_VIEWS.filter((view) => context.config.navigation[view].visible
    && (view !== "energy" || context.powerFloAvailable !== false)
    && (view !== "charging" || (isOcppConfigured(context.config.entities.ocpp) && context.evChargingDemoActive !== false)));
  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(context.now);
  const dateHeading = context.config.view === "home" ? `<h1>${escapeHtml(date)}</h1>` : "";
  if (context.config.view === "home") eyebrow = resolveHomeContext(context.config, context.hass, context.now).eyebrow;
  const pageSubheading = context.config.view === "home"
    ? eyebrow === "Home overview" ? "" : `<span>${escapeHtml(eyebrow)}</span>`
    : `<h1 class="page-subheading">${escapeHtml(eyebrow)}</h1>`;
  return `<header><div class="brand">H2DC</div><nav class="nav" aria-label="Dashboard views">${tabs.map((path) => `<a class="${context.config.view === path ? "active" : ""}" href="${escapeHtml(viewPath(context.config, path))}">${escapeHtml(context.config.navigation[path].label)}</a>`).join("")}</nav><div class="tools">${icon("mdi:magnify")}<a href="?h2dc_admin=1" aria-label="Show Home Assistant controls">${icon("mdi:cog-outline")}</a></div><div class="intro">${pageSubheading}${dateHeading}<p>${escapeHtml(summary)}</p></div></header>`;
}

/** Formats an optional charging metric without implying that an absent measurand is zero. */
function chargingMetric(value: number | undefined, unit: string): string {
  return value === undefined ? "Unavailable" : `${formatDecimal(value)} ${unit}`;
}

/** Renders one compact OCPP measurement. */
function ocppMetric(label: string, value: string): string {
  return `<div class="ocpp-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

/** Renders model-independent OCPP session history supplied by a configured helper entity. */
function ocppHistory(projection: OcppProjection): string {
  if (projection.sessions.length === 0) return `<div class="ocpp-empty"><strong>No recorded sessions</strong><span>Configure a session-history helper to retain completed charges.</span></div>`;
  return projection.sessions.slice(0, 4).map((session) => {
    const started = new Date(session.startedAt);
    const label = Number.isNaN(started.getTime()) ? session.startedAt : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(started);
    return `<div class="ocpp-session"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(session.stopReason ?? (session.stoppedAt === undefined ? "In progress" : "Completed"))}</small></span><b>${escapeHtml(chargingMetric(session.energyKwh, "kWh"))}</b></div>`;
  }).join("");
}

/** Renders the optional, no-scroll EV Charging workspace from normalized OCPP telemetry. */
function renderCharging(context: RenderContext): string {
  const entities = context.config.entities.ocpp;
  if (!isOcppConfigured(entities)) {
    return `${header(context, "EV Charging unavailable", "Map an OCPP status entity to enable this optional workspace")}<main class="page-grid"><section class="glass dependency" role="status"><h2>EV Charging is disabled</h2><p>Add a compatible Home Assistant OCPP integration, commission the charger, and map its entities in H2DC. Missing measurements will remain unavailable.</p></section></main>`;
  }
  const projection = projectOcpp(context.hass, entities);
  const active = projection.state === "charging";
  const controlState = entities.chargeControl === undefined ? undefined : readEntity(context.hass, entities.chargeControl);
  const controlAvailable = controlState?.status === "available";
  const errorText = projection.errorCode === undefined || projection.errorCode.toLocaleLowerCase() === "noerror" ? "No active fault" : projection.errorCode;
  const connector = projection.connectorId ?? "Not reported";
  const demoBadge = projection.simulated ? `<span class="charging-demo-badge">Simulated preview</span>` : "";
  return `${header(context, "EV Charging overview", `${projection.stateLabel} · ${chargingMetric(projection.powerKw, "kW")} · Connector ${connector}`)}<main class="charging-workspace"><aside class="charging-rail" aria-label="Live charging telemetry"><section class="glass charging-panel"><div class="card-title">Live telemetry</div>${ocppMetric("State", projection.stateLabel)}${ocppMetric("Power", chargingMetric(projection.powerKw, "kW"))}${ocppMetric("Current", chargingMetric(projection.currentA, "A"))}${ocppMetric("Voltage", chargingMetric(projection.voltageV, "V"))}${ocppMetric("Temperature", chargingMetric(projection.temperatureC, "°C"))}</section><section class="glass charging-panel"><div class="card-title">Connector health</div>${ocppMetric("Connector", connector)}${ocppMetric("Transaction", projection.transactionId ?? "None")}${ocppMetric("Status", errorText)}</section></aside><section class="glass charging-focus ${projection.state}"><div class="card-title">EV charging ${demoBadge}</div><div class="charging-topology" aria-label="${active ? "Power is flowing from the home supply through the charger to the vehicle" : "Charger is not delivering power"}"><span class="charging-node">${icon("mdi:home-lightning-bolt-outline")}<small>Home supply</small></span><span class="charging-path ${active ? "active" : ""}" aria-hidden="true"><i></i></span><span class="charging-node charger">${icon("mdi:ev-station")}<strong>${escapeHtml(projection.stateLabel)}</strong><small>${escapeHtml(chargingMetric(projection.powerKw, "kW"))}</small></span><span class="charging-path ${active ? "active" : ""}" aria-hidden="true"><i></i></span><span class="charging-node">${icon("mdi:car-electric")}<small>Vehicle</small></span></div><div class="charging-session-summary">${ocppMetric("Session energy", chargingMetric(projection.sessionEnergyKwh, "kWh"))}${ocppMetric("Duration", chargingMetric(projection.sessionDurationMinutes, "min"))}${ocppMetric("Lifetime energy", chargingMetric(projection.totalEnergyKwh, "kWh"))}</div>${entities.chargeControl === undefined ? `<p class="charging-note">${projection.simulated ? "Read-only demo: no charger command will be sent." : "Remote charge control is not configured."}</p>` : `<button class="charging-control" data-action="ocpp-toggle" data-entity="${escapeHtml(entities.chargeControl)}" aria-pressed="${controlState?.status === "available" && controlState.entity.state === "on"}" ${controlAvailable ? "" : "disabled"}>${icon(active ? "mdi:stop-circle-outline" : "mdi:play-circle-outline")}<span>${active ? "Stop charging" : "Enable charging"}</span></button>`}</section><aside class="charging-rail" aria-label="Charging session history"><section class="glass charging-panel charging-history"><div class="card-title">Recent sessions</div>${ocppHistory(projection)}</section><section class="glass charging-panel"><div class="card-title">Operations</div>${ocppMetric("Availability", stateText(context, entities.availability))}${ocppMetric("Current limit", entities.maximumCurrent === undefined ? "Not configured" : `${numericText(context, entities.maximumCurrent)} A`)}<p class="charging-note">Controls appear only when their exact Home Assistant entities are mapped.</p></section></aside></main>`;
}

/** Renders a safe route-level explanation when the optional PowerFlo dependency is absent. */
function renderEnergyDisabled(context: RenderContext): string {
  return `${header(context, "Energy unavailable", "Install PowerFlo to enable live energy analysis")}<main class="page-grid"><section class="glass dependency" role="status"><h2>Energy is disabled</h2><p>H2DC detected that the PowerFlo custom card is not installed. Install PowerFlo and reload Home Assistant to enable this tab automatically.</p></section></main>`;
}

/** Maps Home Assistant weather conditions to Material Design icons. */
function weatherIcon(condition: string): string {
  const icons: Readonly<Record<string, string>> = {
    "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline",
    fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
    "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy",
    pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
    "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
  };
  return icons[condition] ?? "mdi:weather-cloudy-alert";
}

/** Renders one topology arrow only when motion is allowed and flow is active. */
function flowArrow(path: string, active: boolean, delay: string, reducedMotion: boolean): string {
  if (!active || reducedMotion) return "";
  return `<polygon class="flow-arrow" points="-7,-5 7,0 -7,5"><animateMotion dur="2s" begin="${delay}" repeatCount="indefinite" path="${path}" rotate="auto"/></polygon>`;
}

/** Returns whether a source/sink branch is carrying power. */
function activeFlow(direction: FlowDirection): boolean {
  return direction === "source" || direction === "sink";
}

/** Renders the live, signed and stale-aware PowerFlo topology. */
function energyFlow(context: RenderContext, interactive = false): string {
  const flow = derivePowerFlow(context.hass, context.config);
  const supplied = flow.solar === "source" || flow.battery === "source" || flow.grid === "source";
  const paths = {
    trunk: "M300 196 L300 142",
    solar: flow.solar === "sink" ? "M300 196 Q300 226 270 226 L130 226 Q100 226 100 256" : "M100 256 Q100 226 130 226 L270 226 Q300 226 300 196",
    battery: flow.battery === "sink" ? "M300 196 L300 256" : "M300 256 L300 196",
    grid: flow.grid === "sink" ? "M300 196 Q300 226 330 226 L470 226 Q500 226 500 256" : "M500 256 Q500 226 470 226 L330 226 Q300 226 300 196",
  } as const;
  const trigger = (detail: string, label: string, mdi: string): string => interactive
    ? `<button class="energy-node-trigger" data-action="energy-detail" data-detail="${detail}" aria-label="Open ${label} details">${icon(mdi)}</button>`
    : icon(mdi);
  const sourceNode = (x: number, detail: string, mdi: string, label: string, value: string, direction: FlowDirection): string => `<g class="node ${activeFlow(direction) ? "active" : ""}" transform="translate(${x} 304)"><circle r="38"/><foreignObject x="-22" y="-22" width="44" height="44">${trigger(detail, label, mdi)}</foreignObject><text y="66">${label}</text><text class="value" y="94">${escapeHtml(value)}</text></g>`;
  const destination = interactive ? `<button class="energy-node-trigger" data-action="energy-detail" data-detail="load" aria-label="Open home load details">${icon("mdi:home-outline")}</button>` : icon("mdi:home-outline");
  const batteryStatus = flow.battery === "sink"
    ? `<g class="battery-flow-status charging" transform="translate(230 72)"><text>Charging</text><text class="value" y="32">${escapeHtml(formatPower(flow.batteryPower))}</text><path class="charging-bolt" d="M-12 43 H-2 L-7 55 L9 38 H1 L7 27 Z" aria-hidden="true"/></g>`
    : flow.battery === "source"
      ? `<g class="battery-flow-status discharging" transform="translate(230 78)"><text>Discharging</text><text class="value" y="34">${escapeHtml(formatPower(flow.batteryPower))}</text></g>`
      : "";
  return `<section class="glass flow"><div class="card-title">Home energy ${interactive ? `<button class="card-link" data-action="energy-detail" data-detail="inverter" aria-label="Open inverter details">›</button>` : `<a href="${escapeHtml(viewPath(context.config, "energy"))}" aria-label="Open Energy">›</a>`}</div><div class="topology"><svg viewBox="0 0 600 440" role="img" aria-label="${escapeHtml(flow.summary)}"><path class="track ${supplied ? "active" : ""}" d="M300 196 L300 142"/><path class="track ${activeFlow(flow.solar) ? "active" : ""}" d="M100 256 Q100 226 130 226 L270 226 Q300 226 300 196"/><path class="track ${activeFlow(flow.battery) ? "active" : ""}" d="M300 196 L300 256"/><path class="track ${activeFlow(flow.grid) ? "active" : ""}" d="M300 196 Q300 226 330 226 L470 226 Q500 226 500 256"/>${flowArrow(paths.trunk, supplied, "0s", context.reducedMotion)}${flowArrow(paths.solar, activeFlow(flow.solar), "-.6s", context.reducedMotion)}${flowArrow(paths.battery, activeFlow(flow.battery), "-1.2s", context.reducedMotion)}${flowArrow(paths.grid, activeFlow(flow.grid), "-1.6s", context.reducedMotion)}${batteryStatus}<g class="home-node" transform="translate(300 92)"><circle r="54"/><foreignObject x="-28" y="-28" width="56" height="56">${destination}</foreignObject></g><g class="home-reading" transform="translate(370 78)"><text>Home load</text><text class="value" y="34">${escapeHtml(formatPower(flow.loadPower))}</text></g>${sourceNode(100, "solar", "mdi:solar-power", "Solar", formatPower(flow.solarPower), flow.solar)}${sourceNode(300, "battery", "mdi:battery-medium", "Battery", flow.batterySoc.status === "available" ? `${formatDecimal(flow.batterySoc.value)}%` : "—", flow.battery)}${sourceNode(500, "grid", "mdi:transmission-tower", "Grid", flow.gridAvailability === "unavailable" ? "Disconnected" : formatPower(flow.gridPower), flow.grid)}</svg></div><p class="flow-summary">${escapeHtml(flow.summary)}</p></section>`;
}

/** Resolves a room temperature from the HVAC controller before consulting a fallback sensor. */
function roomTemperatureText(context: RenderContext, climateId: string, fallbackSensorId?: string): string {
  const reading = readEntity(context.hass, climateId);
  if (reading.status === "available") {
    const currentTemperature = reading.entity.attributes.current_temperature;
    if (typeof currentTemperature === "number" && Number.isFinite(currentTemperature)) return formatDecimal(currentTemperature);
  }
  return fallbackSensorId === undefined ? "—" : numericText(context, fallbackSensorId);
}

/** Renders the cool/off control and bounded target-temperature stepper for one HVAC entity. */
function coolingControl(context: RenderContext, climateId = context.config.entities.climate): string {
  const reading = readEntity(context.hass, climateId);
  const climate = reading.status === "available" ? reading.entity : undefined;
  const cooling = climate?.state === "cool";
  const target = numericAttribute(climate, "temperature", 18);
  const minimum = numericAttribute(climate, "min_temp", 16);
  const maximum = numericAttribute(climate, "max_temp", 30);
  const step = numericAttribute(climate, "target_temp_step", 1);
  const decrease = Math.max(minimum, target - step);
  const increase = Math.min(maximum, target + step);
  const disabled = climate === undefined ? "disabled" : "";
  return `<div class="cooling-control"><button class="cool-toggle ${cooling ? "cool" : "off"}" data-action="climate-mode" data-entity="${climateId}" data-mode="${cooling ? "off" : "cool"}" aria-pressed="${cooling}" ${disabled}>${icon(cooling ? "mdi:snowflake" : "mdi:power")}<span><b>${cooling ? "Cool" : "Off"}</b><small>${cooling ? `Set to ${celsius(formatDecimal(target))}` : "Tap to cool"}</small></span></button><div class="target-control" aria-label="Target temperature"><button data-action="climate-temperature" data-entity="${climateId}" data-value="${decrease}" aria-label="Decrease target temperature" ${target <= minimum || climate === undefined ? "disabled" : ""}>&minus;</button><strong>${formatDecimal(target)}&deg;</strong><button data-action="climate-temperature" data-entity="${climateId}" data-value="${increase}" aria-label="Increase target temperature" ${target >= maximum || climate === undefined ? "disabled" : ""}>+</button></div></div>`;
}

/** Renders an escaped Celsius reading with a glyph-safe system-font unit. */
function celsius(value: string): string {
  return `${escapeHtml(value)} <span class="temperature-unit" aria-hidden="true">&deg;C</span><span class="sr-only"> degrees Celsius</span>`;
}

/** Renders one state-aware nearby control. */
function nearbyControl(context: RenderContext, entityId: string, label: string, mdi: string): string {
  const reading = readEntity(context.hass, entityId);
  const state = reading.status === "available" ? reading.entity.state : "unavailable";
  return `<button class="control ${escapeHtml(state)}" data-action="toggle" data-entity="${escapeHtml(entityId)}" aria-pressed="${state === "on"}" ${reading.status === "unavailable" ? "disabled" : ""}>${icon(mdi)}<span>${escapeHtml(label)}</span><small>${escapeHtml(state)}</small></button>`;
}

/** Renders one state-aware bottom navigation card. */
function summaryCard(context: RenderContext, mdi: string, label: string, value: string, view: H2DCView): string {
  return `<a class="glass summary" href="${escapeHtml(viewPath(context.config, view))}" aria-label="Open ${escapeHtml(label)}: ${escapeHtml(value)}"><span class="round">${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div><b aria-hidden="true">&rsaquo;</b></a>`;
}

/** Renders one compact House Pulse status card. */
function pulseCard(context: RenderContext, category: HousePulseCategory, mdi: string, label: string): string {
  const projection = projectHousePulse(context.config, context.hass, category);
  return `<button class="glass pulse-card" data-action="pulse-detail" data-category="${category}" aria-label="Open ${escapeHtml(label)} details: ${escapeHtml(projection.summary)}"><span class="pulse-icon">${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(projection.summary)}</small></div><b aria-hidden="true">&rsaquo;</b></button>`;
}

/** Renders the commissioned Home composition. */
function renderHome(context: RenderContext): string {
  const entities = context.config.entities;
  const alarm = stateText(context, entities.alarm).toLowerCase();
  const lightsOn = entities.lights.filter((item) => readEntity(context.hass, item.entity).status === "available" && context.hass.states[item.entity]?.state === "on").length;
  const weatherReading = readEntity(context.hass, entities.weather);
  const weather = weatherReading.status === "available" ? weatherReading.entity : undefined;
  const condition = weather?.state ?? "unavailable";
  const temperature = formatNumericAttribute(weather, "temperature");
  const humidity = formatNumericAttribute(weather, "humidity");
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(context.now);
  const currentMedia = resolveCurrentMedia(context.hass, entities.media);
  const mediaId = currentMedia?.entityId ?? entities.media.primary;
  const media = currentMedia?.entity ?? (mediaId === undefined ? undefined : context.hass.states[mediaId]);
  const climateState = stateText(context, entities.climate, "off");
  const livingRoomTemperature = roomTemperatureText(context, entities.climate, entities.roomTemperature);
  const nearby = entities.nearby.map((item) => nearbyControl(context, item.entity, item.label, item.icon)).join("");
  return `${header(context, "Home overview", `Alarm ${alarm} / ${lightsOn} selected lights on`)}<main class="home-grid"><div class="left-stack"><section class="glass clock"><strong>${escapeHtml(time)}</strong></section><section class="glass weather weather-${escapeHtml(condition.replace(/[^a-z-]/gu, ""))}"><div>${icon(weatherIcon(condition))}</div><div><strong>${celsius(escapeHtml(temperature))}</strong><span>${escapeHtml(condition.replaceAll("_", " "))}</span><small>Humidity ${escapeHtml(humidity)}%</small></div></section></div>${energyFlow(context)}<div class="right-stack"><section class="glass compact"><div class="card-title">Climate <a href="${escapeHtml(viewPath(context.config, "climate"))}" aria-label="Open Climate">&rsaquo;</a></div><div class="climate-body"><div class="climate-reading"><strong>${celsius(livingRoomTemperature)}</strong><small>Living room</small></div>${coolingControl(context)}</div></section><section class="glass compact"><div class="card-title">Now playing <a href="${escapeHtml(viewPath(context.config, "media"))}" aria-label="Open Media">&rsaquo;</a></div><div class="media-row">${mediaArtwork(context, true)}<div><strong>${escapeHtml(stringAttribute(media, "media_title", "No media playing"))}</strong><small>${escapeHtml(stringAttribute(media, "media_artist", "Surround speakers"))}</small></div>${mediaId === undefined ? "" : `<button class="media-action" data-action="media" data-entity="${escapeHtml(mediaId)}" data-command="media_play_pause" aria-label="Play or pause" ${media === undefined ? "disabled" : ""}>${icon("mdi:play-pause")}</button>`}</div></section><section class="glass controls"><div class="card-title">Nearby controls</div>${nearby || `<p>No nearby controls configured.</p>`}</section></div><div class="summary-row">${summaryCard(context, "mdi:shield-home", "Security", `Alarm ${alarm}`, "security")}${summaryCard(context, "mdi:lightbulb-group", "Lights", `${lightsOn} on`, "lights")}${summaryCard(context, "mdi:thermometer", "Climate", `${livingRoomTemperature} degrees Celsius / ${climateState}`, "climate")}${summaryCard(context, "mdi:solar-power", "Solar", formatPower(readNumericState(context.hass, entities.energy.solar)), "energy")}</div><div class="pulse-row">${pulseCard(context, "access", "mdi:door-closed-lock", "Access")}${pulseCard(context, "presence", "mdi:motion-sensor", "Presence")}${pulseCard(context, "comfort", "mdi:home-thermometer-outline", "Comfort")}${pulseCard(context, "attention", "mdi:alert-circle-outline", "Attention")}</div></main>`;
}

/** Validates a camera image path before placing it in an image source. */
function safeImageUrl(value: unknown, entityId: string): string {
  if (typeof value === "string" && (value.startsWith("/api/") || value.startsWith("/local/") || value.startsWith("/media/") || value.startsWith("https://") || value.startsWith("data:image/"))) return value;
  return `/api/camera_proxy/${encodeURIComponent(entityId)}`;
}

/**
 * Renders one camera tile with a bandwidth-conscious snapshot source.
 *
 * @param context - Current renderer state and Home Assistant entities.
 * @param camera - High-resolution camera plus its optional medium stream entity.
 * @param index - Visual tile index used to prioritize the first visible row.
 * @returns Accessible camera tile markup.
 */
function cameraTile(context: RenderContext, camera: CameraEntity, index: number): string {
  const reading = readEntity(context.hass, camera.entity);
  const label = escapeHtml(camera.label);
  if (reading.status === "unavailable") return `<figure class="camera unavailable"><div class="camera-missing">${icon("mdi:camera-off-outline")}<span>Camera unavailable</span></div><span class="camera-caption"><strong>${label}</strong><span>Offline</span></span></figure>`;
  const medium = camera.mediumStreamEntity;
  const mediumReading = medium === undefined ? undefined : readEntity(context.hass, medium);
  const mediumAvailable = mediumReading?.status === "available";
  // Prefer the medium channel for thumbnails so nine simultaneous snapshots do not saturate the tablet.
  const thumbnailReading = mediumAvailable ? mediumReading : reading;
  const thumbnailEntity = mediumAvailable && medium !== undefined ? medium : camera.entity;
  const source = safeImageUrl(attribute(thumbnailReading?.entity, "entity_picture"), thumbnailEntity);
  const status = medium === undefined ? "Medium stream not configured" : mediumAvailable ? "Open medium stream" : "Medium stream unavailable";
  // Eagerly fetch the first row; defer the remaining six until the browser has spare capacity.
  const loading = index < 3 ? "eager" : "lazy";
  const priority = index < 3 ? "high" : "low";
  const content = `<img src="${escapeHtml(source)}" alt="${label} camera" loading="${loading}" fetchpriority="${priority}" decoding="async"><span class="camera-caption"><strong>${label}</strong><span>${escapeHtml(status)}</span></span>`;
  if (!mediumAvailable || medium === undefined) return `<figure class="camera unavailable-stream" aria-label="${label}: ${escapeHtml(status)}">${content}</figure>`;
  return `<button class="camera camera-action" data-action="camera-detail" data-entity="${escapeHtml(medium)}" data-label="${label}" aria-label="Open ${label} medium-quality live stream">${content}</button>`;
}

/** Renders the Security view. */
function renderSecurity(context: RenderContext): string {
  const alarm = stateText(context, context.config.entities.alarm).toLowerCase();
  const cameras = context.config.entities.cameras;
  const alarmId = escapeHtml(context.config.entities.alarm);
  const alarmDisabled = readEntity(context.hass, context.config.entities.alarm).status === "unavailable" ? "disabled" : "";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Disarm"] as const;
  const keypad = keys.map((key) => key === "Clear"
    ? `<button class="keypad-key keypad-secondary" data-action="alarm-code-clear">Clear</button>`
    : key === "Disarm"
      ? `<button class="keypad-key keypad-submit" data-action="alarm-code-submit" ${alarmDisabled}>Disarm</button>`
      : `<button class="keypad-key" data-action="alarm-code-digit" data-digit="${key}" aria-label="Alarm digit ${key}">${key}</button>`).join("");
  return `${header(context, "Security overview", `Alarm ${alarm} / ${cameras.length} configured zones`)}<main class="page-grid security-grid"><aside class="alarm-stack"><section class="glass alarm"><div class="card-title">Alarm system</div><div class="alarm-status"><span class="alarm-ring">${icon("mdi:shield-outline")}</span><strong>${escapeHtml(alarm)}</strong></div><div class="alarm-actions"><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_home" ${alarmDisabled}>${icon("mdi:home-outline")}Home</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_away" ${alarmDisabled}>${icon("mdi:walk")}Away</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_night" ${alarmDisabled}>${icon("mdi:weather-night")}Night</button></div></section><section class="glass alarm-keypad"><div class="card-title">Alarm keypad</div><output class="keypad-display" data-alarm-code-display aria-live="polite" aria-label="No alarm code entered">Enter code</output><div class="keypad-grid">${keypad}</div></section></aside><section class="camera-grid">${cameras.length === 0 ? `<section class="glass empty"><div><h2>No cameras configured</h2><p>Add camera entities in the visual editor to populate this view.</p></div></section>` : cameras.map((item, index) => cameraTile(context, item, index)).join("")}</section></main>`;
}

/** Renders the detailed Energy view. */
function renderEnergy(context: RenderContext): string {
  const entities = context.config.entities.energy;
  const flow = derivePowerFlow(context.hass, context.config);
  const metric = (label: string, value: string, detail: string): string => `<button class="energy-metric" data-action="energy-detail" data-detail="${detail}"><span>${label}</span><strong>${escapeHtml(value)}</strong><b aria-hidden="true">›</b></button>`;
  const status = stateText(context, entities.inverterStatus, flow.freshness === "fresh" ? "Online" : "Telemetry unavailable");
  const relay = flow.gridAvailability === "available" ? "Connected" : flow.gridAvailability === "unavailable" ? "Disconnected" : "Unknown";
  return `${header(context, "Energy overview", `${flow.summary} · Battery ${numericText(context, entities.batterySoc)}% · Grid relay ${relay}`)}<main class="energy-workspace"><aside class="energy-rail energy-rail-left" aria-label="Current energy analytics"><section class="glass energy-panel"><div class="card-title">Today</div>${metric("Solar", formatPower(flow.solarPower), "solar")}${metric("Grid", formatPower(flow.gridPower), "grid")}${metric("Battery", formatPower(flow.batteryPower), "battery")}${metric("Protected load", formatPower(flow.loadPower), "load")}</section><section class="glass energy-panel"><div class="card-title">System health</div>${metric("Inverter", status, "inverter")}${metric("Grid relay", relay, "grid")}${metric("AC stage", `${numericText(context, entities.acTemperature)} °C`, "inverter")}${metric("DC stage", `${numericText(context, entities.dcTemperature)} °C`, "inverter")}</section><button class="glass energy-shortcut" data-action="energy-detail" data-detail="history">${icon("mdi:chart-timeline-variant")}<span><strong>History and diagnostics</strong><small>Recorder graphs, data quality and outage evidence</small></span><b aria-hidden="true">›</b></button></aside><div class="energy-focus">${energyFlow(context, true)}</div><aside class="energy-rail energy-rail-right" aria-label="Energy planning analytics"><section class="glass energy-panel"><div class="card-title">Battery outlook</div>${metric("State of charge", `${numericText(context, entities.batterySoc)}%`, "battery")}${metric("Current flow", formatPower(flow.batteryPower), "battery")}<p class="energy-note"><strong>Two independent estimates</strong><span>Runtime to reserve and charge-to-target remain together in PowerFlo.</span></p></section><section class="glass energy-panel"><div class="card-title">Outage readiness</div>${metric("Grid supply", relay, "grid")}${metric("Reserve", `${formatDecimal(context.config.powerFlo.batteryReserveSoc)}%`, "readiness")}${metric("Deadline", context.config.powerFlo.readinessDeadline, "readiness")}</section><button class="glass energy-shortcut" data-action="energy-detail" data-detail="analysis">${icon("mdi:solar-power-variant-outline")}<span><strong>Complete PowerFlo analysis</strong><small>Forecasts, readiness, history and source insights</small></span><b aria-hidden="true">›</b></button></aside></main>`;
}

/** Renders one room temperature. */
function temperatureRow(context: RenderContext, entityId: string, room: string, mdi: string): string {
  return `<section class="glass temp-row"><span class="round">${icon(mdi)}</span><div><small>${escapeHtml(room)}</small><strong>${celsius(numericText(context, entityId))}</strong></div><b aria-hidden="true">›</b></section>`;
}

/** Renders one room HVAC card with authoritative controller temperature and optional sensor fallback. */
function thermostatCard(context: RenderContext, climateId: string, room: string, fallbackSensorId?: string): string {
  const temperature = roomTemperatureText(context, climateId, fallbackSensorId);
  return `<section class="glass thermostat"><div class="card-title">${escapeHtml(room)} air conditioning</div><div class="climate-reading"><strong>${celsius(temperature)}</strong><small>${escapeHtml(room)}</small></div>${coolingControl(context, climateId)}</section>`;
}

/** Renders the detailed Climate view. */
function renderClimate(context: RenderContext): string {
  const entities = context.config.entities;
  const weatherReading = readEntity(context.hass, entities.weather);
  const weather = weatherReading.status === "available" ? weatherReading.entity : undefined;
  const temperatures = entities.roomTemperatures.map((item) => temperatureRow(context, item.entity, item.room, item.icon)).join("");
  const condition = weather?.state ?? "unavailable";
  const conditionClass = condition.replace(/[^a-z-]/gu, "") || "unavailable";
  const outsideTemperature = weather === undefined ? "—" : formatNumericAttribute(weather, "temperature");
  const configuredClimateRooms = context.config.rooms.filter((room) => room.climate !== undefined);
  const climateRooms = configuredClimateRooms.length > 0
    ? configuredClimateRooms
    : [{ id: "living-room", name: "Living room", climate: entities.climate, temperature: entities.roomTemperature, humidity: undefined, occupancy: [], lights: [], switches: [], media: [] }];
  const thermostats = climateRooms.map((room) => thermostatCard(context, room.climate ?? entities.climate, room.name, room.temperature)).join("");
  const primaryRoom = climateRooms[0];
  const primaryClimateId = primaryRoom?.climate ?? entities.climate;
  const primaryFallbackId = primaryRoom?.temperature ?? entities.roomTemperature;
  return `${header(context, "Climate overview", `Air conditioning ${stateText(context, primaryClimateId, "off")} · ${escapeHtml(primaryRoom?.name ?? "Living room")} ${roomTemperatureText(context, primaryClimateId, primaryFallbackId)} degrees Celsius`)}<main class="page-grid climate-grid"><div class="temps">${temperatures || `<section class="glass empty"><p>No supporting room sensors configured.</p></section>`}</div><div class="thermostats">${thermostats}</div><div class="climate-right"><section class="glass outside weather-surface weather-${escapeHtml(conditionClass)}" data-weather-condition="${escapeHtml(conditionClass)}">${icon(weatherIcon(condition))}<div><small>Outside</small><strong>${celsius(outsideTemperature)}</strong><span>${escapeHtml(condition.replaceAll("_", " "))}</span></div></section></div></main>`;
}

/** Resolves concise, non-repeating household copy without exposing an entity ID. */
function deviceCardCopy(entity: HassEntity | undefined, entityId: string, room: string, fallbackName: "Light" | "Switch", label?: string): { readonly room: string; readonly name: string } {
  const normalizedRoom = room.replace(/\s+/gu, " ").trim();
  const configuredName = label?.replace(/\s+/gu, " ").trim();
  const withoutConfiguredName = configuredName !== undefined && configuredName !== "" && normalizedRoom.toLocaleLowerCase().endsWith(` ${configuredName.toLocaleLowerCase()}`)
    ? normalizedRoom.slice(0, -(configuredName.length + 1)).trim()
    : normalizedRoom;
  const conciseRoom = withoutConfiguredName.replace(/\s+(?:lights?|switches?|controls?)$/iu, "").trim() || normalizedRoom;
  if (configuredName !== undefined && configuredName !== "") return { room: conciseRoom, name: configuredName };

  const friendlyName = stringAttribute(entity, "friendly_name", "").replace(/\s+/gu, " ").trim();
  // Never expose implementation identifiers when a configured entity is temporarily unavailable.
  if (friendlyName === "" || friendlyName === entityId) return { room: conciseRoom, name: fallbackName };

  // Remove a room prefix only when the remaining copy still identifies the device.
  const roomPrefix = `${conciseRoom} `;
  const candidate = friendlyName.toLocaleLowerCase().startsWith(roomPrefix.toLocaleLowerCase())
    ? friendlyName.slice(roomPrefix.length).trim()
    : friendlyName;
  const genericNames = new Set(["light", "lights", "switch", "switches", "control", "controls"]);
  const name = candidate !== "" && !genericNames.has(candidate.toLocaleLowerCase()) ? candidate : friendlyName;
  return { room: conciseRoom, name };
}

/** Renders one capability-aware light card. */
function lightCard(context: RenderContext, entityId: string, room: string, mdi: string, label?: string): string {
  const reading = readEntity(context.hass, entityId);
  const entity = reading.status === "available" ? reading.entity : undefined;
  const capabilities = lightCapabilities(entity);
  const state = entity?.state ?? "unavailable";
  const stateClass = state === "on" ? "on" : state === "off" ? "off" : "unavailable";
  const brightness = numericAttribute(entity, "brightness", state === "on" ? 255 : 0);
  const percent = Math.round((brightness / 255) * 100);
  const copy = deviceCardCopy(entity, entityId, room, "Light", label);
  return `<section class="glass light-card ${stateClass}"><button class="light-card-surface" data-action="toggle" data-entity="${escapeHtml(entityId)}" aria-label="Toggle ${escapeHtml(copy.name)}" aria-pressed="${state === "on"}" ${capabilities.available ? "" : "disabled"}><span class="light-heading"><span class="round">${icon(mdi)}</span><span><small>${escapeHtml(copy.room)}</small><strong>${escapeHtml(copy.name)}</strong></span><span class="light-toggle-icon">${icon(state === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb-outline")}</span></span><span class="light-state"><span>${escapeHtml(state)}</span>${capabilities.dimmable ? `<b>${formatDecimal(percent)}%</b>` : ""}</span></button>${capabilities.dimmable ? `<input type="range" min="1" max="100" value="${Math.max(1, percent)}" data-action="brightness" data-entity="${escapeHtml(entityId)}" aria-label="${escapeHtml(copy.name)} brightness" ${capabilities.available ? "" : "disabled"}>` : ""}</section>`;
}

/** Renders one binary household switch with an explicit on/off state echo. */
function switchCard(context: RenderContext, entityId: string, room: string, mdi: string, label?: string): string {
  const reading = readEntity(context.hass, entityId);
  const entity = reading.status === "available" ? reading.entity : undefined;
  const state = entity?.state ?? "unavailable";
  const stateClass = state === "on" ? "on" : state === "off" ? "off" : "unavailable";
  const copy = deviceCardCopy(entity, entityId, room, "Switch", label);
  return `<section class="glass switch-card ${stateClass}"><button class="switch-card-surface" data-action="toggle" data-entity="${escapeHtml(entityId)}" aria-label="Toggle ${escapeHtml(copy.name)}" aria-pressed="${state === "on"}" ${entity === undefined ? "disabled" : ""}><span class="light-heading"><span class="round">${icon(mdi)}</span><span><small>${escapeHtml(copy.room)}</small><strong>${escapeHtml(copy.name)}</strong></span><span class="light-toggle-icon">${icon(state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline")}</span></span><span class="light-state"><span>${escapeHtml(state)}</span><b>${state === "on" ? "On" : state === "off" ? "Off" : "—"}</b></span></button></section>`;
}

/** Renders the curated Lights view. */
function renderLights(context: RenderContext): string {
  const lights = context.config.entities.lights;
  const switches = context.config.entities.switches;
  // The first configured switch row contains lighting circuits. Keep their
  // switch domain and service semantics while presenting them with Lights.
  const lightingSwitches = switches.slice(0, 4);
  const utilitySwitches = switches.slice(4);
  const activeLights = lights.filter((item) => context.hass.states[item.entity]?.state === "on").length;
  const activeLightingSwitches = lightingSwitches.filter((item) => context.hass.states[item.entity]?.state === "on").length;
  const activeUtilitySwitches = utilitySwitches.filter((item) => context.hass.states[item.entity]?.state === "on").length;
  const lightingControlCount = lights.length + lightingSwitches.length;
  const activeLightingControlCount = activeLights + activeLightingSwitches;
  const lightCards = lightingControlCount === 0
    ? `<section class="glass empty compact-empty"><div><h2>No lights configured</h2><p>Add the household lights that belong on this dashboard.</p></div></section>`
    : `${lightingSwitches.map((item) => switchCard(context, item.entity, item.room, item.icon, item.label)).join("")}${lights.map((item) => lightCard(context, item.entity, item.room, item.icon, item.label)).join("")}`;
  const switchCards = utilitySwitches.length === 0
    ? `<section class="glass empty compact-empty"><div><h2>No switches configured</h2><p>Add household switches only; infrastructure controls stay excluded.</p></div></section>`
    : utilitySwitches.map((item) => switchCard(context, item.entity, item.room, item.icon, item.label)).join("");
  return `${header(context, "Lighting and switches", `${activeLightingControlCount} lighting controls on / ${activeUtilitySwitches} switches on`)}<main class="lights-workspace"><section class="device-section" aria-labelledby="lights-heading"><div class="device-section-heading"><h2 id="lights-heading">Lights</h2><span>${activeLightingControlCount} of ${lightingControlCount} on</span></div><div class="device-grid lights-grid">${lightCards}</div></section><section class="device-section" aria-labelledby="switches-heading"><div class="device-section-heading"><h2 id="switches-heading">Switches</h2><span>${activeUtilitySwitches} of ${utilitySwitches.length} on</span></div><div class="device-grid switches-grid">${switchCards}</div></section></main>`;
}

/** Renders one media room row. */
function mediaRow(context: RenderContext, entityId: string | undefined, label: string, mdi: string): string {
  if (entityId === undefined) return `<div class="room-row unavailable"><span>${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>Not configured</small></div></div>`;
  const reading = readEntity(context.hass, entityId);
  const entity = reading.status === "available" ? reading.entity : undefined;
  return `<div class="room-row"><span>${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(stringAttribute(entity, "media_title", entity?.state ?? "Unavailable"))}</small></div><button class="media-action" data-action="media" data-entity="${escapeHtml(entityId)}" data-command="media_play_pause" aria-label="Play or pause ${escapeHtml(label)}" ${entity === undefined ? "disabled" : ""}>${icon("mdi:play-pause")}</button></div>`;
}

/** Renders the whole-house Media view. */
function renderMedia(context: RenderContext): string {
  const media = context.config.entities.media;
  const currentMedia = resolveCurrentMedia(context.hass, media);
  const selectedId = currentMedia?.entityId ?? media.primary;
  const primary = currentMedia?.entity ?? (selectedId === undefined ? undefined : context.hass.states[selectedId]);
  const primaryId = selectedId === undefined ? undefined : escapeHtml(selectedId);
  const primaryDisabled = primary === undefined ? "disabled" : "";
  return `${header(context, "Media overview", "Whole-house audio and television control")}<main class="page-grid media-grid"><section class="glass rooms media-living"><div class="card-title">Living room</div>${mediaRow(context, media.primary, "Surround speakers", "mdi:speaker-multiple")}${mediaRow(context, media.livingTv, "Living room TV", "mdi:television")}</section><section class="glass now media-now">${mediaArtworkBackdrop(context)}<div class="now-content"><div class="card-title">Now playing</div><div class="album">${mediaArtwork(context, false)}</div><h2>${escapeHtml(stringAttribute(primary, "media_title", "No media playing"))}</h2><span>${escapeHtml(stringAttribute(primary, "media_artist", "Select a source to start listening"))}</span>${primaryId === undefined ? "" : `<div class="transport"><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_previous_track" aria-label="Previous track" ${primaryDisabled}>${icon("mdi:skip-previous")}</button><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_play_pause" aria-label="Play or pause" ${primaryDisabled}>${icon("mdi:play")}</button><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_next_track" aria-label="Next track" ${primaryDisabled}>${icon("mdi:skip-next")}</button></div>`}</div></section><section class="glass rooms media-private"><div class="card-title">Private rooms</div>${mediaRow(context, media.bedroom, "Master bedroom", "mdi:bed-king-outline")}${mediaRow(context, media.study, "Study", "mdi:bookshelf")}</section><section class="glass rooms media-whole"><div class="card-title">Common areas</div>${mediaRow(context, media.family, "Family lounge", "mdi:sofa-outline")}${mediaRow(context, media.kitchen, "Kitchen", "mdi:silverware-fork-knife")}${mediaRow(context, media.dining, "Dining", "mdi:table-furniture")}${mediaRow(context, media.roam, "Sonos Roam", "mdi:speaker-wireless")}</section><section class="glass quick media-quick"><div class="card-title">Quick controls</div>${primaryId === undefined ? "" : `<button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_pause" ${primaryDisabled}>${icon("mdi:pause")} Pause all</button>`}${context.config.sonoraUrl === undefined ? `<p>Sonos controller URL not configured.</p>` : `<a href="${escapeHtml(viewPath(context.config, "sonos"))}">${icon("mdi:speaker-multiple")} Open Sonos controller</a>`}</section></main>`;
}

/** Renders Sonora inside the persistent H2DC shell so dashboard navigation remains available. */
function renderSonos(context: RenderContext): string {
  return `${header(context, "Sonos controller", "Connected whole-house audio control")}<main class="sonos-workspace">${context.config.sonoraUrl === undefined ? `<section class="glass empty"><div>${icon("mdi:speaker-multiple")}<h2>Whole-house audio</h2><p>Add the HTTPS Sonora URL in the visual editor.</p></div></section>` : `<iframe class="sonos-frame" src="${escapeHtml(context.config.sonoraUrl)}" title="Sonos whole-house controller" loading="eager" referrerpolicy="no-referrer" allow="autoplay; fullscreen"></iframe><div class="sonos-curtain" data-sonos-curtain role="status"><span>${icon("mdi:speaker-multiple")}</span><strong>Preparing Sonos controls</strong><small>Applying the H2DC appearance</small></div>`}</main>`;
}

/** Renders one read-only diagnostic entity. */
function diagnostic(context: RenderContext, mdi: string, label: string, entityId: string | undefined, suffix = "", action?: "poe-toggle" | "ev-demo-toggle"): string {
  const numeric = entityId === undefined ? { status: "unavailable" as const } : readNumericState(context.hass, entityId);
  // Binary and text diagnostics retain their state words; only finite telemetry is decimalized.
  const state = numeric.status === "available" ? formatDecimal(numeric.value) : stateText(context, entityId);
  const available = state !== "Unavailable";
  const actionHint = state === "on" ? "Tap to turn off" : state === "off" ? "Tap to turn on" : "Control unavailable";
  const body = `<span class="round">${icon(mdi)}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(state)}${available ? escapeHtml(suffix) : ""}</strong><span class="diagnostic-hint">${action !== undefined && available ? actionHint : available ? "Live status" : "Not configured"}</span></div>`;
  return action !== undefined && entityId !== undefined
    ? `<button class="glass diagnostic diagnostic-control ${available ? "available" : "unavailable"}" data-action="${action}" data-entity="${escapeHtml(entityId)}" ${available ? "" : "disabled"}>${body}</button>`
    : `<section class="glass diagnostic ${available ? "available" : "unavailable"}">${body}</section>`;
}

/** Renders read-only tablet and PoE diagnostics. */
function renderDiagnostics(context: RenderContext): string {
  const entities = context.config.entities.diagnostics;
  const values: readonly (readonly [string, string, string | undefined, string])[] = [
    ["mdi:battery", "Tablet battery", entities.tabletBattery, "%"], ["mdi:power-plug", "Tablet power", entities.pluggedIn, ""],
    ["mdi:tablet-dashboard", "Tablet screen", entities.screen, ""], ["mdi:web", "Current page", entities.currentPage, ""],
    ["mdi:ethernet", "PoE port", entities.poe, ""], ["mdi:flash", "PoE draw", entities.poePower, " W"],
  ];
  const unavailable = values.filter(([, , entityId]) => stateText(context, entityId) === "Unavailable").length;
  return `${header(context, "System overview", unavailable === 0 ? "Tablet and PoE telemetry online" : `${unavailable} diagnostics unavailable`)}<main class="page-grid diagnostics-grid">${values.map(([mdi, label, entityId, suffix]) => diagnostic(context, mdi, label, entityId, suffix, label === "PoE port" ? "poe-toggle" : undefined)).join("")}${diagnostic(context, "mdi:ev-station", "EV simulation", entities.evChargingDemoControl, "", "ev-demo-toggle")}<section class="glass diagnostic-note"><div class="card-title">Commissioning status</div><p>Tablet telemetry remains read-only. PoE changes require confirmation; EV simulation only changes whether the demonstration tab is available.</p></section></main>`;
}

/** Renders one stable H2DC route with exhaustive handling. */
export function renderView(context: RenderContext): string {
  switch (context.config.view) {
    case "home": return renderHome(context);
    case "security": return renderSecurity(context);
    case "energy": return context.powerFloAvailable === false ? renderEnergyDisabled(context) : renderEnergy(context);
    case "charging": return renderCharging(context);
    case "climate": return renderClimate(context);
    case "lights": return renderLights(context);
    case "media": return renderMedia(context);
    case "sonos": return renderSonos(context);
    case "diagnostics": return renderDiagnostics(context);
    default: {
      const exhaustive: never = context.config.view;
      return exhaustive;
    }
  }
}
