/**
 * Builds a signed same-origin Home Assistant stream URL for one configured camera entity.
 *
 * @param entityId - Validated Home Assistant camera entity ID selected for medium playback.
 * @param signedPicture - The entity's signed `entity_picture` path supplied by Home Assistant.
 * @param origin - Current Home Assistant origin used to reject cross-origin input.
 * @returns A signed camera stream path, or undefined when the source cannot be trusted.
 */
export function buildMediumStreamUrl(entityId: string, signedPicture: unknown, origin: string): string | undefined {
  if (typeof signedPicture !== "string") return undefined;
  const encoded = encodeURIComponent(entityId);
  const expectedPath = `/api/camera_proxy/${encoded}`;
  try {
    const parsed = new URL(signedPicture, origin);
    // A signed same-origin picture path is the only authentication material accepted.
    if (parsed.origin !== origin || parsed.pathname !== expectedPath || parsed.search === "") return undefined;
    return `/api/camera_proxy_stream/${encoded}${parsed.search}`;
  } catch {
    return undefined;
  }
}
