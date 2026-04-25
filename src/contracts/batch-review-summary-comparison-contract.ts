import type {
  BatchReviewMode,
  JsonContractValidationResult,
  BatchReviewStructuredResultSummary,
  StructuredReviewSeverity,
} from "./json-contracts.js";
import type { StructuredReviewDecisionConfidence } from "./structured-review-decision-contract.js";
import {
  isRecord,
  parseCalibrationDelta,
  parseCalibrationSnapshot,
  parseEntryComparison,
  parseSeverityMovementCounts,
  parseSignedSeverityCounts,
  parseSnapshot,
  readRequiredInteger,
  readRequiredSignedInteger,
  readRequiredString,
} from "./batch-review-summary-comparison-parser.js";

export type BatchReviewSummarySeverityDirection =
  | "improved"
  | "regressed"
  | "unchanged"
  | "unavailable";

export interface BatchReviewSummaryEntrySnapshot {
  resultKey: string;
  index: number;
  name?: string;
  mode: BatchReviewMode;
  targetSummary: string;
  status: "success" | "failure";
  structuredResult?: BatchReviewStructuredResultSummary;
}

export interface BatchReviewSummaryEntryComparison {
  resultKey: string;
  before: BatchReviewSummaryEntrySnapshot;
  after: BatchReviewSummaryEntrySnapshot;
  statusChange: {
    before: "success" | "failure";
    after: "success" | "failure";
    changed: boolean;
  };
  severityChange: {
    before?: StructuredReviewSeverity;
    after?: StructuredReviewSeverity;
    direction: BatchReviewSummarySeverityDirection;
  };
  totalFindingsDelta?: number;
  findingCountDelta?: Record<StructuredReviewSeverity, number>;
}

export interface BatchReviewReviewerConfidenceCounts {
  low: number;
  medium: number;
  high: number;
}

export interface BatchReviewReviewerConfidenceCalibrationSnapshot {
  decisionsWithConfidence: number;
  acceptedDecisions: number;
  rejectedDecisions: number;
  acceptedFindings: number;
  rejectedFindings: number;
  acceptedConfidence: BatchReviewReviewerConfidenceCounts;
  rejectedConfidence: BatchReviewReviewerConfidenceCounts;
}

export interface BatchReviewReviewerConfidenceCalibrationDelta {
  decisionsWithConfidence: number;
  acceptedDecisions: number;
  rejectedDecisions: number;
  acceptedFindings: number;
  rejectedFindings: number;
  acceptedConfidence: Record<StructuredReviewDecisionConfidence, number>;
  rejectedConfidence: Record<StructuredReviewDecisionConfidence, number>;
}

export interface BatchReviewSummaryComparison {
  counts: {
    beforeEntries: number;
    afterEntries: number;
    added: number;
    removed: number;
    matched: number;
    statusChanged: number;
    severityMovement: Record<BatchReviewSummarySeverityDirection, number>;
    totalFindingsDelta: number;
    findingCountDelta: Record<StructuredReviewSeverity, number>;
    promptEvalCountDelta?: number;
    addedPromptEvalCount?: number;
    promptEvalCountUnavailable?: number;
  };
  calibration: {
    before: BatchReviewReviewerConfidenceCalibrationSnapshot;
    after: BatchReviewReviewerConfidenceCalibrationSnapshot;
    delta: BatchReviewReviewerConfidenceCalibrationDelta;
  };
  added: BatchReviewSummaryEntrySnapshot[];
  removed: BatchReviewSummaryEntrySnapshot[];
  changed: BatchReviewSummaryEntryComparison[];
  unchanged: BatchReviewSummaryEntryComparison[];
}

export interface BatchReviewSummaryComparisonReport {
  inputs: {
    before: { pathLabel: string };
    after: { pathLabel: string };
  };
  comparison: BatchReviewSummaryComparison;
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

export function parseBatchReviewSummaryComparisonReport(
  value: unknown,
): BatchReviewSummaryComparisonReport {
  if (!isRecord(value)) {
    throw new Error("Batch review summary comparison report must be a JSON object.");
  }

  if (!isRecord(value.inputs)) {
    throw new Error('Batch review summary comparison report requires "inputs".');
  }

  if (!isRecord(value.inputs.before)) {
    throw new Error(
      'Batch review summary comparison report requires "inputs.before".',
    );
  }

  if (!isRecord(value.inputs.after)) {
    throw new Error(
      'Batch review summary comparison report requires "inputs.after".',
    );
  }

  if (!isRecord(value.comparison)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison".',
    );
  }

