/**
 * @file Verifies that the built H2DC artifact is safe for HACS publication.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, "hacs.json");
const PACKAGE_PATH = resolve(ROOT, "package.json");

/**
 * Reads and parses one JSON object from disk.
 *
 * @param {string} path - Absolute path to the JSON document.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON object.
 */
async function readJsonObject(path) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object.`);
  }
  return value;
}

/**
 * Requires one unknown value to be a non-empty string.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Human-readable field name for failures.
 * @returns {string} Validated string.
 */
function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

/**
 * Executes release-artifact verification and prints a reproducible digest.
 *
 * @returns {Promise<void>} Resolves only when the public artifact is safe to stage.
 */
async function verifyReleaseArtifact() {
  const manifest = await readJsonObject(MANIFEST_PATH);
  const packageMetadata = await readJsonObject(PACKAGE_PATH);
  const filename = requireString(manifest.filename, "hacs.json filename");
  const version = requireString(packageMetadata.version, "package.json version");

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error(`package.json version ${version} is not a supported semantic version.`);
  }
  if (filename !== "h2dc-dashboard.js") {
    throw new Error(`HACS must publish h2dc-dashboard.js, received ${filename}.`);
  }
  if (manifest.content_in_root !== false) {
    throw new Error("HACS content_in_root must remain false while the artifact lives in dist/.");
  }

  const artifactPath = resolve(ROOT, "dist", filename);
  const artifact = await readFile(artifactPath);
  const source = artifact.toString("utf8");

  if (!source.includes("h2dc-dashboard-card")) {
    throw new Error("Public artifact does not register h2dc-dashboard-card.");
  }
  if (source.includes("h2dc-dashboard-preview")) {
    throw new Error("Public artifact contains the preview-only custom element name.");
  }
  if (artifact.byteLength === 0) {
    throw new Error("Public artifact is empty.");
  }

  const digest = createHash("sha256").update(artifact).digest("hex");
  process.stdout.write(`Verified HACS artifact ${filename} v${version} sha256:${digest}\n`);
}

await verifyReleaseArtifact();
