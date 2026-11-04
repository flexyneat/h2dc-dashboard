import { describe, expect, it, vi } from "vitest";
import type { MediaEntities } from "../src/domain";
import type { HassEntity, HomeAssistant } from "../src/home-assistant";
import { MediaArtworkSession, parseSonoraSnapshot, resolveCurrentMedia, resolveHomeAssistantArtwork, resolveSonoraArtwork, type MediaArtwork } from "../src/media-artwork";

const media = { primary: "media_player.speakers", dining: "media_player.dining" } satisfies MediaEntities;

/** Creates a read-only Home Assistant fixture for media artwork tests. */
function hass(states: Readonly<Record<string, HassEntity>>): HomeAssistant {
  return { states, callService: async () => undefined };
}

describe("media artwork", () => {
  it("selects a configured paused child when the aggregate player has no track metadata", () => {
    const current = resolveCurrentMedia(hass({
      "media_player.speakers": { state: "idle", attributes: {} },
      "media_player.dining": { state: "paused", attributes: { media_title: "STREET FIGHTER", media_artist: "FXRR", entity_picture: "/api/media_player_proxy/media_player.dining?token=two" } },
    }), media);
    expect(current?.entityId).toBe("media_player.dining");
    expect(resolveHomeAssistantArtwork(hass({
      "media_player.speakers": { state: "idle", attributes: {} },
      "media_player.dining": { state: "paused", attributes: { media_title: "STREET FIGHTER", media_artist: "FXRR", entity_picture: "/api/media_player_proxy/media_player.dining?token=two" } },
    }), media)).toMatchObject({ status: "available", url: "/api/media_player_proxy/media_player.dining?token=two" });
  });

  it("prefers the primary player's authenticated Home Assistant image", () => {
    const result = resolveHomeAssistantArtwork(hass({
      "media_player.speakers": { state: "playing", attributes: { media_title: "Penumbra", entity_picture: "/api/media_player_proxy/media_player.speakers?token=one" } },
    }), media);
    expect(result).toEqual({ status: "available", source: "home-assistant", url: "/api/media_player_proxy/media_player.speakers?token=one", alt: "Penumbra album artwork" });
  });

  it("uses a matching configured child when the aggregate omits artwork", () => {
    const result = resolveHomeAssistantArtwork(hass({
      "media_player.speakers": { state: "playing", attributes: { media_title: "Penumbra", media_artist: "Scott Buckley" } },
      "media_player.dining": { state: "playing", attributes: { media_title: "Penumbra", media_artist: "Scott Buckley", entity_picture: "/api/media_player_proxy/media_player.dining?token=two" } },
    }), media);
    expect(result).toMatchObject({ status: "available", source: "home-assistant", url: "/api/media_player_proxy/media_player.dining?token=two" });
  });

  it("rejects script URLs instead of placing them in an image source", () => {
    const result = resolveHomeAssistantArtwork(hass({
      "media_player.speakers": { state: "playing", attributes: { media_title: "Penumbra", entity_picture: "javascript:alert(1)" } },
    }), media);
    expect(result).toEqual({ status: "unavailable", reason: "no-artwork" });
  });

  it("parses Sonora state and builds its vouched artwork proxy URL", () => {
    const snapshot = parseSonoraSnapshot({ zones: [{ host: "192.168.4.184", transport: { title: "STREET FIGHTER", artist: "FXRR", album_art_uri: "/getaa?s=1&u=track", provider_art_uri: "" } }] });
    expect(snapshot).toBeDefined();
    if (snapshot === undefined) throw new Error("Expected parsed Sonora snapshot");
    const result = resolveSonoraArtwork(snapshot, "https://sonos.example.test", "STREET FIGHTER", "FXRR");
    expect(result).toEqual({
      status: "available",
      source: "sonora",
      url: "https://sonos.example.test/api/art?u=http%3A%2F%2F192.168.4.184%3A1400%2Fgetaa%3Fs%3D1%26u%3Dtrack",
      alt: "STREET FIGHTER album artwork",
    });
  });

  it("does not use artwork from a different Sonora track", () => {
    const snapshot = parseSonoraSnapshot({ zones: [{ host: "192.168.4.184", transport: { title: "Other", artist: "Artist", album_art_uri: "/getaa", provider_art_uri: "" } }] });
    if (snapshot === undefined) throw new Error("Expected parsed Sonora snapshot");
    expect(resolveSonoraArtwork(snapshot, "https://sonos.example.test", "Penumbra", "Scott Buckley")).toEqual({ status: "unavailable", reason: "no-match" });
  });

  it("retains a resolved Sonora cover across unrelated Home Assistant updates", async () => {
    const cover: MediaArtwork = { status: "available", source: "sonora", url: "https://sonos.example.test/api/art?u=cover", alt: "Penumbra album artwork" };
    const fetcher = vi.fn(async () => cover);
    const onChange = vi.fn();
    const session = new MediaArtworkSession(fetcher);
    const input = { native: { status: "unavailable", reason: "no-artwork" } as const, sonoraUrl: "https://sonos.example.test", title: "Penumbra", artist: "Scott Buckley" };

    session.sync(input, onChange);
    await Promise.resolve();
    session.sync(input, onChange);

    expect(session.artwork).toEqual(cover);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight lookup and rejects its stale result when the track clears", async () => {
    let resolveRequest: ((artwork: MediaArtwork) => void) | undefined;
    let requestSignal: AbortSignal | undefined;
    const fetcher = vi.fn((_url: string, _title: string, _artist: string, signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<MediaArtwork>((resolve) => { resolveRequest = resolve; });
    });
    const onChange = vi.fn();
    const session = new MediaArtworkSession(fetcher);
    session.sync({ native: { status: "unavailable", reason: "no-artwork" }, sonoraUrl: "https://sonos.example.test", title: "Penumbra", artist: "Scott Buckley" }, onChange);

    session.sync({ native: { status: "unavailable", reason: "no-track" }, sonoraUrl: "https://sonos.example.test", title: "", artist: "" }, onChange);
    resolveRequest?.({ status: "available", source: "sonora", url: "https://sonos.example.test/api/art?u=stale", alt: "Stale artwork" });
    await Promise.resolve();

    expect(requestSignal?.aborted).toBe(true);
    expect(session.artwork).toEqual({ status: "unavailable", reason: "no-track" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("retries the same track after disconnect and reconnect", () => {
    const fetcher = vi.fn(() => new Promise<MediaArtwork>(() => undefined));
    const session = new MediaArtworkSession(fetcher);
    const input = { native: { status: "unavailable", reason: "no-artwork" } as const, sonoraUrl: "https://sonos.example.test", title: "Penumbra", artist: "Scott Buckley" };

    session.sync(input, () => undefined);
    session.disconnect();
    session.sync(input, () => undefined);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
