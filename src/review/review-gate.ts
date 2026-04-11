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
import { createStructuredReviewSeverityCounts } from "./review-result.js";

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
  maxFindings?: Partial<Record<StructuredReviewSeverity, number>>;
}

export type ReviewGateViolationKind =
  | "severity-threshold"
  | "finding-budget"
  | "failed-review-budget"
  | "missing-structured-rollup";

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
  batchReviewTotals: number;
  passedBatchReviews: number;
  failedBatchReviews: number;
  highestObservedSeverity: StructuredReviewSeverity;
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

  return parts.length > 0 ? parts.join(" and ") : "0 inputs";
}

function formatViolations(violations: ReviewGateViolation[]): string {
  return violations.map((violation) => `- ${violation.message}`).join("\n");
}

function hasSeverityGate(thresholds: ReviewGateThresholds): boolean {
  return Boolean(
    thresholds.failOnSeverity ||
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
  thresholds: ReviewGateThresholds;
}): ReviewGateReport {
  const structuredReviewResults = input.structuredReviewResults || [];
  const batchSummaries = input.batchSummaries || [];
  const thresholds = input.thresholds;
  const findingCounts = createStructuredReviewSeverityCounts();
  const overallSeverityCounts = createStructuredReviewSeverityCounts();

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
              batchReviewTotals,
              passedBatchReviews,
              failedBatchReviews,
              highestObservedSeverity,
            },
            violations: [],
            inputs: { structuredReviewResults: [], batchSummaries: [] },
          })}.`
        : `Review gate failed with ${violations.length} violation${violations.length === 1 ? "" : "s"}.`,
    thresholds,
    counts: {
      findingCounts,
      overallSeverityCounts,
      reviewResults: structuredReviewResults.length,
      batchSummaries: batchSummaries.length,
      batchReviewTotals,
      passedBatchReviews,
      failedBatchReviews,
      highestObservedSeverity,
    },
    violations,
    inputs: {
      structuredReviewResults: structuredReviewResults.map(
        (loadedResult) => loadedResult.pathLabel,
      ),
      batchSummaries: batchSummaries.map((loadedSummary) => loadedSummary.pathLabel),
    },
  };

  return report;
}

export async function runReviewGate(input: {
  resultPaths?: string[];
  batchSummaryPaths?: string[];
  thresholds: ReviewGateThresholds;
  cwd?: string;
}): Promise<ReviewGateReport> {
  const cwd = input.cwd || process.cwd();
  const [structuredReviewResults, batchSummaries] = await Promise.all([
    loadStructuredReviewResults(input.resultPaths || [], cwd),
    loadBatchReviewArtifactSummaries(input.batchSummaryPaths || [], cwd),
  ]);

  return evaluateReviewGate({
    structuredReviewResults,
    batchSummaries,
    thresholds: input.thresholds,
  });
}
