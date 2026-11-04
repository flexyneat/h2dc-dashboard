import { describe, expect, it, vi } from "vitest";

import { restoreDialogTrigger, shouldHandleDialogClose } from "../src/focus-restoration";

describe("restoreDialogTrigger", () => {
  it("restores focus after the browser completes native dialog teardown", () => {
    const focus = vi.fn();
    let scheduled: FrameRequestCallback | undefined;
    const schedule = vi.fn((callback: FrameRequestCallback): number => {
      scheduled = callback;
      return 1;
    });

    restoreDialogTrigger({ focus }, schedule);

    expect(schedule).toHaveBeenCalledOnce();
    expect(focus).not.toHaveBeenCalled();
    expect(scheduled).toBeDefined();
    scheduled?.(0);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does not schedule work when the trigger no longer exists", () => {
    const schedule = vi.fn((_callback: FrameRequestCallback): number => 1);

    restoreDialogTrigger(undefined, schedule);

    expect(schedule).not.toHaveBeenCalled();
  });
});

describe("shouldHandleDialogClose", () => {
  it("ignores a delayed close event after the same dialog has already reopened", () => {
    expect(shouldHandleDialogClose(true)).toBe(false);
  });

  it("handles focus restoration only after the dialog is actually closed", () => {
    expect(shouldHandleDialogClose(false)).toBe(true);
  });
});
