import * as fs from "node:fs/promises";
import type { StructuredReviewSeverity } from "../contracts/json-contracts.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";
import {
  parseBatchReviewSummaryComparisonReport,
  type BatchReviewSummaryComparisonReport,
} from "../contracts/batch-review-summary-comparison-contract.js";
import { createStructuredReviewSeverityCounts } from "./review-result.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface LoadedBatchReviewSummaryComparisonReport {
  path: string;
  pathLabel: string;
  report: BatchReviewSummaryComparisonReport;
}

export interface ReviewGateComparisonThresholds {
  maxAddedFindings?: Partial<Record<StructuredReviewSeverity, number>>;
  maxSeverityRegressions?: number;
  maxAddedPromptEvalCount?: number;
}

export interface ReviewGateComparisonCounts {
  addedFindings: Record<StructuredReviewSeverity, number>;
  severityRegressions: number;
  addedPromptEvalCount: number;
  promptEvalCountUnavailable: number;
}

export async function loadBatchReviewSummaryComparisonReports(
  comparisonPaths: string[],
  cwd = process.cwd(),
): Promise<LoadedBatchReviewSummaryComparisonReport[]> {
  return Promise.all(
    comparisonPaths.map(async (comparisonPath) => {
      const resolvedPath = resolveFromCwd(comparisonPath, cwd);
      const rawComparison = await fs.readFile(resolvedPath, "utf-8");

      return {
        path: resolvedPath,
        pathLabel: sanitizeReviewSurfaceValue(resolvedPath),
        report: parseBatchReviewSummaryComparisonReport(
          JSON.parse(rawComparison) as unknown,
        ),
      };
    }),
  );
}

export function countBatchReviewComparisonDeltas(
  batchComparisons: LoadedBatchReviewSummaryComparisonReport[],
): ReviewGateComparisonCounts {
  const addedFindings = createStructuredReviewSeverityCounts();
  let severityRegressions = 0;
  let addedPromptEvalCount = 0;
  let promptEvalCountUnavailable = 0;

  for (const loadedComparison of batchComparisons) {
    const comparison = loadedComparison.report.comparison;
    severityRegressions += comparison.counts.severityMovement.regressed;
    addedPromptEvalCount += comparison.counts.addedPromptEvalCount ?? 0;
    promptEvalCountUnavailable +=
      comparison.counts.promptEvalCountUnavailable ?? 0;

    for (const added of comparison.added) {
      if (!added.structuredResult) {
        continue;
      }

      for (const severity of REVIEW_SEVERITY_ORDER) {
        addedFindings[severity] += added.structuredResult.findingCounts[severity];
      }
    }

    for (const changed of comparison.changed) {
      if (!changed.findingCountDelta) {
        continue;
      }

      for (const severity of REVIEW_SEVERITY_ORDER) {
        addedFindings[severity] += Math.max(
          0,
          changed.findingCountDelta[severity],
        );
      }
    }
  }

  return {
    addedFindings,
    severityRegressions,
    addedPromptEvalCount,
    promptEvalCountUnavailable,
  };
}
