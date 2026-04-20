import * as fs from "node:fs/promises";
import {
  parseBatchReviewArtifactSummary,
  parseStructuredReviewResult,
  type BatchReviewArtifactSummary,
  type StructuredReviewResult,
  type StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";
import {
  countBatchReviewComparisonDeltas,
  loadBatchReviewSummaryComparisonReports,
  type LoadedBatchReviewSummaryComparisonReport,
  type ReviewGateComparisonThresholds,
} from "./review-gate-comparison.js";
import {
  countBatchReviewPromptEval,
  createPromptEvalBudgetViolations,
} from "./review-gate-prompt-eval.js";
import { createStructuredReviewSeverityCounts } from "./review-result.js";

export {
  loadBatchReviewSummaryComparisonReports,
  type LoadedBatchReviewSummaryComparisonReport,
  type ReviewGateComparisonThresholds,
} from "./review-gate-comparison.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface LoadedStructuredReviewResult {
  path: string;
  pathLabel: string;
  result: StructuredReviewResult;
}

export interface LoadedBatchReviewArtifactSummary {
  path: string;
  pathLabel: string;
  summary: BatchReviewArtifactSummary;
}

export interface ReviewGateThresholds {
  failOnSeverity?: StructuredReviewSeverity;
  maxFailedReviews?: number;
  maxPromptEvalCount?: number;
  maxFindings?: Partial<Record<StructuredReviewSeverity, number>>;
  batchComparison?: ReviewGateComparisonThresholds;
}

export type ReviewGateViolationKind =
  | "severity-threshold"
  | "finding-budget"
  | "failed-review-budget"
  | "prompt-eval-budget"
  | "missing-prompt-eval-count"
  | "missing-structured-rollup"
  | "batch-comparison-added-finding-budget"
  | "batch-comparison-severity-regression-budget"
  | "batch-comparison-added-prompt-eval-budget"
  | "batch-comparison-missing-prompt-eval-count";

export interface ReviewGateViolation {
  kind: ReviewGateViolationKind;
  message: string;
  severity?: StructuredReviewSeverity;
  actual: number | string;
  allowed: number | string;
}

export interface ReviewGateCounts {
  findingCounts: Record<StructuredReviewSeverity, number>;
  overallSeverityCounts: Record<StructuredReviewSeverity, number>;
  reviewResults: number;
  batchSummaries: number;
  batchComparisonReports: number;
  batchReviewTotals: number;
  passedBatchReviews: number;
  failedBatchReviews: number;
  highestObservedSeverity: StructuredReviewSeverity;
  batchComparisonAddedFindings: Record<StructuredReviewSeverity, number>;
  batchComparisonSeverityRegressions: number;
  batchReviewPromptEvalCount: number;
  batchReviewPromptEvalMissing: number;
  batchComparisonAddedPromptEvalCount: number;
  batchComparisonPromptEvalUnavailable: number;
}

export interface ReviewGateReport {
  ok: boolean;
  summary: string;
  thresholds: ReviewGateThresholds;
  counts: ReviewGateCounts;
  violations: ReviewGateViolation[];
  inputs: {
    structuredReviewResults: string[];
    batchSummaries: string[];
    batchComparisons: string[];
  };
}

function severityRank(severity: StructuredReviewSeverity): number {
  return REVIEW_SEVERITY_ORDER.indexOf(severity);
}

function highestSeverity(
  severities: StructuredReviewSeverity[],
): StructuredReviewSeverity {
  for (const severity of REVIEW_SEVERITY_ORDER) {
    if (severities.includes(severity)) {
      return severity;
    }
  }

  return "unknown";
}

function isSeverityAtOrAbove(
  severity: StructuredReviewSeverity,
  threshold: StructuredReviewSeverity,
): boolean {
  return severityRank(severity) <= severityRank(threshold);
}

