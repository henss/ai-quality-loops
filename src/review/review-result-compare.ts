import * as fs from "node:fs/promises";
import {
  parseStructuredReviewResult,
} from "../contracts/json-contracts.js";
import {
  compareStructuredReviewResults,
  type StructuredReviewFindingComparison,
  type StructuredReviewFindingSnapshot,
  type StructuredReviewResultComparison,
} from "./review-result-comparison.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

export interface ReviewResultComparisonInputArtifact {
  pathLabel: string;
}

export interface ReviewResultComparisonReport {
  inputs: {
    before: ReviewResultComparisonInputArtifact;
    after: ReviewResultComparisonInputArtifact;
  };
  comparison: StructuredReviewResultComparison;
}

function formatFindingSnapshot(finding: StructuredReviewFindingSnapshot): string {
  return `- [${finding.severity}] ${finding.title}`;
}

function formatChangedFinding(finding: StructuredReviewFindingComparison): string {
  const changedFields = finding.changedFields.join(", ");
  return [
    `- [${finding.after.severity}] ${finding.title}`,
    `(was ${finding.before.severity}, ${finding.severityChange.direction}; changed: ${changedFields})`,
  ].join(" ");
}

function formatFindingSection(
  title: string,
  findings: string[],
): string[] {
  if (findings.length === 0) {
    return [];
  }

  return [title, ...findings];
}

export function formatReviewResultComparisonReport(
  report: ReviewResultComparisonReport,
): string {
  const { comparison } = report;
  const lines = [
    "Structured review comparison completed.",
    `Before: ${report.inputs.before.pathLabel}.`,
    `After: ${report.inputs.after.pathLabel}.`,
    `Overall severity: ${comparison.overallSeverityChange.before} -> ${comparison.overallSeverityChange.after} (${comparison.overallSeverityChange.direction}).`,
    [
      "Findings:",
      `before=${comparison.counts.beforeFindings},`,
      `after=${comparison.counts.afterFindings},`,
      `added=${comparison.counts.added},`,
      `removed=${comparison.counts.removed},`,
      `changed=${comparison.counts.changed},`,
      `unchanged=${comparison.counts.unchanged}.`,
    ].join(" "),
    [
      "Severity movement among matched findings:",
      `improved=${comparison.counts.severityMovement.improved},`,
      `regressed=${comparison.counts.severityMovement.regressed},`,
      `unchanged=${comparison.counts.severityMovement.unchanged}.`,
    ].join(" "),
    ...formatFindingSection(
      "Added findings:",
      comparison.added.map(formatFindingSnapshot),
    ),
    ...formatFindingSection(
      "Removed findings:",
      comparison.removed.map(formatFindingSnapshot),
    ),
    ...formatFindingSection(
      "Changed findings:",
      comparison.changed.map(formatChangedFinding),
    ),
  ];

  return lines.join("\n");
}

async function loadStructuredReviewResultArtifact(
  artifactPath: string,
  cwd = process.cwd(),
): Promise<{
  pathLabel: string;
  result: ReturnType<typeof parseStructuredReviewResult>;
}> {
  const resolvedPath = resolveFromCwd(artifactPath, cwd);
  const rawResult = await fs.readFile(resolvedPath, "utf-8");

  return {
    pathLabel: sanitizeReviewSurfaceValue(resolvedPath),
    result: parseStructuredReviewResult(JSON.parse(rawResult) as unknown),
  };
}

export async function runReviewResultComparison(input: {
  beforePath: string;
  afterPath: string;
  cwd?: string;
}): Promise<ReviewResultComparisonReport> {
  const cwd = input.cwd || process.cwd();
  const [before, after] = await Promise.all([
    loadStructuredReviewResultArtifact(input.beforePath, cwd),
    loadStructuredReviewResultArtifact(input.afterPath, cwd),
  ]);

  return {
    inputs: {
      before: {
        pathLabel: before.pathLabel,
      },
      after: {
        pathLabel: after.pathLabel,
      },
    },
    comparison: compareStructuredReviewResults({
      before: before.result,
      after: after.result,
    }),
  };
}
