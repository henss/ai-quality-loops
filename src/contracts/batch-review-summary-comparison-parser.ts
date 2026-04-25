import type {
  BatchReviewMode,
  BatchReviewStructuredDecisionSummary,
  BatchReviewStructuredResultSummary,
  StructuredReviewSeverity,
} from "./json-contracts.js";
import type { StructuredReviewDecisionConfidence } from "./structured-review-decision-contract.js";
import type {
  BatchReviewReviewerConfidenceCalibrationDelta,
  BatchReviewReviewerConfidenceCalibrationSnapshot,
  BatchReviewReviewerConfidenceCounts,
  BatchReviewSummaryEntryComparison,
  BatchReviewSummaryEntrySnapshot,
  BatchReviewSummarySeverityDirection,
} from "./batch-review-summary-comparison-contract.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredString(value, fieldName);
}

export function readRequiredInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `Manifest field "${fieldName}" must be a non-negative integer.`,
    );
  }

  return value;
}

export function readRequiredSignedInteger(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an integer.`);
  }

  return value;
}

function readRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Manifest field "${fieldName}" must be a boolean.`);
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

function readReviewStatus(
  value: unknown,
  fieldName: string,
): "success" | "failure" {
  if (value !== "success" && value !== "failure") {
    throw new Error(
      `Manifest field "${fieldName}" must be "success" or "failure".`,
    );
  }

  return value;
}

function readStructuredReviewSeverity(
  value: unknown,
  fieldName: string,
): StructuredReviewSeverity {
  switch (value) {
    case "critical":
    case "high":
    case "medium":
    case "low":
    case "unknown":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be one of critical, high, medium, low, or unknown.`,
      );
  }
}

function readOptionalStructuredReviewSeverity(
  value: unknown,
  fieldName: string,
): StructuredReviewSeverity | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readStructuredReviewSeverity(value, fieldName);
}

function readSeverityDirection(
  value: unknown,
  fieldName: string,
): BatchReviewSummarySeverityDirection {
  switch (value) {
    case "improved":
    case "regressed":
    case "unchanged":
    case "unavailable":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be one of improved, regressed, unchanged, or unavailable.`,
      );
  }
}