function formatSeverityCounts(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function formatInputCounts(report: ReviewGateReport): string {
  const parts: string[] = [];

  if (report.counts.reviewResults > 0) {
    parts.push(
      `${report.counts.reviewResults} structured review result${report.counts.reviewResults === 1 ? "" : "s"}`,
    );
  }

  if (report.counts.batchSummaries > 0) {
    parts.push(
      `${report.counts.batchSummaries} batch summar${report.counts.batchSummaries === 1 ? "y" : "ies"}`,
    );
  }

  if (report.counts.batchComparisonReports > 0) {
    parts.push(
      `${report.counts.batchComparisonReports} batch comparison report${report.counts.batchComparisonReports === 1 ? "" : "s"}`,
    );
  }

  return parts.length > 0 ? parts.join(" and ") : "0 inputs";
}

function formatViolations(violations: ReviewGateViolation[]): string {
  return violations.map((violation) => `- ${violation.message}`).join("\n");
}

function hasSeverityGate(thresholds: ReviewGateThresholds): boolean {
  return Boolean(
      thresholds.failOnSeverity ||
      Object.values(thresholds.batchComparison?.maxAddedFindings || {}).some(
        (value) => value !== undefined,
      ) ||
      thresholds.batchComparison?.maxSeverityRegressions !== undefined ||
      Object.values(thresholds.maxFindings || {}).some(
        (value) => value !== undefined,
      ),
  );
}

export function formatReviewGateReport(report: ReviewGateReport): string {
  const headline = report.ok ? "Review gate passed." : "Review gate failed.";
  const lines = [
    `${headline} Checked ${formatInputCounts(report)}.`,
    `Highest observed severity: ${report.counts.highestObservedSeverity}.`,
    `Finding counts: ${formatSeverityCounts(report.counts.findingCounts)}.`,
    `Batch review status counts: passed=${report.counts.passedBatchReviews}, failed=${report.counts.failedBatchReviews}, total=${report.counts.batchReviewTotals}.`,
    `Batch review prompt eval count: total=${report.counts.batchReviewPromptEvalCount}, missing=${report.counts.batchReviewPromptEvalMissing}.`,
    `Batch comparison deltas: added findings ${formatSeverityCounts(report.counts.batchComparisonAddedFindings)}; severity regressions=${report.counts.batchComparisonSeverityRegressions}.`,
    `Batch comparison prompt eval deltas: added=${report.counts.batchComparisonAddedPromptEvalCount}, unavailable=${report.counts.batchComparisonPromptEvalUnavailable}.`,
  ];

  if (report.violations.length > 0) {
    lines.push("Violations:");
    lines.push(formatViolations(report.violations));
  }

  return lines.join("\n");
}

export async function loadStructuredReviewResults(
  resultPaths: string[],
  cwd = process.cwd(),
): Promise<LoadedStructuredReviewResult[]> {
  return Promise.all(
    resultPaths.map(async (resultPath) => {
      const resolvedPath = resolveFromCwd(resultPath, cwd);
      const rawResult = await fs.readFile(resolvedPath, "utf-8");

      return {
        path: resolvedPath,
        pathLabel: sanitizeReviewSurfaceValue(resolvedPath),
        result: parseStructuredReviewResult(JSON.parse(rawResult) as unknown),
      };
    }),
  );
}

export async function loadBatchReviewArtifactSummaries(
  summaryPaths: string[],
  cwd = process.cwd(),
): Promise<LoadedBatchReviewArtifactSummary[]> {
  return Promise.all(
    summaryPaths.map(async (summaryPath) => {
      const resolvedPath = resolveFromCwd(summaryPath, cwd);
      const rawSummary = await fs.readFile(resolvedPath, "utf-8");

      return {
        path: resolvedPath,
        pathLabel: sanitizeReviewSurfaceValue(resolvedPath),
        summary: parseBatchReviewArtifactSummary(JSON.parse(rawSummary) as unknown),
      };
    }),
  );
}

export function evaluateReviewGate(input: {
  structuredReviewResults?: LoadedStructuredReviewResult[];
  batchSummaries?: LoadedBatchReviewArtifactSummary[];
  batchComparisons?: LoadedBatchReviewSummaryComparisonReport[];
  thresholds: ReviewGateThresholds;
}): ReviewGateReport {
  const structuredReviewResults = input.structuredReviewResults || [];
  const batchSummaries = input.batchSummaries || [];
  const batchComparisons = input.batchComparisons || [];
  const thresholds = input.thresholds;
  const findingCounts = createStructuredReviewSeverityCounts();
  const overallSeverityCounts = createStructuredReviewSeverityCounts();
  const batchComparisonCounts =
    countBatchReviewComparisonDeltas(batchComparisons);

  for (const loadedResult of structuredReviewResults) {
    overallSeverityCounts[loadedResult.result.overallSeverity] += 1;

    for (const finding of loadedResult.result.findings) {
      findingCounts[finding.severity] += 1;
    }
  }

  const failedBatchReviews = batchSummaries.reduce(
    (total, loadedSummary) => total + loadedSummary.summary.failed,
    0,
  );
  const passedBatchReviews = batchSummaries.reduce(
    (total, loadedSummary) => total + loadedSummary.summary.succeeded,
    0,
  );
  const batchReviewTotals = batchSummaries.reduce(
    (total, loadedSummary) => total + loadedSummary.summary.total,
    0,
  );
  let batchSummaryResultsMissingStructuredRollups = 0;
  let batchSummaryStructuredRollupCount = 0;
  const batchReviewPromptEval = countBatchReviewPromptEval(
    batchSummaries.map((loadedSummary) => loadedSummary.summary),
  );

  for (const loadedSummary of batchSummaries) {
    for (const result of loadedSummary.summary.results) {
      if (!result.structuredResult) {
        batchSummaryResultsMissingStructuredRollups += 1;
        continue;
      }

      batchSummaryStructuredRollupCount += 1;
      overallSeverityCounts[result.structuredResult.overallSeverity] += 1;

      for (const severity of REVIEW_SEVERITY_ORDER) {
        findingCounts[severity] += result.structuredResult.findingCounts[severity];
      }
    }
  }

  const highestObservedSeverity = highestSeverity([
    ...structuredReviewResults.map((loadedResult) => loadedResult.result.overallSeverity),
    ...batchSummaries.flatMap((loadedSummary) =>
      loadedSummary.summary.results
        .map((result) => result.structuredResult?.overallSeverity)
        .filter(
          (severity): severity is StructuredReviewSeverity =>
            severity !== undefined,
        ),
    ),
    ...REVIEW_SEVERITY_ORDER.filter((severity) => findingCounts[severity] > 0),
  ]);

  const violations: ReviewGateViolation[] = [];

  if (
    thresholds.failOnSeverity &&
    structuredReviewResults.length + batchSummaryStructuredRollupCount > 0 &&
    isSeverityAtOrAbove(
      highestObservedSeverity,
      thresholds.failOnSeverity,
    )
  ) {
    violations.push({
      kind: "severity-threshold",
      severity: thresholds.failOnSeverity,
      actual: highestObservedSeverity,
      allowed: `below ${thresholds.failOnSeverity}`,
      message: `Observed ${highestObservedSeverity} severity, which breaches the fail-on-severity threshold (${thresholds.failOnSeverity}).`,
    });
  }

  for (const severity of REVIEW_SEVERITY_ORDER) {
    const allowed = thresholds.maxFindings?.[severity];
    if (allowed === undefined) {
      continue;
    }

    const actual = findingCounts[severity];
    if (actual > allowed) {
      violations.push({
        kind: "finding-budget",
        severity,
        actual,
        allowed,
        message: `Observed ${actual} ${severity} finding${actual === 1 ? "" : "s"}, which exceeds the max-${severity} budget (${allowed}).`,
      });
    }
  }

  if (
    hasSeverityGate(thresholds) &&
    batchSummaryResultsMissingStructuredRollups > 0
  ) {
    violations.push({
      kind: "missing-structured-rollup",
      actual: batchSummaryResultsMissingStructuredRollups,
      allowed: "0 missing structuredResult rollups",
      message: `Cannot fully apply severity budgets because ${batchSummaryResultsMissingStructuredRollups} batch summary result${batchSummaryResultsMissingStructuredRollups === 1 ? "" : "s"} do${batchSummaryResultsMissingStructuredRollups === 1 ? "es" : ""} not include structuredResult rollups.`,
    });
  }

  if (
    thresholds.maxFailedReviews !== undefined &&
    failedBatchReviews > thresholds.maxFailedReviews
  ) {
    violations.push({
      kind: "failed-review-budget",
      actual: failedBatchReviews,
      allowed: thresholds.maxFailedReviews,
      message: `Observed ${failedBatchReviews} failed batch review${failedBatchReviews === 1 ? "" : "s"}, which exceeds the max-failed-reviews budget (${thresholds.maxFailedReviews}).`,
    });
  }

  violations.push(
    ...createPromptEvalBudgetViolations({
      counts: batchReviewPromptEval,
      maxPromptEvalCount: thresholds.maxPromptEvalCount,
    }),
  );

  for (const severity of REVIEW_SEVERITY_ORDER) {
    const allowed = thresholds.batchComparison?.maxAddedFindings?.[severity];
    if (allowed === undefined) {
      continue;
    }

    const actual = batchComparisonCounts.addedFindings[severity];
    if (actual > allowed) {
      violations.push({
        kind: "batch-comparison-added-finding-budget",
        severity,
        actual,
        allowed,
        message: `Observed ${actual} added ${severity} finding delta${actual === 1 ? "" : "s"} across batch comparison reports, which exceeds the max-added-${severity} budget (${allowed}).`,
      });
    }
  }

  if (
    thresholds.batchComparison?.maxSeverityRegressions !== undefined &&
    batchComparisonCounts.severityRegressions >
      thresholds.batchComparison.maxSeverityRegressions
  ) {
    violations.push({
      kind: "batch-comparison-severity-regression-budget",
      actual: batchComparisonCounts.severityRegressions,
      allowed: thresholds.batchComparison.maxSeverityRegressions,
      message: `Observed ${batchComparisonCounts.severityRegressions} batch comparison severity regression${batchComparisonCounts.severityRegressions === 1 ? "" : "s"}, which exceeds the max-severity-regressions budget (${thresholds.batchComparison.maxSeverityRegressions}).`,
    });
  }

  if (
    thresholds.batchComparison?.maxAddedPromptEvalCount !== undefined &&
    batchComparisonCounts.promptEvalCountUnavailable > 0
  ) {
    violations.push({
      kind: "batch-comparison-missing-prompt-eval-count",
      actual: batchComparisonCounts.promptEvalCountUnavailable,
      allowed: "0 unavailable prompt eval comparison entries",
      message: `Cannot fully apply the added prompt eval budget because ${batchComparisonCounts.promptEvalCountUnavailable} batch comparison entr${batchComparisonCounts.promptEvalCountUnavailable === 1 ? "y has" : "ies have"} unavailable prompt eval counts.`,
    });
  }

  if (
    thresholds.batchComparison?.maxAddedPromptEvalCount !== undefined &&
    batchComparisonCounts.addedPromptEvalCount >
      thresholds.batchComparison.maxAddedPromptEvalCount
  ) {
    violations.push({
      kind: "batch-comparison-added-prompt-eval-budget",
      actual: batchComparisonCounts.addedPromptEvalCount,
      allowed: thresholds.batchComparison.maxAddedPromptEvalCount,
      message: `Observed ${batchComparisonCounts.addedPromptEvalCount} added prompt eval count across batch comparison reports, which exceeds the max-added-prompt-eval-count budget (${thresholds.batchComparison.maxAddedPromptEvalCount}).`,
    });
  }

  const report: ReviewGateReport = {
    ok: violations.length === 0,
    summary:
      violations.length === 0
        ? `Review gate passed for ${formatInputCounts({
            ok: true,
            summary: "",
            thresholds,
            counts: {
              findingCounts,
              overallSeverityCounts,
              reviewResults: structuredReviewResults.length,
              batchSummaries: batchSummaries.length,
              batchComparisonReports: batchComparisons.length,
              batchReviewTotals,
              passedBatchReviews,
              failedBatchReviews,
              highestObservedSeverity,
              batchComparisonAddedFindings: batchComparisonCounts.addedFindings,
              batchComparisonSeverityRegressions:
                batchComparisonCounts.severityRegressions,
              batchReviewPromptEvalCount:
                batchReviewPromptEval.promptEvalCount,
              batchReviewPromptEvalMissing:
                batchReviewPromptEval.missingPromptEvalCount,
              batchComparisonAddedPromptEvalCount:
                batchComparisonCounts.addedPromptEvalCount,
              batchComparisonPromptEvalUnavailable:
                batchComparisonCounts.promptEvalCountUnavailable,
            },
            violations: [],
            inputs: {
              structuredReviewResults: [],
              batchSummaries: [],
              batchComparisons: [],
            },
          })}.`
        : `Review gate failed with ${violations.length} violation${violations.length === 1 ? "" : "s"}.`,
    thresholds,
    counts: {
      findingCounts,
      overallSeverityCounts,
      reviewResults: structuredReviewResults.length,
      batchSummaries: batchSummaries.length,
      batchComparisonReports: batchComparisons.length,
      batchReviewTotals,
      passedBatchReviews,
      failedBatchReviews,
      highestObservedSeverity,
      batchComparisonAddedFindings: batchComparisonCounts.addedFindings,
      batchComparisonSeverityRegressions:
        batchComparisonCounts.severityRegressions,
      batchReviewPromptEvalCount: batchReviewPromptEval.promptEvalCount,
      batchReviewPromptEvalMissing:
        batchReviewPromptEval.missingPromptEvalCount,
      batchComparisonAddedPromptEvalCount:
        batchComparisonCounts.addedPromptEvalCount,
      batchComparisonPromptEvalUnavailable:
        batchComparisonCounts.promptEvalCountUnavailable,
    },
    violations,
    inputs: {
      structuredReviewResults: structuredReviewResults.map(
        (loadedResult) => loadedResult.pathLabel,
      ),
      batchSummaries: batchSummaries.map((loadedSummary) => loadedSummary.pathLabel),
      batchComparisons: batchComparisons.map(
        (loadedComparison) => loadedComparison.pathLabel,
      ),
    },
  };

  return report;
}

export async function runReviewGate(input: {
  resultPaths?: string[];
  batchSummaryPaths?: string[];
  batchComparisonPaths?: string[];
  thresholds: ReviewGateThresholds;
  cwd?: string;
}): Promise<ReviewGateReport> {
  const cwd = input.cwd || process.cwd();
  const [structuredReviewResults, batchSummaries, batchComparisons] =
    await Promise.all([
    loadStructuredReviewResults(input.resultPaths || [], cwd),
    loadBatchReviewArtifactSummaries(input.batchSummaryPaths || [], cwd),
    loadBatchReviewSummaryComparisonReports(input.batchComparisonPaths || [], cwd),
  ]);

  return evaluateReviewGate({
    structuredReviewResults,
    batchSummaries,
    batchComparisons,
    thresholds: input.thresholds,
  });
}
