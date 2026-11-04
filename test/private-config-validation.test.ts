/**
 * @fileoverview Opt-in structural acceptance for an installation-private H2DC configuration.
 */

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { isRecord, parseConfig } from "../src/config-schema";

const privateConfigPath = process.env.H2DC_PRIVATE_CONFIG;

describe.runIf(privateConfigPath !== undefined)("installation-private H2DC candidate", () => {
  it("parses the complete candidate without leaking installation data into public fixtures", async () => {
    if (privateConfigPath === undefined) throw new Error("H2DC_PRIVATE_CONFIG is required");
    const candidate: unknown = JSON.parse(await readFile(privateConfigPath, "utf8"));
    expect(isRecord(candidate)).toBe(true);
    if (!isRecord(candidate)) return;
    const rawCard = candidate.card_config;
    expect(isRecord(rawCard)).toBe(true);
    if (!isRecord(rawCard)) return;

    // The preview entry performs this same alias normalization before strict parsing.
    const result = parseConfig({ ...rawCard, type: "custom:h2dc-dashboard-card" });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;

    expect(result.config.entities.cameras).toHaveLength(9);
    expect(result.config.entities.cameras.every((camera) => camera.mediumStreamEntity !== undefined)).toBe(true);
    expect(new Set(result.config.entities.cameras.map((camera) => camera.entity)).size).toBe(9);
    expect(new Set(result.config.entities.cameras.map((camera) => camera.mediumStreamEntity)).size).toBe(9);
    expect(result.config.entities.energy.solarForecastPower).toMatch(/^sensor\./u);
    expect(result.config.powerFlo.solarForecastSources.length).toBeGreaterThan(0);
    expect(result.config.powerFlo.gridStatusFallback).toBe(false);
  });
});
