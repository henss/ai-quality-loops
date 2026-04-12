import type {
  BatchReviewMode,
  BatchReviewStructuredResultSummary,
  JsonContractValidationResult,
  StructuredReviewSeverity,
} from "./json-contracts.js";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
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

function readRequiredInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `Manifest field "${fieldName}" must be a non-negative integer.`,
    );
  }

  return value;
}

function readRequiredSignedInteger(value: unknown, fieldName: string): number {
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
  };
}

function parseSignedSeverityCounts(
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

function parseSeverityMovementCounts(
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

function parseSnapshot(
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

function parseEntryComparison(
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
