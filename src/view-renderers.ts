import type { H2DCConfig, H2DCView } from "./domain";
import { lightCapabilities } from "./entity-capabilities";
import { escapeHtml, readEntity, readNumericState, type HassAttributeValue, type HassEntity, type HomeAssistant } from "./home-assistant";
import { derivePowerFlow, formatPower, type FlowDirection } from "./power-flow";

/** Immutable inputs shared by every route renderer. */
export interface RenderContext {
  readonly config: H2DCConfig;
  readonly hass: HomeAssistant;
  readonly now: Date;
  readonly reducedMotion: boolean;
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

/** Formats one numeric entity with a fixed maximum precision. */
function numericText(context: RenderContext, entityId: string | undefined, digits = 0): string {
  if (entityId === undefined || entityId === "") return "—";
  const reading = readNumericState(context.hass, entityId);
  return reading.status === "available" ? reading.value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "—";
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
  return `<header><div class="brand">H2DC</div><nav class="nav" aria-label="Dashboard views">${tabs.map(([path, label]) => `<a class="${context.config.view === path ? "active" : ""}" href="${escapeHtml(viewPath(context.config, path))}">${label}</a>`).join("")}</nav><div class="tools">${icon("mdi:magnify")}<a href="?h2dc_admin=1" aria-label="Show Home Assistant controls">${icon("mdi:cog-outline")}</a></div><div class="intro"><span>${escapeHtml(eyebrow)}</span><h1>${escapeHtml(date)}</h1><p>${escapeHtml(summary)}</p></div></header>`;
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
function energyFlow(context: RenderContext): string {
  const flow = derivePowerFlow(context.hass, context.config);
  const supplied = flow.solar === "source" || flow.battery === "source" || flow.grid === "source";
  const paths = {
    trunk: "M300 196 L300 142",
    solar: flow.solar === "sink" ? "M300 196 Q300 226 270 226 L130 226 Q100 226 100 256" : "M100 256 Q100 226 130 226 L270 226 Q300 226 300 196",
    battery: flow.battery === "sink" ? "M300 196 L300 256" : "M300 256 L300 196",
    grid: flow.grid === "sink" ? "M300 196 Q300 226 330 226 L470 226 Q500 226 500 256" : "M500 256 Q500 226 470 226 L330 226 Q300 226 300 196",
  } as const;
  const sourceNode = (x: number, mdi: string, label: string, value: string, direction: FlowDirection): string => `<g class="node ${activeFlow(direction) ? "active" : ""}" transform="translate(${x} 304)"><circle r="38"/><foreignObject x="-20" y="-20" width="40" height="40">${icon(mdi)}</foreignObject><text y="66">${label}</text><text class="value" y="94">${escapeHtml(value)}</text></g>`;
  return `<section class="glass flow"><div class="card-title">Home energy <a href="${escapeHtml(viewPath(context.config, "energy"))}" aria-label="Open Energy">›</a></div><div class="topology"><svg viewBox="0 0 600 440" role="img" aria-label="${escapeHtml(flow.summary)}"><path class="track ${supplied ? "active" : ""}" d="M300 196 L300 142"/><path class="track ${activeFlow(flow.solar) ? "active" : ""}" d="M100 256 Q100 226 130 226 L270 226 Q300 226 300 196"/><path class="track ${activeFlow(flow.battery) ? "active" : ""}" d="M300 196 L300 256"/><path class="track ${activeFlow(flow.grid) ? "active" : ""}" d="M300 196 Q300 226 330 226 L470 226 Q500 226 500 256"/>${flowArrow(paths.trunk, supplied, "0s", context.reducedMotion)}${flowArrow(paths.solar, activeFlow(flow.solar), "-.6s", context.reducedMotion)}${flowArrow(paths.battery, activeFlow(flow.battery), "-1.2s", context.reducedMotion)}${flowArrow(paths.grid, activeFlow(flow.grid), "-1.6s", context.reducedMotion)}<g class="home-node" transform="translate(300 92)"><circle r="54"/><foreignObject x="-26" y="-26" width="52" height="52">${icon("mdi:home-outline")}</foreignObject></g><g class="home-reading" transform="translate(370 78)"><text>Home load</text><text class="value" y="34">${escapeHtml(formatPower(flow.loadPower))}</text></g>${sourceNode(100, "mdi:solar-power", "Solar", formatPower(flow.solarPower), flow.solar)}${sourceNode(300, "mdi:battery-medium", "Battery", flow.batterySoc.status === "available" ? `${Math.round(flow.batterySoc.value)}%` : "—", flow.battery)}${sourceNode(500, "mdi:transmission-tower", "Grid", formatPower(flow.gridPower), flow.grid)}</svg></div></section>`;
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
  return `<div class="cooling-control"><button class="cool-toggle ${cooling ? "cool" : "off"}" data-action="climate-mode" data-entity="${climateId}" data-mode="${cooling ? "off" : "cool"}" aria-pressed="${cooling}" ${disabled}>${icon(cooling ? "mdi:snowflake" : "mdi:power")}<span><b>${cooling ? "Cool" : "Off"}</b><small>${cooling ? `Set to ${target} °C` : "Tap to cool"}</small></span></button><div class="target-control" aria-label="Target temperature"><button data-action="climate-temperature" data-entity="${climateId}" data-value="${decrease}" aria-label="Decrease target temperature" ${target <= minimum || climate === undefined ? "disabled" : ""}>−</button><strong>${target}°</strong><button data-action="climate-temperature" data-entity="${climateId}" data-value="${increase}" aria-label="Increase target temperature" ${target >= maximum || climate === undefined ? "disabled" : ""}>+</button></div></div>`;
}

/** Renders one state-aware nearby control. */
function nearbyControl(context: RenderContext, entityId: string, label: string, mdi: string): string {
  const reading = readEntity(context.hass, entityId);
  const state = reading.status === "available" ? reading.entity.state : "unavailable";
  return `<button class="control ${escapeHtml(state)}" data-action="toggle" data-entity="${escapeHtml(entityId)}" aria-pressed="${state === "on"}" ${reading.status === "unavailable" ? "disabled" : ""}>${icon(mdi)}<span>${escapeHtml(label)}</span><small>${escapeHtml(state)}</small></button>`;
}

/** Renders one state-aware bottom navigation card. */
function summaryCard(context: RenderContext, mdi: string, label: string, value: string, view: H2DCView): string {
  return `<a class="glass summary" href="${escapeHtml(viewPath(context.config, view))}" aria-label="Open ${escapeHtml(label)}: ${escapeHtml(value)}"><span class="round">${icon(mdi)}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div><b aria-hidden="true">›</b></a>`;
}

/** Renders the commissioned Home composition. */
function renderHome(context: RenderContext): string {
  const entities = context.config.entities;
  const alarm = stateText(context, entities.alarm).toLowerCase();
  const lightsOn = entities.lights.filter((item) => readEntity(context.hass, item.entity).status === "available" && context.hass.states[item.entity]?.state === "on").length;
  const weatherReading = readEntity(context.hass, entities.weather);
  const weather = weatherReading.status === "available" ? weatherReading.entity : undefined;
  const condition = weather?.state ?? "unavailable";
  const temperature = stringAttribute(weather, "temperature", "—");
  const humidity = stringAttribute(weather, "humidity", "—");
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(context.now);
  const mediaId = entities.media.primary;
  const mediaReading = mediaId === undefined ? undefined : readEntity(context.hass, mediaId);
  const media = mediaReading?.status === "available" ? mediaReading.entity : undefined;
  const climateState = stateText(context, entities.climate, "off");
  const nearby = entities.nearby.map((item) => nearbyControl(context, item.entity, item.label, item.icon)).join("");
  return `${header(context, "Home overview", `Alarm ${alarm} · ${lightsOn} selected lights on`)}<main class="home-grid"><div class="left-stack"><section class="glass clock"><strong>${escapeHtml(time)}</strong><span>${escapeHtml(new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(context.now))}</span></section><section class="glass weather weather-${escapeHtml(condition.replace(/[^a-z-]/gu, ""))}"><div>${icon(weatherIcon(condition))}</div><div><strong>${escapeHtml(temperature)} °C</strong><span>${escapeHtml(condition.replaceAll("_", " "))}</span><small>Humidity ${escapeHtml(humidity)}%</small></div></section></div>${energyFlow(context)}<div class="right-stack"><section class="glass compact"><div class="card-title">Climate <a href="${escapeHtml(viewPath(context.config, "climate"))}" aria-label="Open Climate">›</a></div><div class="climate-body"><div class="climate-reading"><strong>${numericText(context, entities.roomTemperature, 1)} °C</strong><small>Living room</small></div>${coolingControl(context)}</div></section><section class="glass compact"><div class="card-title">Now playing <a href="${escapeHtml(viewPath(context.config, "media"))}" aria-label="Open Media">›</a></div><div class="media-row">${icon("mdi:volume-high")}<div><strong>${escapeHtml(stringAttribute(media, "media_title", "No media playing"))}</strong><small>Surround speakers</small></div>${mediaId === undefined ? "" : `<button class="media-action" data-action="media" data-entity="${escapeHtml(mediaId)}" data-command="media_play_pause" aria-label="Play or pause" ${media === undefined ? "disabled" : ""}>${icon("mdi:play-pause")}</button>`}</div></section><section class="glass controls"><div class="card-title">Nearby controls</div>${nearby || `<p>No nearby controls configured.</p>`}</section></div><div class="summary-row">${summaryCard(context, "mdi:shield-home", "Security", `Alarm ${alarm}`, "security")}${summaryCard(context, "mdi:lightbulb-group", "Lights", `${lightsOn} on`, "lights")}${summaryCard(context, "mdi:thermometer", "Climate", `${numericText(context, entities.roomTemperature, 1)} °C · ${climateState}`, "climate")}${summaryCard(context, "mdi:solar-power", "Solar", formatPower(readNumericState(context.hass, entities.energy.solar)), "energy")}</div></main>`;
}

/** Validates a camera image path before placing it in an image source. */
function safeImageUrl(value: unknown, entityId: string): string {
  if (typeof value === "string" && (value.startsWith("/api/") || value.startsWith("/local/") || value.startsWith("/media/") || value.startsWith("https://") || value.startsWith("data:image/"))) return value;
  return `/api/camera_proxy/${encodeURIComponent(entityId)}`;
}

/** Renders one available or explicitly unavailable camera tile. */
function cameraTile(context: RenderContext, entityId: string, label: string): string {
  const reading = readEntity(context.hass, entityId);
  if (reading.status === "unavailable") return `<figure class="camera unavailable"><div class="camera-missing">${icon("mdi:camera-off-outline")}<span>Camera unavailable</span></div><figcaption><strong>${escapeHtml(label)}</strong><span>Offline</span></figcaption></figure>`;
  const source = safeImageUrl(attribute(reading.entity, "entity_picture"), entityId);
  return `<figure class="camera"><img src="${escapeHtml(source)}" alt="${escapeHtml(label)} camera" loading="lazy"><figcaption><strong>${escapeHtml(label)}</strong><span>Live</span></figcaption></figure>`;
}

/** Renders the Security view. */
function renderSecurity(context: RenderContext): string {
  const alarm = stateText(context, context.config.entities.alarm).toLowerCase();
  const cameras = context.config.entities.cameras;
  const alarmId = escapeHtml(context.config.entities.alarm);
  const alarmDisabled = readEntity(context.hass, context.config.entities.alarm).status === "unavailable" ? "disabled" : "";
  return `${header(context, "Security overview", `Alarm ${alarm} · ${cameras.length} configured zones`)}<main class="page-grid security-grid"><section class="glass alarm"><div class="card-title">Alarm system</div><div class="alarm-ring">${icon("mdi:shield-outline")}</div><strong>${escapeHtml(alarm)}</strong><div class="alarm-actions"><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_home" ${alarmDisabled}>${icon("mdi:home-outline")}Home</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_away" ${alarmDisabled}>${icon("mdi:walk")}Away</button><button class="alarm-action" data-action="alarm" data-entity="${alarmId}" data-command="alarm_arm_night" ${alarmDisabled}>${icon("mdi:weather-night")}Night</button></div></section><section class="camera-grid">${cameras.length === 0 ? `<section class="glass empty"><div><h2>No cameras configured</h2><p>Add camera entities in the visual editor to populate this view.</p></div></section>` : cameras.map((item) => cameraTile(context, item.entity, item.label)).join("")}</section></main>`;
}

/** Renders one metric with designed missing-data output. */
function metric(mdi: string, label: string, value: string): string {
  return `<div class="metric"><span class="round">${icon(mdi)}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div></div>`;
}

/** Renders the detailed Energy view. */
function renderEnergy(context: RenderContext): string {
  const entities = context.config.entities.energy;
  const flow = derivePowerFlow(context.hass, context.config);
  return `${header(context, "Energy overview", `${flow.summary} · Battery ${numericText(context, entities.batterySoc)}%`)}<main class="page-grid energy-grid"><div class="page-grid"><section class="glass metric-card"><div class="card-title">Battery health</div>${metric("mdi:battery", "Voltage", `${numericText(context, entities.batteryVoltage, 2)} V`)}${metric("mdi:thermometer", "Temperature", `${numericText(context, entities.batteryTemperature, 1)} °C`)}</section><section class="glass metric-card"><div class="card-title">Inverter temperature</div>${metric("mdi:thermometer", "AC", `${numericText(context, entities.acTemperature, 1)} °C`)}${metric("mdi:thermometer", "DC", `${numericText(context, entities.dcTemperature, 1)} °C`)}</section></div>${energyFlow(context)}<section class="glass today"><div class="card-title">Today</div>${metric("mdi:solar-power", "PV production", `${numericText(context, entities.dailyPv, 1)} kWh`)}${metric("mdi:transmission-tower", "Grid import", `${numericText(context, entities.dailyGridImport, 1)} kWh`)}${metric("mdi:battery-arrow-down", "Battery discharge", `${numericText(context, entities.dailyBatteryDischarge, 1)} kWh`)}</section></main>`;
}

/** Renders one room temperature. */
function temperatureRow(context: RenderContext, entityId: string, room: string, mdi: string): string {
  return `<section class="glass temp-row"><span class="round">${icon(mdi)}</span><div><small>${escapeHtml(room)}</small><strong>${numericText(context, entityId, 1)} °C</strong></div><b aria-hidden="true">›</b></section>`;
}

/** Renders the detailed Climate view. */
function renderClimate(context: RenderContext): string {
  const entities = context.config.entities;
  const weatherReading = readEntity(context.hass, entities.weather);
  const weather = weatherReading.status === "available" ? weatherReading.entity : undefined;
  const temperatures = entities.roomTemperatures.map((item) => temperatureRow(context, item.entity, item.room, item.icon)).join("");
  return `${header(context, "Climate overview", `Air conditioning ${stateText(context, entities.climate, "off")} · Living room ${numericText(context, entities.roomTemperature, 1)} °C`)}<main class="page-grid climate-grid"><div class="temps">${temperatures || `<section class="glass empty"><p>No room temperature sensors configured.</p></section>`}</div><section class="glass thermostat"><div class="card-title">Air conditioning</div><div class="climate-reading"><strong>${numericText(context, entities.roomTemperature, 1)} °C</strong><small>Living room</small></div>${coolingControl(context)}</section><div class="climate-right"><section class="glass outside">${icon(weatherIcon(weather?.state ?? "unavailable"))}<div><small>Outside</small><strong>${escapeHtml(stringAttribute(weather, "temperature", "—"))} °C</strong><span>${escapeHtml((weather?.state ?? "Unavailable").replaceAll("_", " "))}</span></div></section></div></main>`;
}

/** Renders one capability-aware light card. */
function lightCard(context: RenderContext, entityId: string, room: string, mdi: string): string {
  const reading = readEntity(context.hass, entityId);
  const entity = reading.status === "available" ? reading.entity : undefined;
  const capabilities = lightCapabilities(entity);
  const state = entity?.state ?? "unavailable";
  const stateClass = state === "on" ? "on" : state === "off" ? "off" : "unavailable";
  const brightness = numericAttribute(entity, "brightness", state === "on" ? 255 : 0);
  const percent = Math.round((brightness / 255) * 100);
  const name = stringAttribute(entity, "friendly_name", entityId);
  return `<section class="glass light-card ${stateClass}"><div class="light-heading"><span class="round">${icon(mdi)}</span><div><small>${escapeHtml(room)}</small><strong>${escapeHtml(name)}</strong></div><button class="light-toggle" data-action="toggle" data-entity="${escapeHtml(entityId)}" aria-label="Toggle ${escapeHtml(name)}" aria-pressed="${state === "on"}" ${capabilities.available ? "" : "disabled"}>${icon(state === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb-outline")}</button></div><div class="light-state"><span>${escapeHtml(state)}</span>${capabilities.dimmable ? `<b>${percent}%</b>` : ""}</div>${capabilities.dimmable ? `<input type="range" min="1" max="100" value="${Math.max(1, percent)}" data-action="brightness" data-entity="${escapeHtml(entityId)}" aria-label="${escapeHtml(name)} brightness" ${capabilities.available ? "" : "disabled"}>` : ""}</section>`;
}

/** Renders the curated Lights view. */
function renderLights(context: RenderContext): string {
  const lights = context.config.entities.lights;
  const active = lights.filter((item) => context.hass.states[item.entity]?.state === "on").length;
  return `${header(context, "Lighting overview", `${active} of ${lights.length} selected lights on`)}<main class="page-grid lights-grid">${lights.length === 0 ? `<section class="glass empty"><div><h2>No lights configured</h2><p>Add curated light entities in the visual editor. Brightness controls appear only when Home Assistant reports that capability.</p></div></section>` : lights.map((item) => lightCard(context, item.entity, item.room, item.icon)).join("")}</main>`;
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
  const primaryReading = media.primary === undefined ? undefined : readEntity(context.hass, media.primary);
  const primary = primaryReading?.status === "available" ? primaryReading.entity : undefined;
  const primaryId = media.primary === undefined ? undefined : escapeHtml(media.primary);
  const primaryDisabled = primary === undefined ? "disabled" : "";
  return `${header(context, "Media overview", "Whole-house audio and television control")}<main class="page-grid media-grid"><section class="glass rooms"><div class="card-title">Living room</div>${mediaRow(context, media.primary, "Surround speakers", "mdi:speaker-multiple")}${mediaRow(context, media.livingTv, "Living room TV", "mdi:television")}</section><section class="glass rooms"><div class="card-title">Private rooms</div>${mediaRow(context, media.bedroom, "Master bedroom", "mdi:bed-king-outline")}${mediaRow(context, media.study, "Study", "mdi:bookshelf")}</section><section class="glass now"><div class="card-title">Now playing</div><div class="album">${icon("mdi:music-note")}</div><h2>${escapeHtml(stringAttribute(primary, "media_title", "No media playing"))}</h2><span>${escapeHtml(stringAttribute(primary, "media_artist", "Select a source to start listening"))}</span>${primaryId === undefined ? "" : `<div class="transport"><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_previous_track" aria-label="Previous track" ${primaryDisabled}>${icon("mdi:skip-previous")}</button><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_play_pause" aria-label="Play or pause" ${primaryDisabled}>${icon("mdi:play")}</button><button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_next_track" aria-label="Next track" ${primaryDisabled}>${icon("mdi:skip-next")}</button></div>`}</section><section class="glass rooms"><div class="card-title">Whole home</div>${mediaRow(context, media.family, "Family lounge", "mdi:sofa-outline")}${mediaRow(context, media.kitchen, "Kitchen", "mdi:silverware-fork-knife")}${mediaRow(context, media.dining, "Dining", "mdi:table-furniture")}</section><section class="glass quick"><div class="card-title">Quick controls</div>${primaryId === undefined ? "" : `<button class="media-action" data-action="media" data-entity="${primaryId}" data-command="media_pause" ${primaryDisabled}>${icon("mdi:pause")} Pause all</button>`}${context.config.sonoraUrl === undefined ? `<p>Sonos controller URL not configured.</p>` : `<a href="${escapeHtml(context.config.sonoraUrl)}">${icon("mdi:speaker-multiple")} Open Sonos controller</a>`}</section></main>`;
}

/** Renders the stable external Sonos-controller handoff. */
function renderSonos(context: RenderContext): string {
  return `${header(context, "Sonos controller", "Stable whole-house audio handoff")}<main class="glass empty"><div>${icon("mdi:speaker-multiple")}<h2>Whole-house audio</h2>${context.config.sonoraUrl === undefined ? `<p>Add the HTTPS Sonora URL in the visual editor.</p>` : `<p>The controller opens directly to avoid nested-theme reload loops in Fully Kiosk.</p><a href="${escapeHtml(context.config.sonoraUrl)}">Open Sonos controller</a>`}</div></main>`;
}

/** Renders one read-only diagnostic entity. */
function diagnostic(context: RenderContext, mdi: string, label: string, entityId: string | undefined, suffix = ""): string {
  const state = stateText(context, entityId);
  const available = state !== "Unavailable";
  return `<section class="glass diagnostic ${available ? "available" : "unavailable"}"><span class="round">${icon(mdi)}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(state)}${available ? escapeHtml(suffix) : ""}</strong><code>${escapeHtml(entityId ?? "Not configured")}</code></div></section>`;
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
  return `${header(context, "System overview", unavailable === 0 ? "Tablet and PoE telemetry online" : `${unavailable} diagnostics unavailable`)}<main class="page-grid diagnostics-grid">${values.map(([mdi, label, entityId, suffix]) => diagnostic(context, mdi, label, entityId, suffix)).join("")}<section class="glass diagnostic-note"><div class="card-title">Commissioning status</div><p>This view is intentionally read-only. Charging automation and PoE switching remain controlled by Home Assistant, not dashboard taps.</p></section></main>`;
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