function readDecisionConfidence(
  value: unknown,
  fieldName: string,
): StructuredReviewDecisionConfidence {
  switch (value) {
    case "low":
    case "medium":
    case "high":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be one of low, medium, or high.`,
      );
  }
}

function readDecisionVerdict(
  value: unknown,
  fieldName: string,
): BatchReviewStructuredDecisionSummary["verdict"] {
  switch (value) {
    case "accept":
    case "accept_with_follow_up":
    case "changes_requested":
    case "blocked":
    case "process_failed":
      return value;
    default:
      throw new Error(
        `Manifest field "${fieldName}" must be a structured review decision verdict.`,
      );
  }
}

function createEmptySeverityCounts(): Record<StructuredReviewSeverity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
}

function parseStructuredResultSummary(
  value: unknown,
  fieldName: string,
): BatchReviewStructuredResultSummary {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  const rawFindingCounts = value.findingCounts;
  if (!isRecord(rawFindingCounts)) {
    throw new Error(`Manifest field "${fieldName}.findingCounts" must be an object.`);
  }

  const findingCounts = createEmptySeverityCounts();
  for (const severity of Object.keys(findingCounts) as StructuredReviewSeverity[]) {
    findingCounts[severity] = readRequiredInteger(
      rawFindingCounts[severity],
      `${fieldName}.findingCounts.${severity}`,
    );
  }

  const decision =
    value.decision === undefined
      ? undefined
      : parseStructuredDecisionSummary(value.decision, `${fieldName}.decision`);

  return {
    overallSeverity: readStructuredReviewSeverity(
      value.overallSeverity,
      `${fieldName}.overallSeverity`,
    ),
    totalFindings: readRequiredInteger(
      value.totalFindings,
      `${fieldName}.totalFindings`,
    ),
    findingCounts,
    ...(decision ? { decision } : {}),
  };
}

function parseStructuredDecisionSummary(
  value: unknown,
  fieldName: string,
): BatchReviewStructuredDecisionSummary {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    verdict: readDecisionVerdict(value.verdict, `${fieldName}.verdict`),
    confidence: readDecisionConfidence(
      value.confidence,
      `${fieldName}.confidence`,
    ),
    acceptedFindings: readRequiredInteger(
      value.acceptedFindings,
      `${fieldName}.acceptedFindings`,
    ),
    rejectedFindings: readRequiredInteger(
      value.rejectedFindings,
      `${fieldName}.rejectedFindings`,
    ),
  };
}

export function parseSignedSeverityCounts(
  value: unknown,
  fieldName: string,
): Record<StructuredReviewSeverity, number> {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  const counts = createEmptySeverityCounts();
  for (const severity of Object.keys(counts) as StructuredReviewSeverity[]) {
    counts[severity] = readRequiredSignedInteger(
      value[severity],
      `${fieldName}.${severity}`,
    );
  }

  return counts;
}

export function parseSeverityMovementCounts(
  value: unknown,
  fieldName: string,
): Record<BatchReviewSummarySeverityDirection, number> {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    improved: readRequiredInteger(value.improved, `${fieldName}.improved`),
    regressed: readRequiredInteger(value.regressed, `${fieldName}.regressed`),
    unchanged: readRequiredInteger(value.unchanged, `${fieldName}.unchanged`),
    unavailable: readRequiredInteger(
      value.unavailable,
      `${fieldName}.unavailable`,
    ),
  };
}

function parseConfidenceCounts(
  value: unknown,
  fieldName: string,
): BatchReviewReviewerConfidenceCounts {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    low: readRequiredInteger(value.low, `${fieldName}.low`),
    medium: readRequiredInteger(value.medium, `${fieldName}.medium`),
    high: readRequiredInteger(value.high, `${fieldName}.high`),
  };
}

function parseSignedConfidenceCounts(
  value: unknown,
  fieldName: string,
): Record<StructuredReviewDecisionConfidence, number> {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    low: readRequiredSignedInteger(value.low, `${fieldName}.low`),
    medium: readRequiredSignedInteger(value.medium, `${fieldName}.medium`),
    high: readRequiredSignedInteger(value.high, `${fieldName}.high`),
  };
}

export function parseCalibrationSnapshot(
  value: unknown,
  fieldName: string,
): BatchReviewReviewerConfidenceCalibrationSnapshot {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    decisionsWithConfidence: readRequiredInteger(
      value.decisionsWithConfidence,
      `${fieldName}.decisionsWithConfidence`,
    ),
    acceptedDecisions: readRequiredInteger(
      value.acceptedDecisions,
      `${fieldName}.acceptedDecisions`,
    ),
    rejectedDecisions: readRequiredInteger(
      value.rejectedDecisions,
      `${fieldName}.rejectedDecisions`,
    ),
    acceptedFindings: readRequiredInteger(
      value.acceptedFindings,
      `${fieldName}.acceptedFindings`,
    ),
    rejectedFindings: readRequiredInteger(
      value.rejectedFindings,
      `${fieldName}.rejectedFindings`,
    ),
    acceptedConfidence: parseConfidenceCounts(
      value.acceptedConfidence,
      `${fieldName}.acceptedConfidence`,
    ),
    rejectedConfidence: parseConfidenceCounts(
      value.rejectedConfidence,
      `${fieldName}.rejectedConfidence`,
    ),
  };
}

export function parseCalibrationDelta(
  value: unknown,
  fieldName: string,
): BatchReviewReviewerConfidenceCalibrationDelta {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    decisionsWithConfidence: readRequiredSignedInteger(
      value.decisionsWithConfidence,
      `${fieldName}.decisionsWithConfidence`,
    ),
    acceptedDecisions: readRequiredSignedInteger(
      value.acceptedDecisions,
      `${fieldName}.acceptedDecisions`,
    ),
    rejectedDecisions: readRequiredSignedInteger(
      value.rejectedDecisions,
      `${fieldName}.rejectedDecisions`,
    ),
    acceptedFindings: readRequiredSignedInteger(
      value.acceptedFindings,
      `${fieldName}.acceptedFindings`,
    ),
    rejectedFindings: readRequiredSignedInteger(
      value.rejectedFindings,
      `${fieldName}.rejectedFindings`,
    ),
    acceptedConfidence: parseSignedConfidenceCounts(
      value.acceptedConfidence,
      `${fieldName}.acceptedConfidence`,
    ),
    rejectedConfidence: parseSignedConfidenceCounts(
      value.rejectedConfidence,
      `${fieldName}.rejectedConfidence`,
    ),
  };
}

export function parseSnapshot(
  value: unknown,
  fieldPath: string,
): BatchReviewSummaryEntrySnapshot {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    resultKey: readRequiredString(value.resultKey, `${fieldPath}.resultKey`),
    index: readRequiredInteger(value.index, `${fieldPath}.index`),
    name: readOptionalString(value.name, `${fieldPath}.name`),
    mode: readRequiredMode(value.mode, `${fieldPath}.mode`),
    targetSummary: readRequiredString(
      value.targetSummary,
      `${fieldPath}.targetSummary`,
    ),
    status: readReviewStatus(value.status, `${fieldPath}.status`),
    structuredResult:
      value.structuredResult === undefined
        ? undefined
        : parseStructuredResultSummary(
            value.structuredResult,
            `${fieldPath}.structuredResult`,
          ),
  };
}

export function parseEntryComparison(
  value: unknown,
  index: number,
  fieldName: "changed" | "unchanged",
): BatchReviewSummaryEntryComparison {
  const fieldPath = `${fieldName}[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  if (!isRecord(value.statusChange)) {
    throw new Error(`Manifest field "${fieldPath}.statusChange" must be an object.`);
  }

  if (!isRecord(value.severityChange)) {
    throw new Error(`Manifest field "${fieldPath}.severityChange" must be an object.`);
  }

  return {
    resultKey: readRequiredString(value.resultKey, `${fieldPath}.resultKey`),
    before: parseSnapshot(value.before, `${fieldPath}.before`),
    after: parseSnapshot(value.after, `${fieldPath}.after`),
    statusChange: {
      before: readReviewStatus(
        value.statusChange.before,
        `${fieldPath}.statusChange.before`,
      ),
      after: readReviewStatus(
        value.statusChange.after,
        `${fieldPath}.statusChange.after`,
      ),
      changed: readRequiredBoolean(
        value.statusChange.changed,
        `${fieldPath}.statusChange.changed`,
      ),
    },
    severityChange: {
      before: readOptionalStructuredReviewSeverity(
        value.severityChange.before,
        `${fieldPath}.severityChange.before`,
      ),
      after: readOptionalStructuredReviewSeverity(
        value.severityChange.after,
        `${fieldPath}.severityChange.after`,
      ),
      direction: readSeverityDirection(
        value.severityChange.direction,
        `${fieldPath}.severityChange.direction`,
      ),
    },
    totalFindingsDelta:
      value.totalFindingsDelta === undefined
        ? undefined
        : readRequiredSignedInteger(
            value.totalFindingsDelta,
            `${fieldPath}.totalFindingsDelta`,
          ),
    findingCountDelta:
      value.findingCountDelta === undefined
        ? undefined
        : parseSignedSeverityCounts(
            value.findingCountDelta,
            `${fieldPath}.findingCountDelta`,
          ),
  };
}
