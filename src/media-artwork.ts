import type { MediaEntities } from "./domain";
import type { HassEntity, HomeAssistant } from "./home-assistant";

/** One resolved cover image, including the trusted system that supplied it. */
export type MediaArtwork =
  | { readonly status: "available"; readonly source: "home-assistant" | "sonora"; readonly url: string; readonly alt: string }
  | { readonly status: "unavailable"; readonly reason: "no-track" | "no-artwork" | "unsafe-url" | "no-match" };

/** Minimal Sonora transport fields required to resolve a vouched cover. */
export interface SonoraTransport {
  readonly title: string;
  readonly artist: string;
  readonly album_art_uri: string;
  readonly provider_art_uri: string;
}

/** Minimal Sonora zone fields required to turn speaker-relative artwork into a proxy request. */
export interface SonoraZone {
  readonly host: string;
  readonly transport: SonoraTransport;
}

/** Parsed read-only subset of Sonora's `/api/state` response. */
export interface SonoraSnapshot {
  readonly zones: readonly SonoraZone[];
}

/** Returns a display string attribute without widening untrusted state. */
function stringAttribute(entity: HassEntity | undefined, name: string): string {
  const value = entity?.attributes[name];
  return typeof value === "string" ? value.trim() : "";
}

/** Allows only browser-safe image URLs supplied by Home Assistant. */
function safeHomeAssistantImage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("/api/") || value.startsWith("/local/") || value.startsWith("/media/")) return value;
  if (value.startsWith("https://") || value.startsWith("data:image/")) return value;
  return undefined;
}

/** Returns every configured Sonos/media entity once, preserving primary-player priority. */
function configuredPlayers(media: MediaEntities): readonly string[] {
  const candidates = [media.primary, media.dining, media.kitchen, media.family, media.roam, media.bedroom, media.study, media.livingTv];
  return [...new Set(candidates.filter((entityId): entityId is string => entityId !== undefined && entityId !== ""))];
}

/** The configured player whose current track should drive the shared Now Playing surface. */
export interface CurrentMedia {
  readonly entityId: string;
  readonly entity: HassEntity;
}

/** Selects the highest-priority configured player carrying real track metadata. */
export function resolveCurrentMedia(hass: HomeAssistant, media: MediaEntities): CurrentMedia | undefined {
  const priority: Readonly<Record<string, number>> = { playing: 4, buffering: 3, paused: 2, idle: 1 };
  let selected: CurrentMedia | undefined;
  let selectedScore = -1;
  for (const entityId of configuredPlayers(media)) {
    const entity = hass.states[entityId];
    if (entity === undefined || stringAttribute(entity, "media_title") === "") continue;
    const score = priority[entity.state] ?? 0;
    // Preserve configured order when two players have the same transport priority.
    if (score <= selectedScore) continue;
    selected = { entityId, entity };
    selectedScore = score;
  }
  return selected;
}

/** Resolves native Home Assistant artwork, including matching configured child players when an aggregate omits it. */
export function resolveHomeAssistantArtwork(hass: HomeAssistant, media: MediaEntities): MediaArtwork {
  const primary = resolveCurrentMedia(hass, media)?.entity;
  const title = stringAttribute(primary, "media_title");
  const artist = stringAttribute(primary, "media_artist");
  const primaryPicture = safeHomeAssistantImage(primary?.attributes.entity_picture);
  if (primaryPicture !== undefined) {
    return { status: "available", source: "home-assistant", url: primaryPicture, alt: title === "" ? "Current album artwork" : `${title} album artwork` };
  }
  if (title === "") return { status: "unavailable", reason: "no-track" };

  for (const entityId of configuredPlayers(media)) {
    const candidate = hass.states[entityId];
    if (candidate === undefined || stringAttribute(candidate, "media_title") !== title) continue;
    const candidateArtist = stringAttribute(candidate, "media_artist");
    if (artist !== "" && candidateArtist !== "" && candidateArtist !== artist) continue;
    const picture = safeHomeAssistantImage(candidate.attributes.entity_picture);
    if (picture !== undefined) return { status: "available", source: "home-assistant", url: picture, alt: `${title} album artwork` };
  }

  return { status: "unavailable", reason: "no-artwork" };
}

/** Parses only the Sonora state fields H2DC needs and rejects malformed snapshots. */
export function parseSonoraSnapshot(value: unknown): SonoraSnapshot | undefined {
  if (typeof value !== "object" || value === null || !("zones" in value) || !Array.isArray(value.zones)) return undefined;
  const zones: SonoraZone[] = [];
  for (const candidate of value.zones) {
    if (typeof candidate !== "object" || candidate === null || !("host" in candidate) || !("transport" in candidate)) continue;
    if (typeof candidate.host !== "string" || typeof candidate.transport !== "object" || candidate.transport === null) continue;
    const transport = candidate.transport;
    if (!("title" in transport) || !("artist" in transport) || !("album_art_uri" in transport) || !("provider_art_uri" in transport)) continue;
    if (typeof transport.title !== "string" || typeof transport.artist !== "string" || typeof transport.album_art_uri !== "string" || typeof transport.provider_art_uri !== "string") continue;
    zones.push({ host: candidate.host, transport: { title: transport.title, artist: transport.artist, album_art_uri: transport.album_art_uri, provider_art_uri: transport.provider_art_uri } });
  }
  return { zones };
}

