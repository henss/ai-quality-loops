import type {
  BatchReviewSummaryComparisonReport,
  BatchReviewSummaryEntryComparison,
  BatchReviewSummaryEntrySnapshot,
} from "../contracts/batch-review-summary-comparison-contract.js";
import type { StructuredReviewSeverity } from "../contracts/json-contracts.js";
import {
  sanitizeReviewSurfaceValue,
  type ReviewSurfaceRedactions,
} from "../shared/review-surface.js";

export type MultiReviewCoverageState =
  | "covered"
  | "uncovered"
  | "failed"
  | "unavailable";

export type MultiReviewContradictionSignal =
  | "none"
  | "missing-baseline"
  | "missing-candidate"
  | "status-changed"
  | "severity-improved"
  | "severity-regressed"
  | "severity-unavailable"
  | "finding-count-changed";

export interface MultiReviewContradictionCoverageMatrixRow {
  resultKey: string;
  label: string;
  baselineCoverage: MultiReviewCoverageState;
  candidateCoverage: MultiReviewCoverageState;
  overlap: "both-covered" | "baseline-only" | "candidate-only" | "not-covered";
  contradictionSignals: MultiReviewContradictionSignal[];
  baselineSeverity?: StructuredReviewSeverity;
  candidateSeverity?: StructuredReviewSeverity;
  findingsDelta?: number;
  note: string;
}

export interface MultiReviewContradictionCoverageMatrix {
  schemaVersion: "1";
  inputs: BatchReviewSummaryComparisonReport["inputs"];
  totals: {
    rows: number;
    bothCovered: number;
    baselineOnly: number;
    candidateOnly: number;
    notCovered: number;
    rowsWithContradictions: number;
    uncoveredChecks: number;
  };
  rows: MultiReviewContradictionCoverageMatrixRow[];
}

export interface CreateMultiReviewContradictionCoverageMatrixOptions {
  extraRedactions?: ReviewSurfaceRedactions;
}

function sanitizeLabel(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
    extraRedactions,
  });
}

function coverageForSnapshot(
  snapshot?: BatchReviewSummaryEntrySnapshot,
): MultiReviewCoverageState {
  if (!snapshot) {
    return "uncovered";
  }

  if (snapshot.status === "failure") {
    return "failed";
  }

  return snapshot.structuredResult ? "covered" : "unavailable";
}

function overlapForCoverage(input: {
  baselineCoverage: MultiReviewCoverageState;
  candidateCoverage: MultiReviewCoverageState;
}): MultiReviewContradictionCoverageMatrixRow["overlap"] {
  const baselineCovered = input.baselineCoverage === "covered";
  const candidateCovered = input.candidateCoverage === "covered";

  if (baselineCovered && candidateCovered) {
    return "both-covered";
  }

  if (baselineCovered) {
    return "baseline-only";
  }

  if (candidateCovered) {
    return "candidate-only";
  }

  return "not-covered";
}

function signalsForChangedEntry(
  entry: BatchReviewSummaryEntryComparison,
): MultiReviewContradictionSignal[] {
  const signals: MultiReviewContradictionSignal[] = [];

  if (entry.statusChange.changed) {
    signals.push("status-changed");
  }

  if (entry.severityChange.direction === "improved") {
    signals.push("severity-improved");
  }

  if (entry.severityChange.direction === "regressed") {
    signals.push("severity-regressed");
  }

  if (entry.severityChange.direction === "unavailable") {
    signals.push("severity-unavailable");
  }

  if (entry.totalFindingsDelta !== undefined && entry.totalFindingsDelta !== 0) {
    signals.push("finding-count-changed");
  }

  return signals.length > 0 ? signals : ["none"];
}

function labelForSnapshots(
  resultKey: string,
  before?: BatchReviewSummaryEntrySnapshot,
  after?: BatchReviewSummaryEntrySnapshot,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeLabel(after?.name || before?.name || resultKey, extraRedactions);
}

function noteForRow(input: {
  baselineCoverage: MultiReviewCoverageState;
  candidateCoverage: MultiReviewCoverageState;
  signals: MultiReviewContradictionSignal[];
  findingsDelta?: number;
}): string {
  if (input.signals.includes("missing-baseline")) {
    return "Candidate produced a covered check that is absent from the baseline summary.";
  }

  if (input.signals.includes("missing-candidate")) {
    return "Baseline produced a covered check that is absent from the candidate summary.";
  }

  if (input.signals.includes("none")) {
    return "Covered by both summaries with no matrix-level contradiction signal.";
  }

  const parts = input.signals.map((signal) => signal.replace(/-/g, " "));
  if (input.findingsDelta !== undefined && input.findingsDelta !== 0) {
    parts.push(`findings delta ${input.findingsDelta}`);
  }

  if (
    input.baselineCoverage !== "covered" ||
    input.candidateCoverage !== "covered"
  ) {
    parts.push(
      `coverage ${input.baselineCoverage}->${input.candidateCoverage}`,
    );
  }

  return `Matrix signals: ${parts.join(", ")}.`;
}