  if (!isRecord(value.comparison.counts)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.counts".',
    );
  }

  if (!Array.isArray(value.comparison.added)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.added".',
    );
  }

  if (!Array.isArray(value.comparison.removed)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.removed".',
    );
  }

  if (!Array.isArray(value.comparison.changed)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.changed".',
    );
  }

  if (!Array.isArray(value.comparison.unchanged)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.unchanged".',
    );
  }

  if (!isRecord(value.comparison.calibration)) {
    throw new Error(
      'Batch review summary comparison report requires "comparison.calibration".',
    );
  }

  return {
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
    comparison: {
      counts: {
        beforeEntries: readRequiredInteger(
          value.comparison.counts.beforeEntries,
          "comparison.counts.beforeEntries",
        ),
        afterEntries: readRequiredInteger(
          value.comparison.counts.afterEntries,
          "comparison.counts.afterEntries",
        ),
        added: readRequiredInteger(
          value.comparison.counts.added,
          "comparison.counts.added",
        ),
        removed: readRequiredInteger(
          value.comparison.counts.removed,
          "comparison.counts.removed",
        ),
        matched: readRequiredInteger(
          value.comparison.counts.matched,
          "comparison.counts.matched",
        ),
        statusChanged: readRequiredInteger(
          value.comparison.counts.statusChanged,
          "comparison.counts.statusChanged",
        ),
        severityMovement: parseSeverityMovementCounts(
          value.comparison.counts.severityMovement,
          "comparison.counts.severityMovement",
        ),
        totalFindingsDelta: readRequiredSignedInteger(
          value.comparison.counts.totalFindingsDelta,
          "comparison.counts.totalFindingsDelta",
        ),
        findingCountDelta: parseSignedSeverityCounts(
          value.comparison.counts.findingCountDelta,
          "comparison.counts.findingCountDelta",
        ),
        promptEvalCountDelta:
          value.comparison.counts.promptEvalCountDelta === undefined
            ? undefined
            : readRequiredSignedInteger(
                value.comparison.counts.promptEvalCountDelta,
                "comparison.counts.promptEvalCountDelta",
              ),
        addedPromptEvalCount:
          value.comparison.counts.addedPromptEvalCount === undefined
            ? undefined
            : readRequiredInteger(
                value.comparison.counts.addedPromptEvalCount,
                "comparison.counts.addedPromptEvalCount",
              ),
        promptEvalCountUnavailable:
          value.comparison.counts.promptEvalCountUnavailable === undefined
            ? undefined
            : readRequiredInteger(
                value.comparison.counts.promptEvalCountUnavailable,
                "comparison.counts.promptEvalCountUnavailable",
              ),
      },
      calibration: {
        before: parseCalibrationSnapshot(
          value.comparison.calibration.before,
          "comparison.calibration.before",
        ),
        after: parseCalibrationSnapshot(
          value.comparison.calibration.after,
          "comparison.calibration.after",
        ),
        delta: parseCalibrationDelta(
          value.comparison.calibration.delta,
          "comparison.calibration.delta",
        ),
      },
      added: value.comparison.added.map((entry, index) =>
        parseSnapshot(entry, `comparison.added[${index}]`),
      ),
      removed: value.comparison.removed.map((entry, index) =>
        parseSnapshot(entry, `comparison.removed[${index}]`),
      ),
      changed: value.comparison.changed.map((entry, index) =>
        parseEntryComparison(entry, index, "changed"),
      ),
      unchanged: value.comparison.unchanged.map((entry, index) =>
        parseEntryComparison(entry, index, "unchanged"),
      ),
    },
  };
}

export function validateBatchReviewSummaryComparisonReport(
  value: unknown,
): JsonContractValidationResult<BatchReviewSummaryComparisonReport> {
  return validateContract(parseBatchReviewSummaryComparisonReport, value);
}