/** Builds one Sonora `/api/art` URL only after an exact title and compatible artist match. */
export function resolveSonoraArtwork(snapshot: SonoraSnapshot, sonoraUrl: string, title: string, artist: string): MediaArtwork {
  let base: URL;
  try {
    base = new URL(sonoraUrl);
  } catch {
    return { status: "unavailable", reason: "unsafe-url" };
  }
  if (base.protocol !== "https:") return { status: "unavailable", reason: "unsafe-url" };
  const zone = snapshot.zones.find(({ transport }) => transport.title.trim() === title.trim()
    && (artist.trim() === "" || transport.artist.trim() === "" || transport.artist.trim() === artist.trim()));
  if (zone === undefined) return { status: "unavailable", reason: "no-match" };
  const art = zone.transport.provider_art_uri.trim() || zone.transport.album_art_uri.trim();
  if (art === "") return { status: "unavailable", reason: "no-artwork" };

  let upstream: URL;
  try {
    upstream = art.startsWith("http://") || art.startsWith("https://")
      ? new URL(art)
      : new URL(art.startsWith("/") ? art : `/${art}`, `http://${zone.host}:1400`);
  } catch {
    return { status: "unavailable", reason: "unsafe-url" };
  }
  if (upstream.protocol !== "http:" && upstream.protocol !== "https:") return { status: "unavailable", reason: "unsafe-url" };
  const proxy = new URL("/api/art", base);
  proxy.searchParams.set("u", upstream.toString());
  return { status: "available", source: "sonora", url: proxy.toString(), alt: `${title} album artwork` };
}

/** Loads Sonora's read-only snapshot without sending credentials or retaining referrer data. */
export async function fetchSonoraArtwork(sonoraUrl: string, title: string, artist: string, signal: AbortSignal): Promise<MediaArtwork> {
  let endpoint: URL;
  try {
    endpoint = new URL("/api/state", sonoraUrl);
  } catch {
    return { status: "unavailable", reason: "unsafe-url" };
  }
  if (endpoint.protocol !== "https:") return { status: "unavailable", reason: "unsafe-url" };
  try {
    const response = await fetch(endpoint, { method: "GET", mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", signal });
    if (!response.ok) return { status: "unavailable", reason: "no-match" };
    const snapshot = parseSonoraSnapshot(await response.json());
    return snapshot === undefined ? { status: "unavailable", reason: "no-match" } : resolveSonoraArtwork(snapshot, sonoraUrl, title, artist);
  } catch {
    return { status: "unavailable", reason: "no-match" };
  }
}

/** Injectable Sonora lookup used to test cancellation without browser or network dependencies. */
export type SonoraArtworkFetcher = (sonoraUrl: string, title: string, artist: string, signal: AbortSignal) => Promise<MediaArtwork>;

/** Input projection for one native-first artwork synchronization pass. */
export interface MediaArtworkSyncInput {
  readonly native: MediaArtwork;
  readonly sonoraUrl?: string;
  readonly title: string;
  readonly artist: string;
}

/** Owns one Sonora fallback request and prevents stale results from crossing track lifecycles. */
export class MediaArtworkSession {
  #artwork: MediaArtwork | undefined;
  #key = "";
  #request: AbortController | undefined;

  /** Creates a session with the production fetcher or an isolated test substitute. */
  public constructor(private readonly fetcher: SonoraArtworkFetcher = fetchSonoraArtwork) {}

  /** Returns the most recent native or Sonora result. */
  public get artwork(): MediaArtwork | undefined {
    return this.#artwork;
  }

  /** Synchronizes native artwork immediately and starts at most one exact-track Sonora fallback. */
  public sync(input: MediaArtworkSyncInput, onChange: () => void): void {
    if (input.native.status === "available") {
      this.#resetRequest();
      this.#artwork = input.native;
      return;
    }

    const title = input.title.trim();
    const artist = input.artist.trim();
    if (title === "" || input.sonoraUrl === undefined) {
      this.#resetRequest();
      this.#artwork = input.native;
      return;
    }

    const key = `${input.sonoraUrl}\u0000${title}\u0000${artist}`;
    // Routine HA updates must preserve a resolved cover or its in-flight request for the same track.
    if (key === this.#key) return;

    this.#resetRequest();
    this.#artwork = input.native;
    this.#key = key;
    const request = new AbortController();
    this.#request = request;
    void this.fetcher(input.sonoraUrl, title, artist, request.signal).then((artwork) => {
      if (request.signal.aborted || this.#key !== key) return;
      this.#request = undefined;
      this.#artwork = artwork;
      onChange();
    });
  }

  /** Cancels pending work and clears identity so a reconnected card can retry the same track. */
  public disconnect(): void {
    this.#resetRequest();
    this.#artwork = undefined;
  }

  /** Aborts the active request and invalidates any late completion. */
  #resetRequest(): void {
    this.#request?.abort();
    this.#request = undefined;
    this.#key = "";
  }
}
