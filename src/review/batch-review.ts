import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";
import {
  parseBatchReviewManifest,
  type BatchReviewArtifactSummary,
  type BatchReviewManifest,
  type BatchReviewManifestDefaults,
  type BatchReviewManifestEntry,
  type BatchReviewMode,
} from "../contracts/json-contracts.js";
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

export type {
  BatchReviewArtifactSummary,
  BatchReviewManifest,
  BatchReviewManifestDefaults,
  BatchReviewManifestEntry,
  BatchReviewMode,
};

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

export async function loadBatchReviewManifest(
  manifestPath: string,
  cwd = process.cwd(),
): Promise<BatchReviewManifest> {
  const resolvedManifestPath = resolveFromCwd(manifestPath, cwd);
  const rawManifest = await fs.readFile(resolvedManifestPath, "utf-8");
  return parseBatchReviewManifest(JSON.parse(rawManifest) as unknown);
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
