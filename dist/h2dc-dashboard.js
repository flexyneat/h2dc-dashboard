// src/domain.ts
var e = [
	"home",
	"security",
	"energy",
	"climate",
	"lights",
	"media",
	"sonos",
	"diagnostics"
], t = {
	type: "custom:h2dc-dashboard-card",
	configVersion: 1,
	dashboardPath: "/h2dc",
	flowThresholdW: 40,
	batteryPositiveIs: "discharge",
	gridPositiveIs: "import"
};
function n(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function r(e, t) {
	return typeof e != "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(e) ? !1 : t === void 0 || e.startsWith(`${t}.`);
}
function i(e) {
	return typeof e != "string" || e.length === 0 ? !1 : e.startsWith("/local/") || e.startsWith("/media/") || /^https:\/\//u.test(e) || e.startsWith("data:image/");
}
function a(e, t, n) {
	return e[t] ?? e[n];
}
function o(e, t, i) {
	return e === void 0 ? [] : Array.isArray(e) ? e.flatMap((e, a) => !n(e) || !r(e.entity) || typeof e.label != "string" || typeof e.icon != "string" ? (i.push(`${t}[${a}] must contain entity, label, and icon`), []) : [{
		entity: e.entity,
		label: e.label,
		icon: e.icon
	}]) : (i.push(`${t} must be an array`), []);
}
function s(e, t) {
	return e === void 0 ? [] : Array.isArray(e) ? e.flatMap((e, i) => !n(e) || !r(e.entity, "light") || typeof e.room != "string" || typeof e.icon != "string" ? (t.push(`entities.lights[${i}] must contain a light entity, room, and icon`), []) : [{
		entity: e.entity,
		room: e.room,
		icon: e.icon
	}]) : (t.push("entities.lights must be an array"), []);
}
function c(e, t) {
	return e === void 0 ? [] : Array.isArray(e) ? e.flatMap((e, i) => !n(e) || !r(e.entity, "camera") || typeof e.label != "string" ? (t.push(`entities.cameras[${i}] must contain a camera entity and label`), []) : [{
		entity: e.entity,
		label: e.label
	}]) : (t.push("entities.cameras must be an array"), []);
}
function l(e, t) {
	return e === void 0 ? [] : Array.isArray(e) ? e.flatMap((e, i) => !n(e) || !r(e.entity, "sensor") || typeof e.room != "string" || typeof e.icon != "string" ? (t.push(`entities.room_temperatures[${i}] must contain a sensor entity, room, and icon`), []) : [{
		entity: e.entity,
		room: e.room,
		icon: e.icon
	}]) : (t.push("entities.room_temperatures must be an array"), []);
}
function u(e, t, n, i, o) {
	let s = a(e, t, n);
	if (s !== void 0 && s !== "") {
		if (r(s)) return s;
		o.push(`${i} must be a valid entity ID`);
	}
}
function d(e, t) {
	let i = n(e) ? e : {};
	n(e) || t.push("entities.energy must be an object");
	let o = (e, n, o = "sensor") => {
		let s = a(i, e, n);
		return r(s, o) ? s : (t.push(`entities.energy.${n} must be a ${o} entity`), "");
	}, s = {
		solar: o("solar", "solar"),
		batterySoc: o("batterySoc", "battery_soc"),
		battery: o("battery", "battery"),
		grid: o("grid", "grid"),
		load: o("load", "load")
	};
	return Object.entries({
		freshness: "freshness",
		batteryVoltage: "battery_voltage",
		batteryTemperature: "battery_temperature",
		acTemperature: "ac_temperature",
		dcTemperature: "dc_temperature",
		dailyPv: "daily_pv",
		dailyGridImport: "daily_grid_import",
		dailyBatteryDischarge: "daily_battery_discharge"
	}).forEach(([e, n]) => {
		let r = u(i, e, n, `entities.energy.${n}`, t);
		r !== void 0 && (s[e] = r);
	}), s;
}
function f(e, t, r, i) {
	let a = n(e) ? e : {};
	e !== void 0 && !n(e) && i.push(`${r} must be an object`);
	let o = Object.entries(t).flatMap(([e, t]) => {
		let n = String(t), o = u(a, e, n, `${r}.${n}`, i);
		return o === void 0 ? [] : [[e, o]];
	});
	return Object.fromEntries(o);
}
function p(t, r) {
	let o = n(t) ? t : {}, s = (e) => {
		let t = o[e];
		if (t !== void 0 && t !== "") {
			if (i(t)) return t;
			r.push(`backgrounds.${e} must use /local, /media, https, or data:image`);
		}
	}, c = a(o, "perView", "per_view"), l = n(c) ? c : {};
	c !== void 0 && !n(c) && r.push("backgrounds.per_view must be an object");
	let u = e.flatMap((e) => {
		let t = l[e];
		return t === void 0 || t === "" ? [] : i(t) ? [[e, t]] : (r.push(`backgrounds.per_view.${e} has an unsafe URL`), []);
	}), d = s("day"), f = s("night");
	return {
		...d === void 0 ? {} : { day: d },
		...f === void 0 ? {} : { night: f },
		perView: Object.fromEntries(u)
	};
}
function m(i) {
	let u = [];
	if (!n(i)) return {
		status: "invalid",
		issues: ["configuration must be an object"]
	};
	i.type !== t.type && u.push(`type must be ${t.type}`), (a(i, "configVersion", "config_version") ?? t.configVersion) !== t.configVersion && u.push(`config_version must be ${t.configVersion}`);
	let m = n(i.entities) ? i.entities : {};
	n(i.entities) || u.push("entities must be an object");
	let h = i.view, g = e.find((e) => e === h);
	g === void 0 && u.push("view must be a supported H2DC route");
	let _ = m.alarm, v = m.climate, y = m.weather, b = a(m, "roomTemperature", "room_temperature");
	r(_, "alarm_control_panel") || u.push("entities.alarm must be an alarm_control_panel entity"), r(v, "climate") || u.push("entities.climate must be a climate entity"), r(y, "weather") || u.push("entities.weather must be a weather entity"), r(b, "sensor") || u.push("entities.room_temperature must be a sensor entity");
	let x = a(i, "flowThresholdW", "flow_threshold_w") ?? t.flowThresholdW, S = Number(x);
	(!Number.isFinite(S) || S < 0) && u.push("flow_threshold_w must be zero or greater");
	let C = a(i, "batteryPositiveIs", "battery_positive_is") ?? t.batteryPositiveIs, w = a(i, "gridPositiveIs", "grid_positive_is") ?? t.gridPositiveIs;
	C !== "charge" && C !== "discharge" && u.push("battery_positive_is must be charge or discharge"), w !== "import" && w !== "export" && u.push("grid_positive_is must be import or export");
	let T = f(m.media, {
		primary: "primary",
		livingTv: "living_tv",
		bedroom: "bedroom",
		study: "study",
		family: "family",
		kitchen: "kitchen",
		dining: "dining"
	}, "entities.media", u), E = f(m.diagnostics, {
		tabletBattery: "tablet_battery",
		pluggedIn: "plugged_in",
		screen: "screen",
		currentPage: "current_page",
		poe: "poe",
		poePower: "poe_power"
	}, "entities.diagnostics", u), D = a(i, "dashboardPath", "dashboard_path"), O = typeof D == "string" ? D : t.dashboardPath;
	/^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/u.test(O) || u.push("dashboard_path must be a root-relative Home Assistant path without a scheme, query, fragment, backslash, or control character");
	let k = a(i, "sonoraUrl", "sonora_url"), A = typeof k == "string" && /^https:\/\//u.test(k) ? k : void 0;
	k !== void 0 && A === void 0 && u.push("sonora_url must be an HTTPS URL");
	let j = o(m.nearby, "entities.nearby", u), M = s(m.lights, u), N = c(m.cameras, u), P = l(a(m, "roomTemperatures", "room_temperatures"), u), F = d(m.energy, u), I = p(i.backgrounds, u);
	return u.length > 0 || g === void 0 || !r(_) || !r(v) || !r(y) || !r(b) ? {
		status: "invalid",
		issues: u
	} : {
		status: "valid",
		config: {
			type: t.type,
			configVersion: 1,
			view: g,
			dashboardPath: O,
			...A === void 0 ? {} : { sonoraUrl: A },
			flowThresholdW: S,
			batteryPositiveIs: C,
			gridPositiveIs: w,
			entities: {
				alarm: _,
				climate: v,
				weather: y,
				roomTemperature: b,
				nearby: j,
				lights: M,
				cameras: N,
				roomTemperatures: P,
				energy: F,
				media: T,
				diagnostics: E
			},
			backgrounds: I
		}
	};
}
function h(r) {
	let i = n(r) ? r : {}, u = n(i.entities) ? i.entities : {}, m = n(u.energy) ? u.energy : {}, h = n(i.backgrounds) ? i.backgrounds : {}, g = (e, t, n = t) => {
		let r = a(e, t, n);
		return typeof r == "string" ? r : "";
	}, _ = i.view, v = e.find((e) => e === _) ?? "home", y = Number(a(i, "flowThresholdW", "flow_threshold_w") ?? t.flowThresholdW), b = a(i, "batteryPositiveIs", "battery_positive_is"), x = a(i, "gridPositiveIs", "grid_positive_is"), S = g(i, "sonoraUrl", "sonora_url"), C = g(h, "day"), w = g(h, "night"), T = d(m, []), E = p(h, []);
	return {
		type: t.type,
		configVersion: 1,
		view: v,
		dashboardPath: g(i, "dashboardPath", "dashboard_path") || t.dashboardPath,
		...S === "" ? {} : { sonoraUrl: S },
		flowThresholdW: Number.isFinite(y) && y >= 0 ? y : t.flowThresholdW,
		batteryPositiveIs: b === "charge" ? "charge" : "discharge",
		gridPositiveIs: x === "export" ? "export" : "import",
		entities: {
			alarm: g(u, "alarm"),
			climate: g(u, "climate"),
			weather: g(u, "weather"),
			roomTemperature: g(u, "roomTemperature", "room_temperature"),
			nearby: o(u.nearby, "entities.nearby", []),
			lights: s(u.lights, []),
			cameras: c(u.cameras, []),
			roomTemperatures: l(a(u, "roomTemperatures", "room_temperatures"), []),
			energy: {
				...T,
				solar: g(m, "solar"),
				batterySoc: g(m, "batterySoc", "battery_soc"),
				battery: g(m, "battery"),
				grid: g(m, "grid"),
				load: g(m, "load")
			},
			media: f(u.media, {
				primary: "primary",
				livingTv: "living_tv",
				bedroom: "bedroom",
				study: "study",
				family: "family",
				kitchen: "kitchen",
				dining: "dining"
			}, "entities.media", []),
			diagnostics: f(u.diagnostics, {
				tabletBattery: "tablet_battery",
				pluggedIn: "plugged_in",
				screen: "screen",
				currentPage: "current_page",
				poe: "poe",
				poePower: "poe_power"
			}, "entities.diagnostics", [])
		},
		backgrounds: {
			...E,
			...C === "" ? {} : { day: C },
			...w === "" ? {} : { night: w }
		}
	};
}
// src/actions.ts
function g(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
async function _(e, t) {
	if (!n(t) || !r(t.entityId) || typeof t.type != "string") throw Error("Action requires a valid type and entity ID");
	let i = t.entityId;
	switch (t.type) {
		case "toggle": {
			let t = i.split(".")[0];
			if (t !== "light" && t !== "switch") throw Error("Toggle supports only light and switch entities");
			return e.callService(t, "toggle", { entity_id: i });
		}
		case "set_climate_temperature":
			if (!r(i, "climate")) throw Error("Temperature action requires a climate entity");
			if (typeof t.temperature != "number" || !Number.isFinite(t.temperature)) throw Error("Temperature action requires a finite value");
			return e.callService("climate", "set_temperature", {
				entity_id: i,
				temperature: g(t.temperature, 5, 35)
			});
		case "set_climate_mode": {
			if (!r(i, "climate")) throw Error("Climate mode action requires a climate entity");
			if (t.mode !== "cool" && t.mode !== "off") throw Error("Climate mode must be cool or off");
			let n = t.mode === "cool" ? {
				entity_id: i,
				hvac_mode: "cool"
			} : { entity_id: i };
			return e.callService("climate", t.mode === "cool" ? "set_hvac_mode" : "turn_off", n);
		}
		case "set_light_brightness":
			if (!r(i, "light")) throw Error("Brightness action requires a light entity");
			if (typeof t.brightnessPercent != "number" || !Number.isFinite(t.brightnessPercent)) throw Error("Brightness action requires a finite value");
			return e.callService("light", "turn_on", {
				entity_id: i,
				brightness_pct: g(Math.round(t.brightnessPercent), 1, 100)
			});
		case "media": {
			if (!r(i, "media_player")) throw Error("Media action requires a media_player entity");
			let n = [
				"media_play_pause",
				"media_pause",
				"media_previous_track",
				"media_next_track"
			].find((e) => e === t.command);
			if (n === void 0) throw Error("Unsupported media command");
			return e.callService("media_player", n, { entity_id: i });
		}
		case "alarm": {
			if (!r(i, "alarm_control_panel")) throw Error("Alarm action requires an alarm_control_panel entity");
			let n = [
				"alarm_arm_home",
				"alarm_arm_away",
				"alarm_arm_night"
			].find((e) => e === t.command);
			if (n === void 0) throw Error("Unsupported alarm command");
			return e.callService("alarm_control_panel", n, { entity_id: i });
		}
		default: throw Error("Unsupported dashboard action");
	}
}
// src/home-assistant.ts
function v(e, t) {
	let n = e.states[t];
	return n === void 0 ? {
		status: "unavailable",
		reason: "missing"
	} : n.state === "unknown" ? {
		status: "unavailable",
		reason: "unknown"
	} : n.state === "unavailable" ? {
		status: "unavailable",
		reason: "unavailable"
	} : {
		status: "available",
		entity: n
	};
}
function y(e, t) {
	let n = v(e, t);
	if (n.status === "unavailable") return n;
	if (n.entity.state.trim() === "") return {
		status: "unavailable",
		reason: "not_numeric"
	};
	let r = Number(n.entity.state);
	return Number.isFinite(r) ? {
		status: "available",
		value: r
	} : {
		status: "unavailable",
		reason: "not_numeric"
	};
}
function b(e) {
	return e.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#039;");
}
// src/editor/h2dc-dashboard-editor.ts
function x(e) {
	if (e instanceof HTMLElement && e.dataset.key !== void 0 && (e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e.tagName.toLowerCase() === "ha-entity-picker")) return e;
}
function S(e, t, n, r) {
	return `<ha-entity-picker label="${b(e)}" data-key="${b(t)}" value="${b(n ?? "")}" include-domains='["${b(r)}"]' allow-custom-entity></ha-entity-picker>`;
}
var C = class extends HTMLElement {
	#e;
	#t;
	#n;
	constructor() {
		super(), this.#e = this.attachShadow({ mode: "open" }), this.#e.addEventListener("change", (e) => this.#r(e));
	}
	set hass(e) {
		this.#n = e, this.#i();
	}
	setConfig(e) {
		let t = m(e);
		this.#t = t.status === "valid" ? t.config : h(e), this.#i();
	}
	#r(t) {
		let n = x(t.target);
		if (n === void 0 || this.#t === void 0) return;
		let r = n.dataset.key, i = n.value ?? "";
		if (r === void 0) return;
		let a = this.#t, o;
		switch (r) {
			case "view":
				o = {
					...a,
					view: e.find((e) => e === i) ?? a.view
				};
				break;
			case "dashboardPath":
				o = {
					...a,
					dashboardPath: i
				};
				break;
			case "sonoraUrl":
				if (i === "") {
					let { sonoraUrl: e, ...t } = a;
					o = t;
				} else o = {
					...a,
					sonoraUrl: i
				};
				break;
			case "flowThresholdW":
				o = {
					...a,
					flowThresholdW: Number(i)
				};
				break;
			case "batteryPositiveIs":
				o = {
					...a,
					batteryPositiveIs: i === "charge" ? "charge" : "discharge"
				};
				break;
			case "gridPositiveIs":
				o = {
					...a,
					gridPositiveIs: i === "export" ? "export" : "import"
				};
				break;
			case "entities.alarm":
			case "entities.climate":
			case "entities.weather":
			case "entities.roomTemperature": {
				let e = r.slice(9);
				o = {
					...a,
					entities: {
						...a.entities,
						[e]: i
					}
				};
				break;
			}
			case "energy.freshness":
			case "energy.solar":
			case "energy.batterySoc":
			case "energy.battery":
			case "energy.grid":
			case "energy.load": {
				let e = r.slice(7);
				o = {
					...a,
					entities: {
						...a.entities,
						energy: {
							...a.entities.energy,
							[e]: i
						}
					}
				};
				break;
			}
			case "backgrounds.day":
			case "backgrounds.night": {
				let e = r.slice(12);
				o = {
					...a,
					backgrounds: {
						...a.backgrounds,
						[e]: i
					}
				};
				break;
			}
			default: return;
		}
		let s = m(o);
		this.#t = s.status === "valid" ? s.config : o, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: this.#t },
			bubbles: !0,
			composed: !0
		})), this.#i();
	}
	#i() {
		if (this.#t === void 0) return;
		let t = this.#t, n = t.entities.energy;
		this.#e.innerHTML = `<style>:host{display:block;color:var(--primary-text-color)}form{display:grid;gap:var(--h2dc-editor-gap,1rem);padding:var(--h2dc-editor-pad,.5rem)}fieldset{display:grid;gap:var(--h2dc-editor-field-gap,.75rem);border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,.75rem);padding:var(--h2dc-editor-fieldset-pad,1rem)}legend{font-weight:700}label{display:grid;gap:var(--h2dc-editor-label-gap,.375rem)}input,select{min-height:44px;padding:var(--h2dc-editor-control-pad,.5rem);border:1px solid var(--divider-color);border-radius:var(--h2dc-editor-control-radius,.5rem);background:var(--card-background-color);color:inherit}</style><form><fieldset><legend>View</legend><label>View<select data-key="view">${e.map((e) => `<option value="${e}" ${t.view === e ? "selected" : ""}>${e}</option>`).join("")}</select></label><label>Dashboard path<input data-key="dashboardPath" value="${b(t.dashboardPath)}"></label><label>Sonora URL<input data-key="sonoraUrl" type="url" value="${b(t.sonoraUrl ?? "")}"></label></fieldset><fieldset><legend>Core entities</legend>${S("Alarm", "entities.alarm", t.entities.alarm, "alarm_control_panel")}${S("Climate", "entities.climate", t.entities.climate, "climate")}${S("Weather", "entities.weather", t.entities.weather, "weather")}${S("Room temperature", "entities.roomTemperature", t.entities.roomTemperature, "sensor")}</fieldset><fieldset><legend>Energy</legend>${S("Telemetry freshness", "energy.freshness", n.freshness, "binary_sensor")}${S("Solar power", "energy.solar", n.solar, "sensor")}${S("Battery state of charge", "energy.batterySoc", n.batterySoc, "sensor")}${S("Battery power", "energy.battery", n.battery, "sensor")}${S("Grid power", "energy.grid", n.grid, "sensor")}${S("Home load", "energy.load", n.load, "sensor")}<label>Flow threshold (W)<input data-key="flowThresholdW" type="number" min="0" step="1" value="${t.flowThresholdW}"></label><label>Positive battery value means<select data-key="batteryPositiveIs"><option value="discharge" ${t.batteryPositiveIs === "discharge" ? "selected" : ""}>Discharge</option><option value="charge" ${t.batteryPositiveIs === "charge" ? "selected" : ""}>Charge</option></select></label><label>Positive grid value means<select data-key="gridPositiveIs"><option value="import" ${t.gridPositiveIs === "import" ? "selected" : ""}>Import</option><option value="export" ${t.gridPositiveIs === "export" ? "selected" : ""}>Export</option></select></label></fieldset><fieldset><legend>Backgrounds</legend><label>Day image URL<input data-key="backgrounds.day" type="url" value="${b(t.backgrounds.day ?? "")}"></label><label>Night image URL<input data-key="backgrounds.night" type="url" value="${b(t.backgrounds.night ?? "")}"></label></fieldset></form>`;
		let r = this.#n;
		r !== void 0 && this.#e.querySelectorAll("ha-entity-picker").forEach((e) => {
			e.hass = r;
		});
	}
}, w = {
	color: {
		surface: "oklch(0.21 0.012 78 / 0.84)",
		surfaceRaised: "oklch(0.27 0.014 78 / 0.9)",
		onSurface: "oklch(0.97 0.006 78)",
		onSurfaceMuted: "oklch(0.79 0.012 78)",
		border: "oklch(0.97 0.006 78 / 0.16)",
		accent: "oklch(0.79 0.15 82)",
		focus: "oklch(0.82 0.13 220)"
	},
	space: {
		1: "0.25rem",
		2: "0.5rem",
		3: "0.75rem",
		4: "1rem",
		6: "1.5rem",
		8: "2rem",
		12: "3rem",
		16: "4rem"
	},
	radius: {
		small: "0.5rem",
		medium: "0.75rem",
		large: "1.5rem",
		round: "999rem"
	},
	motion: {
		instant: "100ms",
		micro: "200ms",
		standard: "320ms"
	}
}, T = `
:host {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  color: ${w.color.onSurface};
  font-family: Aeonik, "Aeonik Pro", Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  --surface: ${w.color.surface};
  --surface-raised: ${w.color.surfaceRaised};
  --on-surface: ${w.color.onSurface};
  --on-muted: ${w.color.onSurfaceMuted};
  --border: ${w.color.border};
  --accent: ${w.color.accent};
  --focus: ${w.color.focus};
  --gap-1: ${w.space[1]};
  --gap-2: ${w.space[2]};
  --gap-3: ${w.space[3]};
  --gap-4: ${w.space[4]};
  --gap-6: ${w.space[6]};
  --gap-8: ${w.space[8]};
  --radius-s: ${w.radius.small};
  --radius-m: ${w.radius.medium};
  --radius-l: ${w.radius.large};
  --instant: ${w.motion.instant};
  --micro: ${w.motion.micro};
}
:host(.admin) { position: relative; inset: auto; z-index: auto; width: auto; height: auto; }
* { box-sizing: border-box; }
.sr-only { position: absolute; inline-size: 0.0625rem; block-size: 0.0625rem; padding: 0; margin: -0.0625rem; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
button, a, input, select { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 0.1875rem solid var(--focus);
  outline-offset: 0.1875rem;
}
.shell {
  min-height: 100%;
  padding: var(--gap-6) var(--gap-8);
  background-color: oklch(0.17 0.012 78);
  background-image: linear-gradient(oklch(0.12 0.01 78 / 0.36), oklch(0.12 0.01 78 / 0.36)), var(--active-background, none);
  background-position: center;
  background-size: cover;
  overflow: auto;
}
.glass {
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius-l);
  background: var(--surface);
  box-shadow: inset 0 0.0625rem 0 oklch(0.98 0.005 78 / 0.1);
}
header { position: relative; min-height: 12rem; }
.brand { position: absolute; inset-block-start: 0; inset-inline-start: 0; font-size: clamp(1.75rem, 2vw + 1rem, 3rem); font-weight: 700; letter-spacing: -0.025em; }
.nav {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 18%;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  width: 64%;
  min-height: 4rem;
  padding: var(--gap-1);
  border: 0.0625rem solid var(--border);
  border-radius: ${w.radius.round};
  background: var(--surface-raised);
}
.nav a { display: grid; min-height: 3.5rem; place-items: center; border-radius: ${w.radius.round}; color: var(--on-muted); text-decoration: none; transition: color var(--micro), background var(--micro); }
.nav a.active { color: var(--on-surface); background: oklch(0.98 0.005 78 / 0.12); }
.tools { position: absolute; inset-block-start: var(--gap-4); inset-inline-end: 0; display: flex; gap: var(--gap-4); }
.tools a { color: inherit; }
.intro { position: absolute; inset-block-end: var(--gap-3); inset-inline-start: 0; text-shadow: 0 0.125rem 0.5rem oklch(0.12 0.01 78 / 0.9); }
.intro span, .intro p { color: var(--on-muted); }
.intro h1 { margin: var(--gap-1) 0; font-size: clamp(2rem, 2.6vw, 3.5rem); line-height: 1.05; letter-spacing: -0.025em; text-wrap: balance; }
.intro p { margin: 0; font-size: clamp(1rem, 1.2vw, 1.25rem); }
.card-title { display: flex; align-items: center; justify-content: space-between; font-size: 1.25rem; font-weight: 700; }
.card-title a { min-width: 2.75rem; min-height: 2.75rem; display: grid; place-items: center; color: inherit; text-decoration: none; }
.home-grid { display: grid; grid-template-columns: 26% 42% minmax(0, 1fr); grid-template-rows: minmax(28rem, 1fr) 6rem; gap: var(--gap-4); }
.left-stack, .right-stack { display: grid; gap: var(--gap-4); min-width: 0; }
.left-stack { grid-template-rows: 0.8fr 1.2fr; }
.right-stack { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto; }
.clock, .weather, .compact, .controls, .flow { padding: var(--gap-6); }
.clock { display: grid; align-content: center; }
.clock strong { font-size: clamp(3rem, 4.3vw, 5.125rem); line-height: 1; letter-spacing: -0.035em; white-space: nowrap; }
.clock span { margin-block-start: var(--gap-3); color: var(--on-muted); }
.weather {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--gap-4);
  overflow: hidden;
  background-image: linear-gradient(90deg, oklch(0.12 0.01 78 / 0.18), oklch(0.12 0.01 78 / 0.54)), url("data:image/webp;base64,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");
  background-position: center;
  background-size: cover;
}
.weather-sunny { filter: saturate(1.15) brightness(1.12); }
.weather-cloudy, .weather-fog { filter: saturate(0.72) brightness(0.88); }
.weather-rainy, .weather-pouring, .weather-lightning-rainy { filter: saturate(0.76) brightness(0.72) hue-rotate(12deg); }
.weather ha-icon { --mdc-icon-size: 4.5rem; color: var(--accent); }
.weather strong, .weather span, .weather small { display: block; }
.weather strong { font-size: clamp(2.25rem, 3vw, 4rem); }
.weather span, .weather small { color: var(--on-muted); text-transform: capitalize; }
.flow { min-width: 0; }
.topology { height: 31.25rem; }
.topology svg { width: 100%; height: 100%; overflow: visible; font-family: inherit; }
.track { fill: none; stroke: oklch(0.79 0.012 78 / 0.42); stroke-linecap: round; stroke-linejoin: round; stroke-width: 4; }
.track.active { stroke: var(--accent); stroke-width: 5; }
.flow-arrow { fill: var(--accent); }
.node circle { fill: oklch(0.18 0.01 78 / 0.66); stroke: var(--border); stroke-width: 2; }
.node.active circle, .home-node circle { stroke: var(--accent); stroke-width: 4; }
.node text { fill: var(--on-muted); text-anchor: middle; }
.node .value, .home-reading .value { fill: var(--on-surface); font-size: 1.35rem; font-weight: 700; }
.home-node foreignObject, .node foreignObject { color: var(--accent); }
.home-node ha-icon, .node ha-icon { width: 100%; height: 100%; --mdc-icon-size: 100%; }
.home-reading text { fill: var(--on-muted); }
.home-reading .value { fill: var(--accent); }
.climate-body { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.climate-reading strong, .climate-reading small { display: block; }
.climate-reading strong { font-size: clamp(1.4rem, 2vw, 2.1rem); white-space: nowrap; }
.climate-reading small { color: var(--on-muted); }
.cooling-control { display: grid; grid-template-columns: minmax(6.5rem, 1fr) auto; align-items: center; gap: var(--gap-2); }
.cool-toggle, .target-control button, .media-action, .control, .light-toggle, .alarm-action {
  min-width: 2.75rem;
  min-height: 2.75rem;
  border: 0.0625rem solid var(--border);
  border-radius: var(--radius-m);
  background: oklch(0.98 0.005 78 / 0.07);
  color: var(--on-surface);
}
.cool-toggle { display: flex; align-items: center; gap: var(--gap-2); padding: var(--gap-2); }
.cool-toggle span, .cool-toggle b, .cool-toggle small { display: block; }
.cool-toggle small { color: var(--on-muted); white-space: nowrap; }
.cool-toggle.cool { color: oklch(0.78 0.12 230); border-color: oklch(0.78 0.12 230 / 0.7); background: oklch(0.78 0.12 230 / 0.16); }
.target-control { display: flex; align-items: center; gap: var(--gap-1); white-space: nowrap; }
.target-control strong { min-width: 3.25rem; text-align: center; }
.media-row { display: flex; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.media-row div { flex: 1; min-width: 0; }
.media-row strong, .media-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-row small { color: var(--on-muted); }
.controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap-2); }
.controls .card-title { grid-column: 1 / -1; }
.control { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); text-align: center; }
.control span, .control small { display: block; }
.control small { color: var(--on-muted); text-transform: capitalize; }
.control.on, .light-card.on { color: var(--accent); border-color: oklch(0.79 0.15 82 / 0.65); background: oklch(0.79 0.15 82 / 0.14); }
.summary-row { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap-4); }
.summary { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-4); color: inherit; text-decoration: none; }
.summary div { flex: 1; }
.summary strong, .summary small { display: block; }
.summary small { color: var(--on-muted); }
.round { display: grid; width: 3rem; height: 3rem; flex: 0 0 auto; place-items: center; border: 0.0625rem solid oklch(0.79 0.15 82 / 0.42); border-radius: ${w.radius.round}; color: var(--accent); background: oklch(0.79 0.15 82 / 0.12); }
.page-grid { display: grid; gap: var(--gap-4); }
.security-grid { grid-template-columns: 24% 1fr; }
.alarm { padding: var(--gap-6); text-align: center; }
.alarm-ring { display: grid; width: 10rem; height: 10rem; place-items: center; margin: var(--gap-8) auto var(--gap-3); border: 0.25rem solid var(--accent); border-radius: ${w.radius.round}; }
.alarm-ring ha-icon { --mdc-icon-size: 4.5rem; }
.alarm-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap-2); margin-block-start: var(--gap-6); }
.alarm-action { display: grid; place-items: center; gap: var(--gap-1); padding: var(--gap-2); }
.camera-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap-3); }
.camera { position: relative; min-height: 14rem; margin: 0; overflow: hidden; border: 0.0625rem solid var(--border); border-radius: var(--radius-l); background: oklch(0.15 0.01 78); }
.camera img { width: 100%; height: 100%; object-fit: cover; }
.camera figcaption { position: absolute; inset: auto 0 0; display: flex; justify-content: space-between; padding: var(--gap-3); background: linear-gradient(transparent, oklch(0.12 0.01 78 / 0.85)); }
.camera-missing { display: grid; height: 100%; min-height: 14rem; place-items: center; align-content: center; gap: var(--gap-2); color: var(--on-muted); }
.energy-grid { grid-template-columns: 28% 42% 1fr; }
.metric-card, .today, .trend, .thermostat, .outside, .rooms, .now, .quick, .diagnostic, .diagnostic-note, .light-card { padding: var(--gap-6); }
.metric { display: flex; align-items: center; gap: var(--gap-3); margin-block-start: var(--gap-3); }
.metric small, .metric strong { display: block; }
.metric small { color: var(--on-muted); }
.climate-grid { grid-template-columns: 28% 42% 1fr; }
.temps, .climate-right { display: grid; gap: var(--gap-3); }
.temp-row { display: flex; align-items: center; gap: var(--gap-4); padding: var(--gap-4); }
.temp-row div { flex: 1; }
.temp-row small, .temp-row strong { display: block; }
.temp-row small { color: var(--on-muted); }
.thermostat .cooling-control { grid-template-columns: 1fr; justify-items: center; margin-block-start: var(--gap-8); }
.thermostat .target-control { gap: var(--gap-4); }
.thermostat .target-control strong { font-size: 3rem; }
.outside { display: flex; align-items: center; gap: var(--gap-4); }
.outside ha-icon { --mdc-icon-size: 4rem; color: var(--accent); }
.outside small, .outside strong, .outside span { display: block; }
.outside strong { font-size: 2.5rem; }
.media-grid { grid-template-columns: 31% 36% 1fr; }
.room-row { display: flex; align-items: center; gap: var(--gap-3); padding: var(--gap-3) 0; border-block-end: 0.0625rem solid var(--border); }
.room-row div { flex: 1; min-width: 0; }
.room-row strong, .room-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.room-row small { color: var(--on-muted); }
.now { text-align: center; }
.album { display: grid; width: 10rem; height: 10rem; place-items: center; margin: var(--gap-8) auto var(--gap-4); border: 0.125rem solid var(--border); border-radius: ${w.radius.round}; }
.transport { display: flex; justify-content: center; gap: var(--gap-3); margin-block-start: var(--gap-6); }
.quick { display: grid; gap: var(--gap-3); align-content: start; }
.quick a { color: inherit; }
.lights-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.light-card { display: flex; min-height: 15rem; flex-direction: column; justify-content: space-between; }
.light-heading { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gap-3); }
.light-heading small, .light-heading strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.light-heading small { color: var(--on-muted); }
.light-state { display: flex; align-items: end; justify-content: space-between; text-transform: capitalize; }
.light-state b { font-size: 2.5rem; }
.light-card input { width: 100%; min-height: 2.75rem; accent-color: var(--accent); }
.diagnostics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.diagnostic { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--gap-4); min-height: 10rem; }
.diagnostic small, .diagnostic strong, .diagnostic code { display: block; overflow-wrap: anywhere; }
.diagnostic small, .diagnostic code { color: var(--on-muted); }
.diagnostic-note { grid-column: 1 / -1; }
.diagnostic-note p { max-inline-size: 70ch; color: var(--on-muted); line-height: 1.55; }
.empty { display: grid; min-height: 24rem; place-items: center; padding: var(--gap-8); text-align: center; }
.empty p { max-inline-size: 60ch; color: var(--on-muted); }
@media (max-width: 81.25rem) {
  .shell { padding: var(--gap-4) var(--gap-6); }
  header { min-height: 10rem; }
  .nav { inset-inline-start: 15%; width: 72%; min-height: 3.5rem; }
  .nav a { min-height: 3rem; font-size: 0.78rem; }
  .home-grid { grid-template-rows: minmax(23rem, 1fr) 5.5rem; gap: var(--gap-3); }
  .topology { height: 22rem; }
  .clock, .weather, .compact, .controls, .flow { padding: var(--gap-4); }
  .cooling-control { grid-template-columns: minmax(6.25rem, 1fr) auto; gap: var(--gap-1); }
  .cool-toggle { padding: var(--gap-1) var(--gap-2); }
  .cool-toggle small { font-size: 0.62rem; }
  .target-control button { min-width: 2.75rem; min-height: 2.75rem; }
  .target-control strong { min-width: 2.25rem; }
  .control { min-height: 3.25rem; padding: var(--gap-1); font-size: 0.72rem; }
  .summary { padding: var(--gap-2) var(--gap-3); }
  .summary .round { display: none; }
  .camera { min-height: 10rem; }
  .metric-card, .today, .trend, .thermostat, .outside, .rooms, .now, .quick, .diagnostic, .diagnostic-note, .light-card { padding: var(--gap-4); }
  .light-card { min-height: 11rem; }
}
@media (max-width: 50rem), (orientation: portrait) {
  :host { position: relative; height: auto; min-height: 100vh; }
  .shell { min-height: 100vh; }
  header { min-height: 15rem; padding-block-start: 5rem; }
  .nav { inset-inline: 0; width: 100%; overflow-x: auto; grid-template-columns: repeat(8, minmax(5.25rem, 1fr)); }
  .brand { inset-block-start: 5rem; }
  .tools { inset-block-start: 5rem; }
  .home-grid, .security-grid, .energy-grid, .climate-grid, .media-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
  .summary-row, .lights-grid, .diagnostics-grid, .camera-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-row { grid-column: auto; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  .flow-arrow { display: none; }
}
`;
// src/entity-capabilities.ts
function E(e) {
	if (e === void 0 || e.state === "unavailable" || e.state === "unknown") return {
		available: !1,
		dimmable: !1,
		colorTemperature: !1
	};
	let t = e.attributes.supported_color_modes, n = Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
	return {
		available: !0,
		dimmable: n.some((e) => e !== "onoff"),
		colorTemperature: n.includes("color_temp")
	};
}
// src/power-flow.ts
function D(e, t, n) {
	return e.status === "unavailable" ? "unavailable" : Math.abs(e.value) < t ? "idle" : e.value > 0 ? n : n === "source" ? "sink" : "source";
}
function O(e, t, n) {
	return e.status === "unavailable" ? "unavailable" : e.value >= t ? n : "idle";
}
function k(e, t) {
	if (t.freshness === void 0) return "fresh";
	let n = v(e, t.freshness);
	return n.status === "unavailable" ? "unavailable" : n.entity.state === "on" ? "fresh" : "stale";
}
function A(e, t, n, r, i) {
	if (e === "stale") return "Telemetry stale";
	if (e === "unavailable") return "Telemetry freshness unavailable";
	let a = [
		t === "source" ? "Solar" : "",
		n === "source" ? "battery" : "",
		r === "source" ? "grid" : ""
	].filter(Boolean), o = [
		i === "sink" ? "home" : "",
		n === "sink" ? "battery" : "",
		r === "sink" ? "grid" : ""
	].filter(Boolean);
	return a.length === 0 || o.length === 0 ? "Power flow idle" : `${a.join(" + ")} → ${o.join(" + ")}`;
}
function j(e, t) {
	let n = t.entities.energy, r = k(e, n), i = y(e, n.solar), a = y(e, n.battery), o = y(e, n.grid), s = y(e, n.load), c = y(e, n.batterySoc);
	if (r !== "fresh") return {
		freshness: r,
		solar: "idle",
		battery: "idle",
		grid: "idle",
		load: "idle",
		solarPower: i,
		batteryPower: a,
		gridPower: o,
		loadPower: s,
		batterySoc: c,
		summary: r === "stale" ? "Telemetry stale" : "Telemetry freshness unavailable"
	};
	let l = O(i, t.flowThresholdW, "source"), u = t.batteryPositiveIs === "discharge" ? "source" : "sink", d = t.gridPositiveIs === "import" ? "source" : "sink", f = D(a, t.flowThresholdW, u), p = D(o, t.flowThresholdW, d), m = O(s, t.flowThresholdW, "sink");
	return {
		freshness: r,
		solar: l,
		battery: f,
		grid: p,
		load: m,
		solarPower: i,
		batteryPower: a,
		gridPower: o,
		loadPower: s,
		batterySoc: c,
		summary: A(r, l, f, p, m)
	};
}
function M(e, t = !0) {
	if (e.status === "unavailable") return "—";
	let n = t ? Math.abs(e.value) : e.value;
	return Math.abs(n) >= 1e3 ? `${(n / 1e3).toLocaleString(void 0, { maximumFractionDigits: 2 })} kW` : `${Math.round(n).toLocaleString()} W`;
}
// src/view-renderers.ts
function N(e) {
	return `<ha-icon icon="${b(e)}" aria-hidden="true"></ha-icon>`;
}
function P(e, t) {
	return e?.attributes[t];
}
function F(e, t, n) {
	let r = P(e, t);
	return typeof r == "string" || typeof r == "number" ? String(r) : n;
}
function I(e, t, n) {
	let r = Number(P(e, t));
	return Number.isFinite(r) ? r : n;
}
function L(e, t, n = "Unavailable") {
	if (t === void 0 || t === "") return n;
	let r = v(e.hass, t);
	return r.status === "available" ? r.entity.state.replaceAll("_", " ") : n;
}
function R(e, t, n = 0) {
	if (t === void 0 || t === "") return "—";
	let r = y(e.hass, t);
	return r.status === "available" ? r.value.toLocaleString(void 0, { maximumFractionDigits: n }) : "—";
}
function z(e, t) {
	return `${e.dashboardPath.replace(/\/$/u, "")}/${t}`;
}
function B(e, t, n) {
	let r = [
		["home", "Home"],
		["security", "Security"],
		["energy", "Energy"],
		["climate", "Climate"],
		["lights", "Lights"],
		["media", "Media"],
		["sonos", "Sonos"],
		["diagnostics", "System"]
	], i = new Intl.DateTimeFormat(void 0, {
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(e.now);
	return `<header><div class="brand">H2DC</div><nav class="nav" aria-label="Dashboard views">${r.map(([t, n]) => `<a class="${e.config.view === t ? "active" : ""}" href="${b(z(e.config, t))}">${n}</a>`).join("")}</nav><div class="tools">${N("mdi:magnify")}<a href="?h2dc_admin=1" aria-label="Show Home Assistant controls">${N("mdi:cog-outline")}</a></div><div class="intro"><span>${b(t)}</span><h1>${b(i)}</h1><p>${b(n)}</p></div></header>`;
}
function V(e) {
	return {
		"clear-night": "mdi:weather-night",
		cloudy: "mdi:weather-cloudy",
		exceptional: "mdi:alert-circle-outline",
		fog: "mdi:weather-fog",
		hail: "mdi:weather-hail",
		lightning: "mdi:weather-lightning",
		"lightning-rainy": "mdi:weather-lightning-rainy",
		partlycloudy: "mdi:weather-partly-cloudy",
		pouring: "mdi:weather-pouring",
		rainy: "mdi:weather-rainy",
		snowy: "mdi:weather-snowy",
		"snowy-rainy": "mdi:weather-snowy-rainy",
		sunny: "mdi:weather-sunny",
		windy: "mdi:weather-windy",
		"windy-variant": "mdi:weather-windy-variant"
	}[e] ?? "mdi:weather-cloudy-alert";
}
function H(e, t, n, r) {
	return !t || r ? "" : `<polygon class="flow-arrow" points="-7,-5 7,0 -7,5"><animateMotion dur="2s" begin="${n}" repeatCount="indefinite" path="${e}" rotate="auto"/></polygon>`;
}
function U(e) {
	return e === "source" || e === "sink";
}
function W(e) {
	let t = j(e.hass, e.config), n = t.solar === "source" || t.battery === "source" || t.grid === "source", r = {
		trunk: "M300 196 L300 142",
		solar: t.solar === "sink" ? "M300 196 Q300 226 270 226 L130 226 Q100 226 100 256" : "M100 256 Q100 226 130 226 L270 226 Q300 226 300 196",
		battery: t.battery === "sink" ? "M300 196 L300 256" : "M300 256 L300 196",
		grid: t.grid === "sink" ? "M300 196 Q300 226 330 226 L470 226 Q500 226 500 256" : "M500 256 Q500 226 470 226 L330 226 Q300 226 300 196"
	}, i = (e, t, n, r, i) => `<g class="node ${U(i) ? "active" : ""}" transform="translate(${e} 304)"><circle r="38"/><foreignObject x="-20" y="-20" width="40" height="40">${N(t)}</foreignObject><text y="66">${n}</text><text class="value" y="94">${b(r)}</text></g>`;
	return `<section class="glass flow"><div class="card-title">Home energy <a href="${b(z(e.config, "energy"))}" aria-label="Open Energy">›</a></div><div class="topology"><svg viewBox="0 0 600 440" role="img" aria-label="${b(t.summary)}"><path class="track ${n ? "active" : ""}" d="M300 196 L300 142"/><path class="track ${U(t.solar) ? "active" : ""}" d="M100 256 Q100 226 130 226 L270 226 Q300 226 300 196"/><path class="track ${U(t.battery) ? "active" : ""}" d="M300 196 L300 256"/><path class="track ${U(t.grid) ? "active" : ""}" d="M300 196 Q300 226 330 226 L470 226 Q500 226 500 256"/>${H(r.trunk, n, "0s", e.reducedMotion)}${H(r.solar, U(t.solar), "-.6s", e.reducedMotion)}${H(r.battery, U(t.battery), "-1.2s", e.reducedMotion)}${H(r.grid, U(t.grid), "-1.6s", e.reducedMotion)}<g class="home-node" transform="translate(300 92)"><circle r="54"/><foreignObject x="-26" y="-26" width="52" height="52">${N("mdi:home-outline")}</foreignObject></g><g class="home-reading" transform="translate(370 78)"><text>Home load</text><text class="value" y="34">${b(M(t.loadPower))}</text></g>${i(100, "mdi:solar-power", "Solar", M(t.solarPower), t.solar)}${i(300, "mdi:battery-medium", "Battery", t.batterySoc.status === "available" ? `${Math.round(t.batterySoc.value)}%` : "—", t.battery)}${i(500, "mdi:transmission-tower", "Grid", M(t.gridPower), t.grid)}</svg></div></section>`;
}
function G(e) {
	let t = e.config.entities.climate, n = v(e.hass, t), r = n.status === "available" ? n.entity : void 0, i = r?.state === "cool", a = I(r, "temperature", 18), o = I(r, "min_temp", 16), s = I(r, "max_temp", 30), c = I(r, "target_temp_step", 1), l = Math.max(o, a - c), u = Math.min(s, a + c);
	return `<div class="cooling-control"><button class="cool-toggle ${i ? "cool" : "off"}" data-action="climate-mode" data-entity="${t}" data-mode="${i ? "off" : "cool"}" aria-pressed="${i}" ${r === void 0 ? "disabled" : ""}>${N(i ? "mdi:snowflake" : "mdi:power")}<span><b>${i ? "Cool" : "Off"}</b><small>${i ? `Set to ${a} °C` : "Tap to cool"}</small></span></button><div class="target-control" aria-label="Target temperature"><button data-action="climate-temperature" data-entity="${t}" data-value="${l}" aria-label="Decrease target temperature" ${a <= o || r === void 0 ? "disabled" : ""}>−</button><strong>${a}°</strong><button data-action="climate-temperature" data-entity="${t}" data-value="${u}" aria-label="Increase target temperature" ${a >= s || r === void 0 ? "disabled" : ""}>+</button></div></div>`;
}
function ee(e, t, n, r) {
	let i = v(e.hass, t), a = i.status === "available" ? i.entity.state : "unavailable";
	return `<button class="control ${b(a)}" data-action="toggle" data-entity="${b(t)}" aria-pressed="${a === "on"}" ${i.status === "unavailable" ? "disabled" : ""}>${N(r)}<span>${b(n)}</span><small>${b(a)}</small></button>`;
}
function K(e, t, n, r, i) {
	return `<a class="glass summary" href="${b(z(e.config, i))}" aria-label="Open ${b(n)}: ${b(r)}"><span class="round">${N(t)}</span><div><strong>${b(n)}</strong><small>${b(r)}</small></div><b aria-hidden="true">›</b></a>`;
}
function te(e) {
	let t = e.config.entities, n = L(e, t.alarm).toLowerCase(), r = t.lights.filter((t) => v(e.hass, t.entity).status === "available" && e.hass.states[t.entity]?.state === "on").length, i = v(e.hass, t.weather), a = i.status === "available" ? i.entity : void 0, o = a?.state ?? "unavailable", s = F(a, "temperature", "—"), c = F(a, "humidity", "—"), l = new Intl.DateTimeFormat(void 0, {
		hour: "numeric",
		minute: "2-digit"
	}).format(e.now), u = t.media.primary, d = u === void 0 ? void 0 : v(e.hass, u), f = d?.status === "available" ? d.entity : void 0, p = L(e, t.climate, "off"), m = t.nearby.map((t) => ee(e, t.entity, t.label, t.icon)).join("");
	return `${B(e, "Home overview", `Alarm ${n} · ${r} selected lights on`)}<main class="home-grid"><div class="left-stack"><section class="glass clock"><strong>${b(l)}</strong><span>${b(new Intl.DateTimeFormat(void 0, {
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(e.now))}</span></section><section class="glass weather weather-${b(o.replace(/[^a-z-]/gu, ""))}"><div>${N(V(o))}</div><div><strong>${b(s)} °C</strong><span>${b(o.replaceAll("_", " "))}</span><small>Humidity ${b(c)}%</small></div></section></div>${W(e)}<div class="right-stack"><section class="glass compact"><div class="card-title">Climate <a href="${b(z(e.config, "climate"))}" aria-label="Open Climate">›</a></div><div class="climate-body"><div class="climate-reading"><strong>${R(e, t.roomTemperature, 1)} °C</strong><small>Living room</small></div>${G(e)}</div></section><section class="glass compact"><div class="card-title">Now playing <a href="${b(z(e.config, "media"))}" aria-label="Open Media">›</a></div><div class="media-row">${N("mdi:volume-high")}<div><strong>${b(F(f, "media_title", "No media playing"))}</strong><small>Surround speakers</small></div>${u === void 0 ? "" : `<button class="media-action" data-action="media" data-entity="${b(u)}" data-command="media_play_pause" aria-label="Play or pause" ${f === void 0 ? "disabled" : ""}>${N("mdi:play-pause")}</button>`}</div></section><section class="glass controls"><div class="card-title">Nearby controls</div>${m || "<p>No nearby controls configured.</p>"}</section></div><div class="summary-row">${K(e, "mdi:shield-home", "Security", `Alarm ${n}`, "security")}${K(e, "mdi:lightbulb-group", "Lights", `${r} on`, "lights")}${K(e, "mdi:thermometer", "Climate", `${R(e, t.roomTemperature, 1)} °C · ${p}`, "climate")}${K(e, "mdi:solar-power", "Solar", M(y(e.hass, t.energy.solar)), "energy")}</div></main>`;
}
function ne(e, t) {
	return typeof e == "string" && (e.startsWith("/api/") || e.startsWith("/local/") || e.startsWith("/media/") || e.startsWith("https://") || e.startsWith("data:image/")) ? e : `/api/camera_proxy/${encodeURIComponent(t)}`;
}
function re(e, t, n) {
	let r = v(e.hass, t);
	return r.status === "unavailable" ? `<figure class="camera unavailable"><div class="camera-missing">${N("mdi:camera-off-outline")}<span>Camera unavailable</span></div><figcaption><strong>${b(n)}</strong><span>Offline</span></figcaption></figure>` : `<figure class="camera"><img src="${b(ne(P(r.entity, "entity_picture"), t))}" alt="${b(n)} camera" loading="lazy"><figcaption><strong>${b(n)}</strong><span>Live</span></figcaption></figure>`;
}
function ie(e) {
	let t = L(e, e.config.entities.alarm).toLowerCase(), n = e.config.entities.cameras, r = b(e.config.entities.alarm), i = v(e.hass, e.config.entities.alarm).status === "unavailable" ? "disabled" : "";
	return `${B(e, "Security overview", `Alarm ${t} · ${n.length} configured zones`)}<main class="page-grid security-grid"><section class="glass alarm"><div class="card-title">Alarm system</div><div class="alarm-ring">${N("mdi:shield-outline")}</div><strong>${b(t)}</strong><div class="alarm-actions"><button class="alarm-action" data-action="alarm" data-entity="${r}" data-command="alarm_arm_home" ${i}>${N("mdi:home-outline")}Home</button><button class="alarm-action" data-action="alarm" data-entity="${r}" data-command="alarm_arm_away" ${i}>${N("mdi:walk")}Away</button><button class="alarm-action" data-action="alarm" data-entity="${r}" data-command="alarm_arm_night" ${i}>${N("mdi:weather-night")}Night</button></div></section><section class="camera-grid">${n.length === 0 ? "<section class=\"glass empty\"><div><h2>No cameras configured</h2><p>Add camera entities in the visual editor to populate this view.</p></div></section>" : n.map((t) => re(e, t.entity, t.label)).join("")}</section></main>`;
}
function q(e, t, n) {
	return `<div class="metric"><span class="round">${N(e)}</span><div><small>${b(t)}</small><strong>${b(n)}</strong></div></div>`;
}
function J(e) {
	let t = e.config.entities.energy;
	return `${B(e, "Energy overview", `${j(e.hass, e.config).summary} · Battery ${R(e, t.batterySoc)}%`)}<main class="page-grid energy-grid"><div class="page-grid"><section class="glass metric-card"><div class="card-title">Battery health</div>${q("mdi:battery", "Voltage", `${R(e, t.batteryVoltage, 2)} V`)}${q("mdi:thermometer", "Temperature", `${R(e, t.batteryTemperature, 1)} °C`)}</section><section class="glass metric-card"><div class="card-title">Inverter temperature</div>${q("mdi:thermometer", "AC", `${R(e, t.acTemperature, 1)} °C`)}${q("mdi:thermometer", "DC", `${R(e, t.dcTemperature, 1)} °C`)}</section></div>${W(e)}<section class="glass today"><div class="card-title">Today</div>${q("mdi:solar-power", "PV production", `${R(e, t.dailyPv, 1)} kWh`)}${q("mdi:transmission-tower", "Grid import", `${R(e, t.dailyGridImport, 1)} kWh`)}${q("mdi:battery-arrow-down", "Battery discharge", `${R(e, t.dailyBatteryDischarge, 1)} kWh`)}</section></main>`;
}
function ae(e, t, n, r) {
	return `<section class="glass temp-row"><span class="round">${N(r)}</span><div><small>${b(n)}</small><strong>${R(e, t, 1)} °C</strong></div><b aria-hidden="true">›</b></section>`;
}
function oe(e) {
	let t = e.config.entities, n = v(e.hass, t.weather), r = n.status === "available" ? n.entity : void 0, i = t.roomTemperatures.map((t) => ae(e, t.entity, t.room, t.icon)).join("");
	return `${B(e, "Climate overview", `Air conditioning ${L(e, t.climate, "off")} · Living room ${R(e, t.roomTemperature, 1)} °C`)}<main class="page-grid climate-grid"><div class="temps">${i || "<section class=\"glass empty\"><p>No room temperature sensors configured.</p></section>"}</div><section class="glass thermostat"><div class="card-title">Air conditioning</div><div class="climate-reading"><strong>${R(e, t.roomTemperature, 1)} °C</strong><small>Living room</small></div>${G(e)}</section><div class="climate-right"><section class="glass outside">${N(V(r?.state ?? "unavailable"))}<div><small>Outside</small><strong>${b(F(r, "temperature", "—"))} °C</strong><span>${b((r?.state ?? "Unavailable").replaceAll("_", " "))}</span></div></section></div></main>`;
}
function se(e, t, n, r) {
	let i = v(e.hass, t), a = i.status === "available" ? i.entity : void 0, o = E(a), s = a?.state ?? "unavailable", c = s === "on" ? "on" : s === "off" ? "off" : "unavailable", l = I(a, "brightness", s === "on" ? 255 : 0), u = Math.round(l / 255 * 100), d = F(a, "friendly_name", t);
	return `<section class="glass light-card ${c}"><div class="light-heading"><span class="round">${N(r)}</span><div><small>${b(n)}</small><strong>${b(d)}</strong></div><button class="light-toggle" data-action="toggle" data-entity="${b(t)}" aria-label="Toggle ${b(d)}" aria-pressed="${s === "on"}" ${o.available ? "" : "disabled"}>${N(s === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb-outline")}</button></div><div class="light-state"><span>${b(s)}</span>${o.dimmable ? `<b>${u}%</b>` : ""}</div>${o.dimmable ? `<input type="range" min="1" max="100" value="${Math.max(1, u)}" data-action="brightness" data-entity="${b(t)}" aria-label="${b(d)} brightness" ${o.available ? "" : "disabled"}>` : ""}</section>`;
}
function ce(e) {
	let t = e.config.entities.lights, n = t.filter((t) => e.hass.states[t.entity]?.state === "on").length;
	return `${B(e, "Lighting overview", `${n} of ${t.length} selected lights on`)}<main class="page-grid lights-grid">${t.length === 0 ? "<section class=\"glass empty\"><div><h2>No lights configured</h2><p>Add curated light entities in the visual editor. Brightness controls appear only when Home Assistant reports that capability.</p></div></section>" : t.map((t) => se(e, t.entity, t.room, t.icon)).join("")}</main>`;
}
function Y(e, t, n, r) {
	if (t === void 0) return `<div class="room-row unavailable"><span>${N(r)}</span><div><strong>${b(n)}</strong><small>Not configured</small></div></div>`;
	let i = v(e.hass, t), a = i.status === "available" ? i.entity : void 0;
	return `<div class="room-row"><span>${N(r)}</span><div><strong>${b(n)}</strong><small>${b(F(a, "media_title", a?.state ?? "Unavailable"))}</small></div><button class="media-action" data-action="media" data-entity="${b(t)}" data-command="media_play_pause" aria-label="Play or pause ${b(n)}" ${a === void 0 ? "disabled" : ""}>${N("mdi:play-pause")}</button></div>`;
}
function le(e) {
	let t = e.config.entities.media, n = t.primary === void 0 ? void 0 : v(e.hass, t.primary), r = n?.status === "available" ? n.entity : void 0, i = t.primary === void 0 ? void 0 : b(t.primary), a = r === void 0 ? "disabled" : "";
	return `${B(e, "Media overview", "Whole-house audio and television control")}<main class="page-grid media-grid"><section class="glass rooms"><div class="card-title">Living room</div>${Y(e, t.primary, "Surround speakers", "mdi:speaker-multiple")}${Y(e, t.livingTv, "Living room TV", "mdi:television")}</section><section class="glass rooms"><div class="card-title">Private rooms</div>${Y(e, t.bedroom, "Master bedroom", "mdi:bed-king-outline")}${Y(e, t.study, "Study", "mdi:bookshelf")}</section><section class="glass now"><div class="card-title">Now playing</div><div class="album">${N("mdi:music-note")}</div><h2>${b(F(r, "media_title", "No media playing"))}</h2><span>${b(F(r, "media_artist", "Select a source to start listening"))}</span>${i === void 0 ? "" : `<div class="transport"><button class="media-action" data-action="media" data-entity="${i}" data-command="media_previous_track" aria-label="Previous track" ${a}>${N("mdi:skip-previous")}</button><button class="media-action" data-action="media" data-entity="${i}" data-command="media_play_pause" aria-label="Play or pause" ${a}>${N("mdi:play")}</button><button class="media-action" data-action="media" data-entity="${i}" data-command="media_next_track" aria-label="Next track" ${a}>${N("mdi:skip-next")}</button></div>`}</section><section class="glass rooms"><div class="card-title">Whole home</div>${Y(e, t.family, "Family lounge", "mdi:sofa-outline")}${Y(e, t.kitchen, "Kitchen", "mdi:silverware-fork-knife")}${Y(e, t.dining, "Dining", "mdi:table-furniture")}</section><section class="glass quick"><div class="card-title">Quick controls</div>${i === void 0 ? "" : `<button class="media-action" data-action="media" data-entity="${i}" data-command="media_pause" ${a}>${N("mdi:pause")} Pause all</button>`}${e.config.sonoraUrl === void 0 ? "<p>Sonos controller URL not configured.</p>" : `<a href="${b(e.config.sonoraUrl)}">${N("mdi:speaker-multiple")} Open Sonos controller</a>`}</section></main>`;
}
function ue(e) {
	return `${B(e, "Sonos controller", "Stable whole-house audio handoff")}<main class="glass empty"><div>${N("mdi:speaker-multiple")}<h2>Whole-house audio</h2>${e.config.sonoraUrl === void 0 ? "<p>Add the HTTPS Sonora URL in the visual editor.</p>" : `<p>The controller opens directly to avoid nested-theme reload loops in Fully Kiosk.</p><a href="${b(e.config.sonoraUrl)}">Open Sonos controller</a>`}</div></main>`;
}
function X(e, t, n, r, i = "") {
	let a = L(e, r), o = a !== "Unavailable";
	return `<section class="glass diagnostic ${o ? "available" : "unavailable"}"><span class="round">${N(t)}</span><div><small>${b(n)}</small><strong>${b(a)}${o ? b(i) : ""}</strong><code>${b(r ?? "Not configured")}</code></div></section>`;
}
function de(e) {
	let t = e.config.entities.diagnostics, n = [
		[
			"mdi:battery",
			"Tablet battery",
			t.tabletBattery,
			"%"
		],
		[
			"mdi:power-plug",
			"Tablet power",
			t.pluggedIn,
			""
		],
		[
			"mdi:tablet-dashboard",
			"Tablet screen",
			t.screen,
			""
		],
		[
			"mdi:web",
			"Current page",
			t.currentPage,
			""
		],
		[
			"mdi:ethernet",
			"PoE port",
			t.poe,
			""
		],
		[
			"mdi:flash",
			"PoE draw",
			t.poePower,
			" W"
		]
	], r = n.filter(([, , t]) => L(e, t) === "Unavailable").length;
	return `${B(e, "System overview", r === 0 ? "Tablet and PoE telemetry online" : `${r} diagnostics unavailable`)}<main class="page-grid diagnostics-grid">${n.map(([t, n, r, i]) => X(e, t, n, r, i)).join("")}<section class="glass diagnostic-note"><div class="card-title">Commissioning status</div><p>This view is intentionally read-only. Charging automation and PoE switching remain controlled by Home Assistant, not dashboard taps.</p></section></main>`;
}
function fe(e) {
	switch (e.config.view) {
		case "home": return te(e);
		case "security": return ie(e);
		case "energy": return J(e);
		case "climate": return oe(e);
		case "lights": return ce(e);
		case "media": return le(e);
		case "sonos": return ue(e);
		case "diagnostics": return de(e);
		default: return e.config.view;
	}
}
// src/index.ts
var Z = "0.1.0-alpha.1";
function pe(e) {
	return e.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", "").replaceAll("\r", "");
}
function me(e, t, n) {
	let r = e.backgrounds.perView[e.view];
	if (r !== void 0) return r;
	let i = t.states["sun.sun"]?.state;
	return i === "below_horizon" || i === void 0 && (n.getHours() < 6 || n.getHours() >= 18) ? e.backgrounds.night ?? e.backgrounds.day : e.backgrounds.day ?? e.backgrounds.night;
}
function Q(e, t) {
	let n = e.dataset[t];
	if (n === void 0 || n === "") throw Error(`Missing interaction data: ${String(t)}`);
	return n;
}
function he(e) {
	if (e instanceof HTMLElement && e.dataset.action !== void 0) return {
		action: e.dataset.action,
		...e.dataset.entity === void 0 ? {} : { entity: e.dataset.entity },
		...e.dataset.command === void 0 ? {} : { command: e.dataset.command },
		...e.dataset.mode === void 0 ? {} : { mode: e.dataset.mode },
		...e.dataset.value === void 0 ? {} : { value: e.dataset.value }
	};
}
function ge(e, t) {
	return e.dataset.action === t.action && e.dataset.entity === t.entity && e.dataset.command === t.command && e.dataset.mode === t.mode && e.dataset.value === t.value;
}
var $ = class extends HTMLElement {
	#e;
	#t;
	#n;
	#r;
	#i = [];
	#a = "";
	constructor() {
		super(), this.#e = this.attachShadow({ mode: "open" }), this.#t = window.matchMedia("(prefers-reduced-motion: reduce)"), this.#e.addEventListener("click", (e) => this.#o(e)), this.#e.addEventListener("change", (e) => this.#s(e)), this.#t.addEventListener("change", () => this.#l());
	}
	static getConfigElement() {
		return document.createElement("h2dc-dashboard-editor");
	}
	static getStubConfig() {
		return { ...h({
			type: "custom:h2dc-dashboard-card",
			view: "home",
			config_version: 1
		}) };
	}
	setConfig(e) {
		let t = m(e);
		this.#n = t.status === "valid" ? t.config : void 0, this.#i = t.status === "invalid" ? t.issues : [], this.#l();
	}
	set hass(e) {
		this.#r = e, this.#l();
	}
	getCardSize() {
		return 9;
	}
	async #o(e) {
		let t = e.target;
		if (!(t instanceof Element)) return;
		let n = t.closest("[data-action]");
		if (!(n === null || n.matches(":disabled"))) try {
			let e = this.#r;
			if (e === void 0) throw Error("Home Assistant is not connected");
			let t = Q(n, "action"), r = Q(n, "entity");
			if (t === "toggle") await _(e, {
				type: "toggle",
				entityId: r
			});
			else if (t === "climate-mode") await _(e, {
				type: "set_climate_mode",
				entityId: r,
				mode: Q(n, "mode")
			});
			else if (t === "climate-temperature") await _(e, {
				type: "set_climate_temperature",
				entityId: r,
				temperature: Number(Q(n, "value"))
			});
			else if (t === "media") await _(e, {
				type: "media",
				entityId: r,
				command: Q(n, "command")
			});
			else if (t === "alarm") await _(e, {
				type: "alarm",
				entityId: r,
				command: Q(n, "command")
			});
			else return;
			this.#c("Command sent");
		} catch (e) {
			this.#a = e instanceof Error ? e.message : "Command failed", this.#l();
		}
	}
	async #s(e) {
		let t = e.target;
		if (t instanceof HTMLInputElement && t.dataset.action === "brightness" && !t.disabled) try {
			let e = this.#r;
			if (e === void 0) throw Error("Home Assistant is not connected");
			await _(e, {
				type: "set_light_brightness",
				entityId: Q(t, "entity"),
				brightnessPercent: Number(t.value)
			}), this.#c("Brightness updated");
		} catch (e) {
			this.#a = e instanceof Error ? e.message : "Brightness update failed", this.#l();
		}
	}
	#c(e) {
		this.#a = e;
		let t = this.#e.querySelector("[data-live-status]");
		t !== null && (t.textContent = e);
	}
	#l() {
		let e = he(this.#e.activeElement);
		this.classList.toggle("admin", new URLSearchParams(window.location.search).get("h2dc_admin") === "1");
		let t = this.#n, n = this.#r;
		if (t === void 0) {
			let e = this.#i.map((e) => `<li>${b(e)}</li>`).join("");
			this.#e.innerHTML = `<style>${T}</style><section class="setup" role="status"><strong>Configure H2DC</strong><p>Select the required alarm, climate, weather, room-temperature, and energy entities in the visual editor.</p><ul>${e}</ul></section>`;
			return;
		}
		if (n === void 0) {
			this.#e.innerHTML = `<style>${T}</style><section class="setup" role="status"><strong>Connecting to Home Assistant</strong><p>Waiting for the first state update.</p></section>`;
			return;
		}
		let r = /* @__PURE__ */ new Date();
		this.#e.innerHTML = `<style>${T}</style><article class="shell">${fe({
			config: t,
			hass: n,
			now: r,
			reducedMotion: this.#t.matches
		})}<p class="sr-only" data-live-status aria-live="polite">${b(this.#a)}</p></article>`;
		let i = this.#e.querySelector(".shell"), a = me(t, n, r);
		i !== null && a !== void 0 && i.style.setProperty("--active-background", `url("${pe(a)}")`), e !== void 0 && [...this.#e.querySelectorAll("[data-action]")].find((t) => ge(t, e))?.focus({ preventScroll: !0 });
	}
};
function _e() {
	return document.createElement("h2dc-dashboard-editor");
}
customElements.get("h2dc-dashboard-card") || customElements.define("h2dc-dashboard-card", $);
var ve = class extends $ {
	setConfig(e) {
		super.setConfig(n(e) ? {
			...e,
			type: "custom:h2dc-dashboard-card"
		} : e);
	}
};
customElements.get("h2dc-dashboard-preview") || customElements.define("h2dc-dashboard-preview", ve), customElements.get("h2dc-dashboard-editor") || customElements.define("h2dc-dashboard-editor", C), window.customCards ??= [], window.customCards.some((e) => e.type === "h2dc-dashboard-card") || window.customCards.push({
	type: "h2dc-dashboard-card",
	name: "H2DC Dashboard",
	description: "Configurable wall-tablet dashboard for Home Assistant",
	preview: !1,
	documentationURL: "https://github.com/flexyneat/h2dc-dashboard"
}), console.info(`H2DC Dashboard ${Z} loaded`);
export { $ as H2DCDashboardCard, Z as H2DC_PACKAGE_VERSION, w as TOKENS, _e as createH2DCConfigElement, j as derivePowerFlow, _ as dispatchDashboardAction, b as escapeHtml, M as formatPower, E as lightCapabilities, v as readEntity, y as readNumericState };
