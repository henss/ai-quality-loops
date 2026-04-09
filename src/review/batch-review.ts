import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";
import {
  type ReviewPreflightResult,
} from "./preflight.js";
import {
  runExpertReview,
  type ExpertReviewOptions,
} from "./expert-review.js";
import {
  runVisionReview,
  type VisionReviewOptions,
} from "./vision-review.js";
import {
  deriveBatchReviewPreflightOptions,
  runBatchReviewEntries,
  runBatchReviewEntriesPreflight,
} from "./batch-review-execution.js";
import {
  createBatchReviewArtifactSummary,
  formatBatchReviewArtifactSummary,
  loadBatchReviewArtifactSummary,
  selectBatchReviewEntriesFromSummary,
  writeBatchReviewArtifactSummary,
} from "./batch-review-artifacts.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

export {
  createBatchReviewArtifactSummary,
  deriveBatchReviewPreflightOptions,
  formatBatchReviewArtifactSummary,
  loadBatchReviewArtifactSummary,
  runBatchReviewEntries,
  runBatchReviewEntriesPreflight,
  selectBatchReviewEntriesFromSummary,
  writeBatchReviewArtifactSummary,
};

export type BatchReviewMode = "expert" | "vision";

export interface BatchReviewManifestDefaults {
  mode?: BatchReviewMode;
  expert?: string;
  model?: string;
  outputDir?: string;
  width?: number;
  height?: number;
  sections?: string[];
  css?: string;
  promptLibraryPath?: string;
  contextPath?: string;
  ollamaUrl?: string;
}

export interface BatchReviewManifestEntry extends BatchReviewManifestDefaults {
  name?: string;
  target: string;
  outputPath?: string;
}

export interface BatchReviewManifest {
  defaults?: BatchReviewManifestDefaults;
  reviews: BatchReviewManifestEntry[];
}

export interface NormalizedBatchReviewEntry {
  index: number;
  name?: string;
  mode: BatchReviewMode;
  target: string;
  expert?: string;
  model?: string;
  outputPath?: string;
  width?: number;
  height?: number;
  sections?: string[];
  css?: string;
  promptLibraryPath?: string;
  contextPath?: string;
  ollamaUrl?: string;
}

export interface BatchReviewResult {
  index: number;
  name?: string;
  mode: BatchReviewMode;
  targetSummary: string;
  outputPath?: string;
  status: "success" | "failure";
  errorSummary?: string;
}

export interface BatchReviewSummary {
  manifestPath: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchReviewResult[];
}

export interface BatchReviewArtifactResult {
  index: number;
  name?: string;
  mode: BatchReviewMode;
  targetSummary: string;
  outputPath?: string;
  status: "success" | "failure";
  errorSummary?: string;
}

export interface BatchReviewArtifactSummary {
  manifestPath: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchReviewArtifactResult[];
}

export interface BatchReviewRerunSelectionOptions {
  onlyFailed?: boolean;
  entryNames?: string[];
}

export interface RunBatchReviewManifestOptions {
  manifestPath: string;
  cwd?: string;
  runExpertReviewImpl?: (options: ExpertReviewOptions) => Promise<string>;
  runVisionReviewImpl?: (options: VisionReviewOptions) => Promise<string>;
}

export interface RunBatchReviewManifestPreflightOptions {
  manifestPath: string;
  cwd?: string;
  browserPath?: string;
  fetchImpl?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readOptionalNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Manifest field "${fieldName}" must be a finite number.`);
  }

  return value;
}

function readOptionalStringArray(
  value: unknown,
  fieldName: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Manifest field "${fieldName}" must be an array of strings.`);
  }

  return value;
}

function readMode(
  value: unknown,
  fieldName: string,
): BatchReviewMode | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== "expert" && value !== "vision") {
    throw new Error(
      `Manifest field "${fieldName}" must be "expert" or "vision".`,
    );
  }

  return value;
}

function parseManifestDefaults(
  rawDefaults: unknown,
  fieldPath: string,
): BatchReviewManifestDefaults {
  if (rawDefaults === undefined) {
    return {};
  }

  if (!isRecord(rawDefaults)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    mode: readMode(rawDefaults.mode, `${fieldPath}.mode`),
    expert: readOptionalString(rawDefaults.expert, `${fieldPath}.expert`),
    model: readOptionalString(rawDefaults.model, `${fieldPath}.model`),
    outputDir: readOptionalString(rawDefaults.outputDir, `${fieldPath}.outputDir`),
    width: readOptionalNumber(rawDefaults.width, `${fieldPath}.width`),
    height: readOptionalNumber(rawDefaults.height, `${fieldPath}.height`),
    sections: readOptionalStringArray(
      rawDefaults.sections,
      `${fieldPath}.sections`,
    ),
    css: readOptionalString(rawDefaults.css, `${fieldPath}.css`),
    promptLibraryPath: readOptionalString(
      rawDefaults.promptLibraryPath,
      `${fieldPath}.promptLibraryPath`,
    ),
    contextPath: readOptionalString(
      rawDefaults.contextPath,
      `${fieldPath}.contextPath`,
    ),
    ollamaUrl: readOptionalString(
      rawDefaults.ollamaUrl,
      `${fieldPath}.ollamaUrl`,
    ),
  };
}

