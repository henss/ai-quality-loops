import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";
import type {
  BatchReviewArtifactSummary,
  BatchReviewManifest,
  BatchReviewRerunSelectionOptions,
  BatchReviewSummary,
} from "./batch-review.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

type BatchReviewMode = "expert" | "vision";
type BatchReviewStatus = "success" | "failure";

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

function readRequiredNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `Manifest field "${fieldName}" must be a non-negative integer.`,
    );
  }

  return value;
}

function readRequiredMode(value: unknown, fieldName: string): BatchReviewMode {
  if (value !== "expert" && value !== "vision") {
    throw new Error(
      `Manifest field "${fieldName}" must be "expert" or "vision".`,
    );
  }

  return value;
}

function readRequiredStatus(
  value: unknown,
  fieldName: string,
): BatchReviewStatus {
  if (value !== "success" && value !== "failure") {
    throw new Error(
      `Manifest field "${fieldName}" must be "success" or "failure".`,
    );
  }

  return value;
}

function uniqueNames(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function createBatchReviewArtifactSummary(
  summary: BatchReviewSummary,
): BatchReviewArtifactSummary {
  return {
    manifestPath: sanitizeReviewSurfaceValue(summary.manifestPath),
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    results: summary.results.map((result) => ({
      index: result.index,
      name: result.name,
      mode: result.mode,
      targetSummary: result.targetSummary,
      outputPath: result.outputPath
        ? sanitizeReviewSurfaceValue(result.outputPath)
        : undefined,
      status: result.status,
      errorSummary: result.errorSummary,
    })),
  };
}

export function formatBatchReviewArtifactSummary(
  summary: BatchReviewSummary,
): string {
  return JSON.stringify(createBatchReviewArtifactSummary(summary), null, 2);
}

export async function writeBatchReviewArtifactSummary(
  summary: BatchReviewSummary,
  outputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, formatBatchReviewArtifactSummary(summary));
}

export async function loadBatchReviewArtifactSummary(
  summaryPath: string,
  cwd = process.cwd(),
): Promise<BatchReviewArtifactSummary> {
  const resolvedSummaryPath = resolveFromCwd(summaryPath, cwd);
  const rawSummary = await fs.readFile(resolvedSummaryPath, "utf-8");
  const parsed = JSON.parse(rawSummary) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("Batch review summary artifact must be a JSON object.");
  }

  if (!Array.isArray(parsed.results)) {
    throw new Error('Batch review summary artifact requires a "results" array.');
  }

  return {
    manifestPath: readOptionalString(parsed.manifestPath, "manifestPath") || "",
    total: readRequiredNumber(parsed.total, "total"),
    succeeded: readRequiredNumber(parsed.succeeded, "succeeded"),
    failed: readRequiredNumber(parsed.failed, "failed"),
    results: parsed.results.map((result, index) => {
      const fieldPath = `results[${index}]`;
      if (!isRecord(result)) {
        throw new Error(`Manifest field "${fieldPath}" must be an object.`);
      }

      return {
        index: readRequiredNumber(result.index, `${fieldPath}.index`),
        name: readOptionalString(result.name, `${fieldPath}.name`),
        mode: readRequiredMode(result.mode, `${fieldPath}.mode`),
        targetSummary:
          readOptionalString(result.targetSummary, `${fieldPath}.targetSummary`) ||
          "",
        outputPath: readOptionalString(
          result.outputPath,
          `${fieldPath}.outputPath`,
        ),
        status: readRequiredStatus(result.status, `${fieldPath}.status`),
        errorSummary: readOptionalString(
          result.errorSummary,
          `${fieldPath}.errorSummary`,
        ),
      };
    }),
  };
}

export function selectBatchReviewEntriesFromSummary(
  manifest: BatchReviewManifest,
  summary: BatchReviewArtifactSummary,
  options: BatchReviewRerunSelectionOptions,
): BatchReviewManifest {
  const requestedNames = uniqueNames(options.entryNames || []);
  const onlyFailed = options.onlyFailed === true;

  if (!onlyFailed && requestedNames.length === 0) {
    throw new Error(
      "Choose at least one rerun selector: --rerun-failed or --entry-name.",
    );
  }

  const selectedIndexes = new Set<number>();

  if (onlyFailed) {
    for (const result of summary.results) {
      if (result.status === "failure") {
        selectedIndexes.add(result.index);
      }
    }
  }

  for (const requestedName of requestedNames) {
    const matchingResults = summary.results.filter(
      (result) => result.name === requestedName,
    );

    if (matchingResults.length === 0) {
      throw new Error(
        `No prior batch summary entry named "${requestedName}" was found.`,
      );
    }

    if (matchingResults.length > 1) {
      throw new Error(
        `Batch summary entry name "${requestedName}" is ambiguous. Use unique review names in the manifest before rerunning by name.`,
      );
    }

    selectedIndexes.add(matchingResults[0].index);
  }

  if (selectedIndexes.size === 0) {
    throw new Error(
      "The requested rerun selection did not match any manifest entries.",
    );
  }

  const invalidIndexes = [...selectedIndexes].filter(
    (index) => index < 0 || index >= manifest.reviews.length,
  );
  if (invalidIndexes.length > 0) {
    throw new Error(
      `Batch summary artifact references manifest indexes that no longer exist: ${invalidIndexes.join(", ")}.`,
    );
  }

  return {
    defaults: manifest.defaults,
    reviews: manifest.reviews.filter((_entry, index) => selectedIndexes.has(index)),
  };
}
