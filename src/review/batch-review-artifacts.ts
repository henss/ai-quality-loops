import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";
import {
  parseBatchReviewArtifactSummary,
  type BatchReviewArtifactSummary,
  type BatchReviewManifest,
} from "../contracts/json-contracts.js";
import type {
  BatchReviewRerunSelectionOptions,
  BatchReviewSummary,
} from "./batch-review.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

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
      resultKey: result.resultKey,
      mode: result.mode,
      targetSummary: sanitizeReviewSurfaceValue(result.targetSummary),
      outputPath: result.outputPath
        ? sanitizeReviewSurfaceValue(result.outputPath)
        : undefined,
      structuredOutputPath: result.structuredOutputPath
        ? sanitizeReviewSurfaceValue(result.structuredOutputPath)
        : undefined,
      structuredResult: result.structuredResult,
      status: result.status,
      errorSummary: result.errorSummary
        ? sanitizeReviewSurfaceValue(result.errorSummary)
        : undefined,
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
  return parseBatchReviewArtifactSummary(JSON.parse(rawSummary) as unknown);
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