function parseManifestEntry(
  rawEntry: unknown,
  index: number,
): BatchReviewManifestEntry {
  const fieldPath = `reviews[${index}]`;

  if (!isRecord(rawEntry)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  const target = readOptionalString(rawEntry.target, `${fieldPath}.target`);
  if (!target) {
    throw new Error(`Manifest field "${fieldPath}.target" is required.`);
  }

  return {
    ...parseManifestDefaults(rawEntry, fieldPath),
    name: readOptionalString(rawEntry.name, `${fieldPath}.name`),
    target,
    outputPath: readOptionalString(rawEntry.outputPath, `${fieldPath}.outputPath`),
  };
}

export async function loadBatchReviewManifest(
  manifestPath: string,
  cwd = process.cwd(),
): Promise<BatchReviewManifest> {
  const resolvedManifestPath = resolveFromCwd(manifestPath, cwd);
  const rawManifest = await fs.readFile(resolvedManifestPath, "utf-8");
  const parsed = JSON.parse(rawManifest) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Batch review manifest must be a JSON object.");
  }

  if (!Array.isArray(parsed.reviews) || parsed.reviews.length === 0) {
    throw new Error('Batch review manifest requires a non-empty "reviews" array.');
  }

  return {
    defaults: parseManifestDefaults(parsed.defaults, "defaults"),
    reviews: parsed.reviews.map((entry, index) => parseManifestEntry(entry, index)),
  };
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "review";
}

function deriveOutputFileStem(entry: BatchReviewManifestEntry, index: number): string {
  if (entry.name) {
    return toSlug(entry.name);
  }

  const basename = path.basename(entry.target).replace(path.extname(entry.target), "");
  if (basename && basename !== "." && basename !== "..") {
    return toSlug(basename);
  }

  return `review-${index + 1}`;
}

export function normalizeBatchReviewManifest(
  manifest: BatchReviewManifest,
  cwd = process.cwd(),
): NormalizedBatchReviewEntry[] {
  return manifest.reviews.map((entry, index) => {
    const mode = entry.mode || manifest.defaults?.mode;
    if (!mode) {
      throw new Error(
        `Review ${index + 1} is missing a mode. Set "defaults.mode" or "reviews[${index}].mode".`,
      );
    }

    const expert = entry.expert || manifest.defaults?.expert;
    if (mode === "expert" && !expert) {
      throw new Error(
        `Review ${index + 1} uses expert mode and requires an expert persona.`,
      );
    }

    const outputPath = entry.outputPath
      ? resolveFromCwd(entry.outputPath, cwd)
      : manifest.defaults?.outputDir
        ? path.join(
            resolveFromCwd(manifest.defaults.outputDir, cwd),
            `${deriveOutputFileStem(entry, index)}-${mode}-review.md`,
          )
        : undefined;

    return {
      index,
      name: entry.name,
      mode,
      target: entry.target,
      expert,
      model: entry.model || manifest.defaults?.model,
      outputPath,
      width: entry.width ?? manifest.defaults?.width,
      height: entry.height ?? manifest.defaults?.height,
      sections: entry.sections ?? manifest.defaults?.sections,
      css: entry.css ?? manifest.defaults?.css,
      promptLibraryPath:
        entry.promptLibraryPath ?? manifest.defaults?.promptLibraryPath,
      contextPath: entry.contextPath ?? manifest.defaults?.contextPath,
      ollamaUrl: entry.ollamaUrl ?? manifest.defaults?.ollamaUrl,
    };
  });
}

export async function runBatchReviewManifestPreflight({
  manifestPath,
  cwd = process.cwd(),
  browserPath,
  fetchImpl,
}: RunBatchReviewManifestPreflightOptions): Promise<ReviewPreflightResult> {
  const resolvedManifestPath = resolveFromCwd(manifestPath, cwd);
  const manifest = await loadBatchReviewManifest(resolvedManifestPath, cwd);
  const entries = normalizeBatchReviewManifest(manifest, cwd);

  return runBatchReviewEntriesPreflight({
    entries,
    cwd,
    browserPath,
    fetchImpl,
  });
}

export function formatBatchReviewSummary(summary: BatchReviewSummary): string {
  const lines = [
    `Batch review summary: ${summary.succeeded} succeeded, ${summary.failed} failed, ${summary.total} total.`,
  ];

  for (const result of summary.results) {
    const namePrefix = result.name ? `${result.name}: ` : "";
    const suffix =
      result.status === "failure"
        ? ` (${result.errorSummary})`
        : result.outputPath
          ? ` -> ${sanitizeReviewSurfaceValue(result.outputPath)}`
          : "";

    lines.push(
      `- [${result.status}] ${namePrefix}${result.mode} ${result.targetSummary}${suffix}`,
    );
  }

  return lines.join("\n");
}

export async function runBatchReviewManifest({
  manifestPath,
  cwd = process.cwd(),
  runExpertReviewImpl = runExpertReview,
  runVisionReviewImpl = runVisionReview,
}: RunBatchReviewManifestOptions): Promise<BatchReviewSummary> {
  const resolvedManifestPath = resolveFromCwd(manifestPath, cwd);
  const manifest = await loadBatchReviewManifest(resolvedManifestPath, cwd);
  const entries = normalizeBatchReviewManifest(manifest, cwd);
  return runBatchReviewEntries({
    manifestPath: resolvedManifestPath,
    entries,
    runExpertReviewImpl,
    runVisionReviewImpl,
  });
}
