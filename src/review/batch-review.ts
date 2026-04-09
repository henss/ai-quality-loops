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
  deriveBatchReviewExecutionPlan,
  deriveBatchReviewPreflightOptions,
  runBatchReviewEntries,
  runBatchReviewEntriesPreflight,
  type BatchReviewExecutionPlan,
  type BatchReviewExecutionPlanEntry,
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
  deriveBatchReviewExecutionPlan,
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
  BatchReviewExecutionPlan,
  BatchReviewExecutionPlanEntry,
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
  structuredOutputPath?: string;
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
  structuredOutputPath?: string;
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
  structuredOutputPath?: string;
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

export interface LoadBatchReviewExecutionPlanOptions {
  manifestPath: string;
  cwd?: string;
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
  const manifestDefaults = manifest.defaults;

  return manifest.reviews.map((entry, index) => {
    const mode = entry.mode || manifestDefaults?.mode;
    if (!mode) {
      throw new Error(
        `Review ${index + 1} is missing a mode. Set "defaults.mode" or "reviews[${index}].mode".`,
      );
    }

    const expert = entry.expert || manifestDefaults?.expert;
    if (mode === "expert" && !expert) {
      throw new Error(
        `Review ${index + 1} uses expert mode and requires an expert persona.`,
      );
    }

    const outputPath = entry.outputPath
      ? resolveFromCwd(entry.outputPath, cwd)
      : manifestDefaults?.outputDir
        ? path.join(
            resolveFromCwd(manifestDefaults.outputDir, cwd),
            `${deriveOutputFileStem(entry, index)}-${mode}-review.md`,
          )
        : undefined;
    const structuredOutputPath = entry.structuredOutputPath
      ? resolveFromCwd(entry.structuredOutputPath, cwd)
      : manifestDefaults?.structuredOutputDir
        ? path.join(
            resolveFromCwd(manifestDefaults.structuredOutputDir, cwd),
            `${deriveOutputFileStem(entry, index)}-${mode}-review.json`,
          )
        : undefined;

    return {
      index,
      name: entry.name,
      mode,
      target: entry.target,
      expert,
      model: entry.model || manifestDefaults?.model,
      outputPath,
      structuredOutputPath,
      width: entry.width ?? manifestDefaults?.width,
      height: entry.height ?? manifestDefaults?.height,
      sections: entry.sections ?? manifestDefaults?.sections,
      css: entry.css ?? manifestDefaults?.css,
      promptLibraryPath:
        entry.promptLibraryPath ?? manifestDefaults?.promptLibraryPath,
      contextPath: entry.contextPath ?? manifestDefaults?.contextPath,
      ollamaUrl: entry.ollamaUrl ?? manifestDefaults?.ollamaUrl,
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

export async function loadBatchReviewExecutionPlan({
  manifestPath,
  cwd = process.cwd(),
}: LoadBatchReviewExecutionPlanOptions): Promise<BatchReviewExecutionPlan> {
  const resolvedManifestPath = resolveFromCwd(manifestPath, cwd);
  const manifest = await loadBatchReviewManifest(resolvedManifestPath, cwd);
  const entries = normalizeBatchReviewManifest(manifest, cwd);
  return deriveBatchReviewExecutionPlan(entries);
}

export function formatBatchReviewExecutionPlan(
  plan: BatchReviewExecutionPlan,
): string {
  const lines = [`Batch review plan: ${plan.total} entr${plan.total === 1 ? "y" : "ies"}.`];
  const personaRequirements = plan.preflight.personaRequirements ?? [];
  const modelRequirements = plan.preflight.modelRequirements ?? [];
  const contextPaths = plan.preflight.contextPaths ?? [];

  for (const entry of plan.entries) {
    const namePrefix = entry.name ? `${entry.name}: ` : "";
    const details = [
      entry.outputPath
        ? `markdown ${sanitizeReviewSurfaceValue(entry.outputPath)}`
        : undefined,
      entry.structuredOutputPath
        ? `json ${sanitizeReviewSurfaceValue(entry.structuredOutputPath)}`
        : undefined,
      entry.model ? `model ${entry.model}` : undefined,
    ].filter(Boolean);

    lines.push(
      `- ${namePrefix}${entry.mode} ${entry.targetSummary}${details.length > 0 ? ` -> ${details.join(", ")}` : ""}`,
    );
  }

  lines.push(
    `Preflight mode: ${plan.preflight.mode}.`,
    `Persona requirements: ${personaRequirements.length}.`,
    `Model requirements: ${modelRequirements.length}.`,
    `Context files: ${contextPaths.length}.`,
  );

  return lines.join("\n");
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
