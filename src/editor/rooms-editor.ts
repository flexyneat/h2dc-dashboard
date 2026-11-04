import { parseConfig } from "../config-schema";
import type { H2DCConfig } from "../domain";

/** Result of parsing an advanced room-model draft through the public configuration boundary. */
export type RoomsEditorParseResult =
  | { readonly status: "valid"; readonly config: H2DCConfig }
  | { readonly status: "invalid"; readonly message: string };

/**
 * Parses advanced room JSON without discarding invalid operator input.
 * @param current Last valid H2DC configuration.
 * @param value Operator-authored JSON draft.
 * @returns A validated configuration or an accessible error message.
 */
export function parseRoomsEditorDraft(current: H2DCConfig, value: string): RoomsEditorParseResult {
  let rooms: unknown;
  try {
    rooms = JSON.parse(value) as unknown;
  } catch {
    return { status: "invalid", message: "Rooms must be valid JSON." };
  }
  const result = parseConfig({ ...current, rooms });
  return result.status === "valid"
    ? { status: "valid", config: result.config }
    : { status: "invalid", message: result.issues.join(" ") };
}
