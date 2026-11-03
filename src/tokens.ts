/** Design-token shape enforced before components consume semantic aliases. */
interface H2DCTokens {
  readonly color: {
    readonly surface: string;
    readonly surfaceRaised: string;
    readonly onSurface: string;
    readonly onSurfaceMuted: string;
    readonly border: string;
    readonly accent: string;
    readonly focus: string;
  };
  readonly space: Readonly<Record<"1" | "2" | "3" | "4" | "6" | "8" | "12" | "16", string>>;
  readonly radius: Readonly<Record<"small" | "medium" | "large" | "round", string>>;
  readonly motion: Readonly<Record<"instant" | "micro" | "standard", string>>;
}

/** Shared H2DC visual tokens; component code consumes semantic names only. */
export const TOKENS = {
  color: {
    surface: "oklch(0.21 0.012 78 / 0.84)",
    surfaceRaised: "oklch(0.27 0.014 78 / 0.9)",
    onSurface: "oklch(0.97 0.006 78)",
    onSurfaceMuted: "oklch(0.79 0.012 78)",
    border: "oklch(0.97 0.006 78 / 0.16)",
    accent: "oklch(0.79 0.15 82)",
    focus: "oklch(0.82 0.13 220)",
  },
  space: { "1": "0.25rem", "2": "0.5rem", "3": "0.75rem", "4": "1rem", "6": "1.5rem", "8": "2rem", "12": "3rem", "16": "4rem" },
  radius: { small: "0.5rem", medium: "0.75rem", large: "1.5rem", round: "999rem" },
  motion: { instant: "100ms", micro: "200ms", standard: "320ms" },
} as const satisfies H2DCTokens;
