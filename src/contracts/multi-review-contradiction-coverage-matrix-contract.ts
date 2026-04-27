import type {
  JsonContractValidationResult,
  StructuredReviewSeverity,
} from "./json-contracts.js";
import {
  isRecord,
  readRequiredInteger,
  readRequiredSignedInteger,
  readRequiredString,
} from "./batch-review-summary-comparison-parser.js";

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
  inputs: {
    before: { pathLabel: string };
    after: { pathLabel: string };
  };
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

function validateContract<T>(
  parser: (value: unknown) => T,
  value: unknown,
): JsonContractValidationResult<T> {
  try {
    return {
      ok: true,
      value: parser(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

function readCoverageState(
  value: unknown,
  fieldName: string,
): MultiReviewCoverageState {
  switch (value) {
    case "covered":
    case "uncovered":
    case "failed":
    case "unavailable":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be one of covered, uncovered, failed, or unavailable.`,
      );
  }
}

function readOverlap(
  value: unknown,
  fieldName: string,
): MultiReviewContradictionCoverageMatrixRow["overlap"] {
  switch (value) {
    case "both-covered":
    case "baseline-only":
    case "candidate-only":
    case "not-covered":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be a matrix overlap value.`,
      );
  }
}

function readContradictionSignal(
  value: unknown,
  fieldName: string,
): MultiReviewContradictionSignal {
  switch (value) {
    case "none":
    case "missing-baseline":
    case "missing-candidate":
    case "status-changed":
    case "severity-improved":
    case "severity-regressed":
    case "severity-unavailable":
    case "finding-count-changed":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be a matrix contradiction signal.`,
      );
  }
}

function readOptionalSeverity(
  value: unknown,
  fieldName: string,
): StructuredReviewSeverity | undefined {
  if (value === undefined) {
    return undefined;
  }

  switch (value) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "unknown":
      return "unknown";
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be one of critical, high, medium, low, or unknown.`,
      );
  }
}

function readSignals(
  value: unknown,
  fieldName: string,
): MultiReviewContradictionSignal[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-empty array.`);
  }

  return value.map((signal, index) =>
    readContradictionSignal(signal, `${fieldName}[${index}]`),
  );
}

function parseMatrixRow(
  value: unknown,
  index: number,
): MultiReviewContradictionCoverageMatrixRow {
  const fieldPath = `rows[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    resultKey: readRequiredString(value.resultKey, `${fieldPath}.resultKey`),
    label: readRequiredString(value.label, `${fieldPath}.label`),
    baselineCoverage: readCoverageState(
      value.baselineCoverage,
      `${fieldPath}.baselineCoverage`,
    ),
    candidateCoverage: readCoverageState(
      value.candidateCoverage,
      `${fieldPath}.candidateCoverage`,
    ),
    overlap: readOverlap(value.overlap, `${fieldPath}.overlap`),
    contradictionSignals: readSignals(
      value.contradictionSignals,
      `${fieldPath}.contradictionSignals`,
    ),
    baselineSeverity: readOptionalSeverity(
      value.baselineSeverity,
      `${fieldPath}.baselineSeverity`,
    ),
    candidateSeverity: readOptionalSeverity(
      value.candidateSeverity,
      `${fieldPath}.candidateSeverity`,
    ),
    findingsDelta:
      value.findingsDelta === undefined
        ? undefined
        : readRequiredSignedInteger(
            value.findingsDelta,
            `${fieldPath}.findingsDelta`,
          ),
    note: readRequiredString(value.note, `${fieldPath}.note`),
  };
}

export function parseMultiReviewContradictionCoverageMatrix(
  value: unknown,
): MultiReviewContradictionCoverageMatrix {
  if (!isRecord(value)) {
    throw new Error("Multi-review contradiction coverage matrix must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Manifest field "schemaVersion" must equal "1".');
  }

  if (!isRecord(value.inputs) || !isRecord(value.inputs.before) || !isRecord(value.inputs.after)) {
    throw new Error('Multi-review contradiction coverage matrix requires "inputs.before" and "inputs.after".');
  }

  if (!isRecord(value.totals)) {
    throw new Error('Multi-review contradiction coverage matrix requires "totals".');
  }

  if (!Array.isArray(value.rows)) {
    throw new Error('Multi-review contradiction coverage matrix requires "rows".');
  }

  return {
    schemaVersion: "1",
    inputs: {
      before: {
        pathLabel: readRequiredString(
          value.inputs.before.pathLabel,
          "inputs.before.pathLabel",
        ),
      },
      after: {
        pathLabel: readRequiredString(
          value.inputs.after.pathLabel,
          "inputs.after.pathLabel",
        ),
      },
    },
    totals: {
      rows: readRequiredInteger(value.totals.rows, "totals.rows"),
      bothCovered: readRequiredInteger(
        value.totals.bothCovered,
        "totals.bothCovered",
      ),
      baselineOnly: readRequiredInteger(
        value.totals.baselineOnly,
        "totals.baselineOnly",
      ),
      candidateOnly: readRequiredInteger(
        value.totals.candidateOnly,
        "totals.candidateOnly",
      ),
      notCovered: readRequiredInteger(value.totals.notCovered, "totals.notCovered"),
      rowsWithContradictions: readRequiredInteger(
        value.totals.rowsWithContradictions,
        "totals.rowsWithContradictions",
      ),
      uncoveredChecks: readRequiredInteger(
        value.totals.uncoveredChecks,
        "totals.uncoveredChecks",
      ),
    },
    rows: value.rows.map((row, index) => parseMatrixRow(row, index)),
  };
}

export function validateMultiReviewContradictionCoverageMatrix(
  value: unknown,
): JsonContractValidationResult<MultiReviewContradictionCoverageMatrix> {
  return validateContract(parseMultiReviewContradictionCoverageMatrix, value);
}
