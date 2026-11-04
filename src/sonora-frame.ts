import type { H2DCConfig, H2DCView } from "./domain";
import { TOKENS } from "./tokens";

/** Delay that keeps Sonora covered while its persisted custom theme is applied. */
export const SONORA_THEME_SETTLE_MS = TOKENS.readiness.sonoraThemeSettle;

/** Maximum time the H2DC curtain waits for Sonora's installed-theme catalogue. */
export const SONORA_THEME_TIMEOUT_MS = TOKENS.readiness.sonoraThemeTimeout;

/** Minimal fetch boundary used by the Sonora readiness gate. */
export type SonoraThemeFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Timer boundary used to keep the readiness gate deterministic in tests. */
export type SonoraThemeDelay = (milliseconds: number) => Promise<void>;

/**
 * Keeps the embedded controller covered until Sonora can resolve an installed theme.
 *
 * @param sonoraUrl - HTTPS base URL of the embedded Sonora controller.
 * @param fetcher - Fetch implementation used to request Sonora's theme catalogue.
 * @param signal - Abort signal tied to the connected dashboard element.
 * @param delay - Promise-based delay implementation, injectable for deterministic tests.
 * @returns A promise that settles after catalogue readiness or the bounded fallback timeout.
 */
export async function waitForSonoraThemeReady(
  sonoraUrl: string,
  fetcher: SonoraThemeFetcher,
  signal: AbortSignal,
  delay: SonoraThemeDelay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
): Promise<void> {
  const endpoint = new URL("/api/themes", sonoraUrl);
  const unavailable = (): Promise<void> => new Promise(() => {
    // A failed catalogue cannot prove the saved installed theme is ready.
  });
  const catalogue = fetcher(endpoint, { credentials: "omit", signal })
    .then((response) => response.ok ? undefined : unavailable())
    .catch(unavailable);
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
  // Sonora intentionally paints a built-in fallback before this catalogue resolves.
  await Promise.race([catalogue, delay(SONORA_THEME_TIMEOUT_MS), aborted]);
  if (signal.aborted) return;
  // Give React one commit after catalogue delivery before exposing the iframe.
  await delay(SONORA_THEME_SETTLE_MS);
}

/**
 * Produces a deterministic identity for one schema-normalized dashboard configuration.
 *
 * @param config - Configuration returned by the strict H2DC parser.
 * @returns A stable signature suitable for detecting equivalent Lovelace setConfig calls.
 */
export function dashboardConfigSignature(config: H2DCConfig): string {
  // The strict parser constructs every nested object in schema order, making JSON stable here.
  return JSON.stringify(config);
}

/**
 * Determines whether a connected Sonora iframe should survive a routine Home Assistant update.
 *
 * @param view - Active H2DC route.
 * @param forceFrameRender - Whether configuration or navigation requires a fresh iframe.
 * @param hasConnectedFrame - Whether the rendered region already owns a Sonora iframe.
 * @returns `true` only when replacing the iframe would be an unnecessary controller restart.
 */
export function shouldPreserveSonoraFrame(
  view: H2DCView,
  forceFrameRender: boolean,
  hasConnectedFrame: boolean,
): boolean {
  return view === "sonos" && !forceFrameRender && hasConnectedFrame;
}
