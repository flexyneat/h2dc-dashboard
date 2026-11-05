import { resolveHomeContext } from "./contextual-home";
import type { CameraEntity, H2DCConfig, H2DCView } from "./domain";
import { lightCapabilities } from "./entity-capabilities";
import { escapeHtml, readEntity, readNumericState, type HassAttributeValue, type HassEntity, type HomeAssistant } from "./home-assistant";
import { resolveCurrentMedia, resolveHomeAssistantArtwork, type MediaArtwork } from "./media-artwork";
import { derivePowerFlow, formatPower, type FlowDirection } from "./power-flow";
import { formatDecimal, formatNumericAttribute, formatNumericState } from "./value-format";

/** Immutable inputs shared by every route renderer. */
export interface RenderContext {
  readonly config: H2DCConfig;
  readonly hass: HomeAssistant;
  readonly now: Date;
  readonly reducedMotion: boolean;
  readonly mediaArtwork?: MediaArtwork;
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

/** Renders the persistent eight-route navigation and context header. */
function header(context: RenderContext, eyebrow: string, summary: string): string {
  const tabs: readonly (readonly [H2DCView, string])[] = [
    ["home", "Home"], ["security", "Security"], ["energy", "Energy"], ["climate", "Climate"],
    ["lights", "Lights"], ["media", "Media"], ["sonos", "Sonos"], ["diagnostics", "System"],
  ];
  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(context.now);
  const dateHeading = context.config.view === "home" ? `<h1>${escapeHtml(date)}</h1>` : "";
  if (context.config.view === "home") eyebrow = resolveHomeContext(context.config, context.hass, context.now).eyebrow;
  const pageSubheading = context.config.view === "home"
    ? eyebrow === "Home overview" ? "" : `<span>${escapeHtml(eyebrow)}</span>`
    : `<h1 class="page-subheading">${escapeHtml(eyebrow)}</h1>`;
  return `<header><div class="brand">H2DC</div><nav class="nav" aria-label="Dashboard views">${tabs.map(([path, label]) => `<a class="${context.config.view === path ? "active" : ""}" href="${escapeHtml(viewPath(context.config, path))}">${label}</a>`).join("")}</nav><div class="tools">${icon("mdi:magnify")}<a href="?h2dc_admin=1" aria-label="Show Home Assistant controls">${icon("mdi:cog-outline")}</a></div><div class="intro">${pageSubheading}${dateHeading}<p>${escapeHtml(summary)}</p></div></header>`;
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

/** Renders the cool/off control and bounded target-temperature stepper. */
function coolingControl(context: RenderContext): string {
  const climateId = context.config.entities.climate;
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

/** Returns a concise state summary for one House Pulse category. */
function pulseValue(context: RenderContext, category: "access" | "presence" | "comfort" | "attention"): string {
  const items = context.config.entities.housePulse[category];
  if (items.length === 0) return "Not configured";
  const available = items.flatMap((item) => {
    const reading = readEntity(context.hass, item.entity);
    return reading.status === "available" ? [{ item, entity: reading.entity }] : [];
  });
  const unavailableCount = items.length - available.length;
  if (category === "comfort" && available.length === 0) return "Comfort telemetry unavailable";
  if (unavailableCount > 0) return `${unavailableCount} source${unavailableCount === 1 ? "" : "s"} unavailable`;
  if (category === "comfort") {
    const first = available[0];
    if (first === undefined) return "Comfort telemetry unavailable";
    const numericState = Number(first.entity.state);
    if (!Number.isFinite(numericState)) return "Comfort telemetry unavailable";
    const unit = typeof first.entity.attributes.unit_of_measurement === "string" ? first.entity.attributes.unit_of_measurement : "";
    return `${first.item.label} ${formatDecimal(numericState)}${unit}`;
  }
  const active = available.filter(({ entity }) => {
    if (category === "attention") return !["0", "off", "ok", "none", "clear"].includes(entity.state.toLowerCase());
    if (category === "access") return ["on", "open", "unlocked"].includes(entity.state.toLowerCase());
    return ["on", "home", "occupied", "present"].includes(entity.state.toLowerCase());
  });
  if (category === "access") return active.length === 0 ? "All secure" : `${active.length} open or unlocked`;
  if (category === "presence") return active.length === 0 ? "No presence" : active.length === 1 ? `${active[0]?.item.label ?? "Area"} occupied` : `${active.length} areas occupied`;
  return active.length === 0 ? "No issues" : active.length === 1 ? `${active[0]?.item.label ?? "Item"} needs attention` : `${active.length} items need attention`;
}

/** Renders one compact House Pulse status card. */
function pulseCard(context: RenderContext, category: "access" | "presence" | "comfort" | "attention", mdi: string, label: string): string {
  const value = pulseValue(context, category);
  return `<section class="glass pulse-card" aria-label="${escapeHtml(label)}: ${escapeHtml(value)}"><span class="pulse-icon">${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div></section>`;
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
  const nearby = entities.nearby.map((item) => nearbyControl(context, item.entity, item.label, item.icon)).join("");
  return `${header(context, "Home overview", `Alarm ${alarm} / ${lightsOn} selected lights on`)}<main class="home-grid"><div class="left-stack"><section class="glass clock"><strong>${escapeHtml(time)}</strong></section><section class="glass weather weather-${escapeHtml(condition.replace(/[^a-z-]/gu, ""))}"><div>${icon(weatherIcon(condition))}</div><div><strong>${celsius(escapeHtml(temperature))}</strong><span>${escapeHtml(condition.replaceAll("_", " "))}</span><small>Humidity ${escapeHtml(humidity)}%</small></div></section></div>${energyFlow(context)}<div class="right-stack"><section class="glass compact"><div class="card-title">Climate <a href="${escapeHtml(viewPath(context.config, "climate"))}" aria-label="Open Climate">&rsaquo;</a></div><div class="climate-body"><div class="climate-reading"><strong>${celsius(numericText(context, entities.roomTemperature))}</strong><small>Living room</small></div>${coolingControl(context)}</div></section><section class="glass compact"><div class="card-title">Now playing <a href="${escapeHtml(viewPath(context.config, "media"))}" aria-label="Open Media">&rsaquo;</a></div><div class="media-row">${mediaArtwork(context, true)}<div><strong>${escapeHtml(stringAttribute(media, "media_title", "No media playing"))}</strong><small>${escapeHtml(stringAttribute(media, "media_artist", "Surround speakers"))}</small></div>${mediaId === undefined ? "" : `<button class="media-action" data-action="media" data-entity="${escapeHtml(mediaId)}" data-command="media_play_pause" aria-label="Play or pause" ${media === undefined ? "disabled" : ""}>${icon("mdi:play-pause")}</button>`}</div></section><section class="glass controls"><div class="card-title">Nearby controls</div>${nearby || `<p>No nearby controls configured.</p>`}</section></div><div class="summary-row">${summaryCard(context, "mdi:shield-home", "Security", `Alarm ${alarm}`, "security")}${summaryCard(context, "mdi:lightbulb-group", "Lights", `${lightsOn} on`, "lights")}${summaryCard(context, "mdi:thermometer", "Climate", `${numericText(context, entities.roomTemperature)} degrees Celsius / ${climateState}`, "climate")}${summaryCard(context, "mdi:solar-power", "Solar", formatPower(readNumericState(context.hass, entities.energy.solar)), "energy")}</div><div class="pulse-row">${pulseCard(context, "access", "mdi:door-closed-lock", "Access")}${pulseCard(context, "presence", "mdi:motion-sensor", "Presence")}${pulseCard(context, "comfort", "mdi:home-thermometer-outline", "Comfort")}${pulseCard(context, "attention", "mdi:alert-circle-outline", "Attention")}</div></main>`;
}

/** Validates a camera image path before placing it in an image source. */
function safeImageUrl(value: unknown, entityId: string): string {
  if (typeof value === "string" && (value.startsWith("/api/") || value.startsWith("/local/") || value.startsWith("/media/") || value.startsWith("https://") || value.startsWith("data:image/"))) return value;
  return `/api/camera_proxy/${encodeURIComponent(entityId)}`;
}

/** Renders one snapshot tile while keeping medium-quality playback an explicit separate contract. */
function cameraTile(context: RenderContext, camera: CameraEntity): string {
  const reading = readEntity(context.hass, camera.entity);
  const label = escapeHtml(camera.label);
  if (reading.status === "unavailable") return `<figure class="camera unavailable"><div class="camera-missing">${icon("mdi:camera-off-outline")}<span>Camera unavailable</span></div><span class="camera-caption"><strong>${label}</strong><span>Offline</span></span></figure>`;
  const source = safeImageUrl(attribute(reading.entity, "entity_picture"), camera.entity);
  const medium = camera.mediumStreamEntity;
  const mediumAvailable = medium !== undefined && readEntity(context.hass, medium).status === "available";
  const status = medium === undefined ? "Medium stream not configured" : mediumAvailable ? "Open medium stream" : "Medium stream unavailable";
  const content = `<img src="${escapeHtml(source)}" alt="${label} camera" loading="lazy"><span class="camera-caption"><strong>${label}</strong><span>${escapeHtml(status)}</span></span>`;
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
  return `${header(context, "Security overview", `Alarm ${alarm} / ${cameras.length} configured zones`)}<main class="page-grid security-grid"><aside class="alarm-stack"><section class="glass alarm"><div class="card-title">Alarm system</div><div class="alarm-status"><span class="alarm-ring">${icon("mdi:shield-outline")}</span><strong>${escapeHtml(alarm)}</strong></div><div class="alarm-actions"><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_home" ${alarmDisabled}>${icon("mdi:home-outline")}Home</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_away" ${alarmDisabled}>${icon("mdi:walk")}Away</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_night" ${alarmDisabled}>${icon("mdi:weather-night")}Night</button></div></section><section class="glass alarm-keypad"><div class="card-title">Alarm keypad</div><output class="keypad-display" data-alarm-code-display aria-live="polite" aria-label="No alarm code entered">Enter code</output><div class="keypad-grid">${keypad}</div></section></aside><section class="camera-grid">${cameras.length === 0 ? `<section class="glass empty"><div><h2>No cameras configured</h2><p>Add camera entities in the visual editor to populate this view.</p></div></section>` : cameras.map((item) => cameraTile(context, item)).join("")}</section></main>`;
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

/** Renders the detailed Climate view. */
function renderClimate(context: RenderContext): string {
  const entities = context.config.entities;
  const weatherReading = readEntity(context.hass, entities.weather);
  const weather = weatherReading.status === "available" ? weatherReading.entity : undefined;
  const temperatures = entities.roomTemperatures.map((item) => temperatureRow(context, item.entity, item.room, item.icon)).join("");
  const condition = weather?.state ?? "unavailable";
  const conditionClass = condition.replace(/[^a-z-]/gu, "") || "unavailable";
  const outsideTemperature = weather === undefined ? "—" : formatNumericAttribute(weather, "temperature");
  return `${header(context, "Climate overview", `Air conditioning ${stateText(context, entities.climate, "off")} · Living room ${numericText(context, entities.roomTemperature)} degrees Celsius`)}<main class="page-grid climate-grid"><div class="temps">${temperatures || `<section class="glass empty"><p>No room temperature sensors configured.</p></section>`}</div><section class="glass thermostat"><div class="card-title">Air conditioning</div><div class="climate-reading"><strong>${celsius(numericText(context, entities.roomTemperature))}</strong><small>Living room</small></div>${coolingControl(context)}</section><div class="climate-right"><section class="glass outside weather-surface weather-${escapeHtml(conditionClass)}" data-weather-condition="${escapeHtml(conditionClass)}">${icon(weatherIcon(condition))}<div><small>Outside</small><strong>${celsius(outsideTemperature)}</strong><span>${escapeHtml(condition.replaceAll("_", " "))}</span></div></section></div></main>`;
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
function diagnostic(context: RenderContext, mdi: string, label: string, entityId: string | undefined, suffix = "", controllable = false): string {
  const numeric = entityId === undefined ? { status: "unavailable" as const } : readNumericState(context.hass, entityId);
  // Binary and text diagnostics retain their state words; only finite telemetry is decimalized.
  const state = numeric.status === "available" ? formatDecimal(numeric.value) : stateText(context, entityId);
  const available = state !== "Unavailable";
  const actionHint = state === "on" ? "Tap to turn off" : state === "off" ? "Tap to turn on" : "Control unavailable";
  const body = `<span class="round">${icon(mdi)}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(state)}${available ? escapeHtml(suffix) : ""}</strong><span class="diagnostic-hint">${controllable && available ? actionHint : available ? "Live status" : "Not configured"}</span></div>`;
  return controllable && entityId !== undefined
    ? `<button class="glass diagnostic diagnostic-control ${available ? "available" : "unavailable"}" data-action="poe-toggle" data-entity="${escapeHtml(entityId)}" ${available ? "" : "disabled"}>${body}</button>`
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
  return `${header(context, "System overview", unavailable === 0 ? "Tablet and PoE telemetry online" : `${unavailable} diagnostics unavailable`)}<main class="page-grid diagnostics-grid">${values.map(([mdi, label, entityId, suffix]) => diagnostic(context, mdi, label, entityId, suffix, label === "PoE port")).join("")}<section class="glass diagnostic-note"><div class="card-title">Commissioning status</div><p>Tablet telemetry remains read-only. The PoE control requires confirmation before Home Assistant changes the wall-tablet power feed.</p></section></main>`;
}

/** Renders one of the eight stable H2DC routes with exhaustive handling. */
export function renderView(context: RenderContext): string {
  switch (context.config.view) {
    case "home": return renderHome(context);
    case "security": return renderSecurity(context);
    case "energy": return renderEnergy(context);
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
