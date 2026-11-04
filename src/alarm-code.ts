import type { H2DCView } from "./domain";

/** Reasons the private alarm credential buffer can transition. */
export type AlarmCodeTransition =
  | { readonly reason: "render"; readonly view: H2DCView }
  | { readonly reason: "config-change" }
  | { readonly reason: "disconnect" };

/**
 * Keeps a partial alarm code only while the same connected Security view remains active.
 * @param code Current private credential buffer.
 * @param transition Security-context transition being applied.
 * @returns The retained code for Security rerenders, otherwise an empty buffer.
 */
export function transitionAlarmCode(code: string, transition: AlarmCodeTransition): string {
  return transition.reason === "render" && transition.view === "security" ? code : "";
}
