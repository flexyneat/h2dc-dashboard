/** Minimal focus surface used by native-dialog dismissal recovery. */
export interface FocusTarget {
  /** Restores keyboard focus without moving the dashboard viewport. */
  focus(options?: FocusOptions): void;
}

/** Browser frame scheduler used to run after native dialog focus teardown. */
export type FocusScheduler = (callback: FrameRequestCallback) => number;

/**
 * Distinguishes a completed dialog dismissal from a delayed close event emitted after the same dialog was reopened.
 *
 * @param dialogOpen - Whether the native dialog is currently open when its close event is delivered.
 * @returns True only when teardown is still current and focus restoration is safe.
 */
export function shouldHandleDialogClose(dialogOpen: boolean): boolean {
  return !dialogOpen;
}

/**
 * Restores focus after the browser completes native dialog teardown.
 *
 * @param trigger - The current logical trigger, if it still exists after telemetry rerenders.
 * @param schedule - The animation-frame scheduler; injectable for deterministic tests.
 */
export function restoreDialogTrigger(trigger: FocusTarget | undefined, schedule: FocusScheduler): void {
  if (trigger === undefined) return;
  // Native dialog teardown can run after its close event, so defer focus by one frame.
  schedule(() => trigger.focus({ preventScroll: true }));
}