function createRow(input: {
  resultKey: string;
  before?: BatchReviewSummaryEntrySnapshot;
  after?: BatchReviewSummaryEntrySnapshot;
  signals: MultiReviewContradictionSignal[];
  findingsDelta?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}): MultiReviewContradictionCoverageMatrixRow {
  const baselineCoverage = coverageForSnapshot(input.before);
  const candidateCoverage = coverageForSnapshot(input.after);

  return {
    resultKey: sanitizeLabel(input.resultKey, input.extraRedactions),
    label: labelForSnapshots(
      input.resultKey,
      input.before,
      input.after,
      input.extraRedactions,
    ),
    baselineCoverage,
    candidateCoverage,
    overlap: overlapForCoverage({ baselineCoverage, candidateCoverage }),
    contradictionSignals: input.signals,
    baselineSeverity: input.before?.structuredResult?.overallSeverity,
    candidateSeverity: input.after?.structuredResult?.overallSeverity,
    findingsDelta: input.findingsDelta,
    note: noteForRow({
      baselineCoverage,
      candidateCoverage,
      signals: input.signals,
      findingsDelta: input.findingsDelta,
    }),
  };
}

function sortRows(
  rows: MultiReviewContradictionCoverageMatrixRow[],
): MultiReviewContradictionCoverageMatrixRow[] {
  return rows.sort(
    (left, right) =>
      left.resultKey.localeCompare(right.resultKey) ||
      left.label.localeCompare(right.label),
  );
}

function countRows(
  rows: MultiReviewContradictionCoverageMatrixRow[],
): MultiReviewContradictionCoverageMatrix["totals"] {
  return {
    rows: rows.length,
    bothCovered: rows.filter((row) => row.overlap === "both-covered").length,
    baselineOnly: rows.filter((row) => row.overlap === "baseline-only").length,
    candidateOnly: rows.filter((row) => row.overlap === "candidate-only").length,
    notCovered: rows.filter((row) => row.overlap === "not-covered").length,
    rowsWithContradictions: rows.filter(
      (row) => !row.contradictionSignals.includes("none"),
    ).length,
    uncoveredChecks: rows.filter((row) => row.overlap !== "both-covered").length,
  };
}

export function createMultiReviewContradictionCoverageMatrix(
  report: BatchReviewSummaryComparisonReport,
  options: CreateMultiReviewContradictionCoverageMatrixOptions = {},
): MultiReviewContradictionCoverageMatrix {
  const rows = sortRows([
    ...report.comparison.changed.map((entry) =>
      createRow({
        resultKey: entry.resultKey,
        before: entry.before,
        after: entry.after,
        signals: signalsForChangedEntry(entry),
        findingsDelta: entry.totalFindingsDelta,
        extraRedactions: options.extraRedactions,
      }),
    ),
    ...report.comparison.unchanged.map((entry) =>
      createRow({
        resultKey: entry.resultKey,
        before: entry.before,
        after: entry.after,
        signals: ["none"],
        findingsDelta: entry.totalFindingsDelta,
        extraRedactions: options.extraRedactions,
      }),
    ),
    ...report.comparison.added.map((entry) =>
      createRow({
        resultKey: entry.resultKey,
        after: entry,
        signals: ["missing-baseline"],
        extraRedactions: options.extraRedactions,
      }),
    ),
    ...report.comparison.removed.map((entry) =>
      createRow({
        resultKey: entry.resultKey,
        before: entry,
        signals: ["missing-candidate"],
        extraRedactions: options.extraRedactions,
      }),
    ),
  ]);

  return {
    schemaVersion: "1",
    inputs: report.inputs,
    totals: countRows(rows),
    rows,
  };
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function formatOptionalValue(value?: string | number): string {
  return value === undefined ? "-" : String(value);
}

export function formatMultiReviewContradictionCoverageMatrix(
  matrix: MultiReviewContradictionCoverageMatrix,
): string {
  const lines = [
    "# Multi-Review Contradiction and Coverage Matrix",
    "",
    "This matrix is generated from sanitized AIQL batch-summary comparison data. It highlights overlap, contradiction signals, and uncovered checks without making caller-owned routing or approval decisions.",
    "",
    "## Inputs",
    "",
    `- Baseline: ${matrix.inputs.before.pathLabel}`,
    `- Candidate: ${matrix.inputs.after.pathLabel}`,
    "",
    "## Totals",
    "",
    `- Rows: ${matrix.totals.rows}; both-covered=${matrix.totals.bothCovered}; baseline-only=${matrix.totals.baselineOnly}; candidate-only=${matrix.totals.candidateOnly}; not-covered=${matrix.totals.notCovered}.`,
    `- Rows with contradiction signals: ${matrix.totals.rowsWithContradictions}; uncovered checks: ${matrix.totals.uncoveredChecks}.`,
    "",
    "## Matrix",
    "",
    "| Check | Label | Baseline | Candidate | Overlap | Signals | Severity | Findings Delta |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.rows.map((row) =>
      [
        escapeTableCell(row.resultKey),
        escapeTableCell(row.label),
        row.baselineCoverage,
        row.candidateCoverage,
        row.overlap,
        row.contradictionSignals.join(", "),
        `${formatOptionalValue(row.baselineSeverity)} -> ${formatOptionalValue(row.candidateSeverity)}`,
        formatOptionalValue(row.findingsDelta),
      ].join(" | "),
    ).map((row) => `| ${row} |`),
    "",
    "## Notes",
    "",
    ...matrix.rows.map((row) => `- \`${row.resultKey}\`: ${row.note}`),
    "",
    "## Boundary",
    "",
    "The matrix is a generic artifact over comparable review summaries. Domain-specific escalation policy, reviewer weighting, and project acceptance thresholds remain caller-owned.",
  ];

  return lines.join("\n");
}
