import type {
  BatchReviewArtifactResult,
  BatchReviewArtifactSummary,
} from "./batch-review-summary-contract.js";
import { parseBatchReviewArtifactSummary } from "./batch-review-summary-contract.js";
import {
  parseBatchReviewSummaryComparisonReport,
  type BatchReviewSummaryComparison,
} from "./batch-review-summary-comparison-contract.js";
import type { JsonContractValidationResult } from "./json-contracts.js";

export interface BatchReviewRunLedgerFixtureEntry {
  index: number;
  name?: string;
  resultKey: string;
  mode: BatchReviewArtifactResult["mode"];
  targetSummary: string;
}

export interface BatchReviewRunLedger {
  schemaVersion: "1";
  commandFamily: "batch-review";
  fixture: {
    label?: string;
    fingerprint: string;
    totalEntries: number;
    entries: BatchReviewRunLedgerFixtureEntry[];
  };
  run: {
    label?: string;
    summary: BatchReviewArtifactSummary;
  };
}

export interface BatchReviewRunLedgerDiffReport {
  schemaVersion: "1";
  commandFamily: "batch-review";
  fixture: {
    label?: string;
    fingerprint: string;
    totalEntries: number;
  };
  inputs: {
    before: {
      pathLabel: string;
      runLabel?: string;
      fixtureLabel?: string;
    };
    after: {
      pathLabel: string;
      runLabel?: string;
      fixtureLabel?: string;
    };
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

function readRequiredMode(
  value: unknown,
  fieldName: string,
): BatchReviewArtifactResult["mode"] {
  if (value !== "expert" && value !== "vision") {
    throw new Error(
      `Manifest field "${fieldName}" must be "expert" or "vision".`,
    );
  }

  return value;
}

function parseFixtureEntry(
  value: unknown,
  fieldPath: string,
): BatchReviewRunLedgerFixtureEntry {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    index: readRequiredInteger(value.index, `${fieldPath}.index`),
    name: readOptionalString(value.name, `${fieldPath}.name`),
    resultKey: readRequiredString(value.resultKey, `${fieldPath}.resultKey`),
    mode: readRequiredMode(value.mode, `${fieldPath}.mode`),
    targetSummary: readRequiredString(
      value.targetSummary,
      `${fieldPath}.targetSummary`,
    ),
  };
}

function parseDiffInput(
  value: unknown,
  fieldPath: string,
): BatchReviewRunLedgerDiffReport["inputs"]["before"] {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    pathLabel: readRequiredString(value.pathLabel, `${fieldPath}.pathLabel`),
    runLabel: readOptionalString(value.runLabel, `${fieldPath}.runLabel`),
    fixtureLabel: readOptionalString(
      value.fixtureLabel,
      `${fieldPath}.fixtureLabel`,
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

export function parseBatchReviewRunLedger(value: unknown): BatchReviewRunLedger {
  if (!isRecord(value)) {
    throw new Error("Batch review run ledger must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Manifest field "schemaVersion" must equal "1".');
  }

  if (value.commandFamily !== "batch-review") {
    throw new Error('Manifest field "commandFamily" must equal "batch-review".');
  }

  if (!isRecord(value.fixture)) {
    throw new Error('Batch review run ledger requires a "fixture" object.');
  }

  if (!Array.isArray(value.fixture.entries)) {
    throw new Error('Batch review run ledger requires "fixture.entries".');
  }

  if (!isRecord(value.run)) {
    throw new Error('Batch review run ledger requires a "run" object.');
  }

  return {
    schemaVersion: "1",
    commandFamily: "batch-review",
    fixture: {
      label: readOptionalString(value.fixture.label, "fixture.label"),
      fingerprint: readRequiredString(
        value.fixture.fingerprint,
        "fixture.fingerprint",
      ),
      totalEntries: readRequiredInteger(
        value.fixture.totalEntries,
        "fixture.totalEntries",
      ),
      entries: value.fixture.entries.map((entry, index) =>
        parseFixtureEntry(entry, `fixture.entries[${index}]`),
      ),
    },
    run: {
      label: readOptionalString(value.run.label, "run.label"),
      summary: parseBatchReviewArtifactSummary(value.run.summary),
    },
  };
}

export function validateBatchReviewRunLedger(
  value: unknown,
): JsonContractValidationResult<BatchReviewRunLedger> {
  return validateContract(parseBatchReviewRunLedger, value);
}

export function parseBatchReviewRunLedgerDiffReport(
  value: unknown,
): BatchReviewRunLedgerDiffReport {
  if (!isRecord(value)) {
    throw new Error("Batch review run ledger diff report must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Manifest field "schemaVersion" must equal "1".');
  }

  if (value.commandFamily !== "batch-review") {
    throw new Error('Manifest field "commandFamily" must equal "batch-review".');
  }

  if (!isRecord(value.fixture)) {
    throw new Error('Batch review run ledger diff report requires "fixture".');
  }

  if (!isRecord(value.inputs)) {
    throw new Error('Batch review run ledger diff report requires "inputs".');
  }

  if (!isRecord(value.comparison)) {
    throw new Error(
      'Batch review run ledger diff report requires "comparison".',
    );
  }

  const comparisonReport = parseBatchReviewSummaryComparisonReport({
    inputs: {
      before: { pathLabel: "placeholder" },
      after: { pathLabel: "placeholder" },
    },
    comparison: value.comparison,
  });

  return {
    schemaVersion: "1",
    commandFamily: "batch-review",
    fixture: {
      label: readOptionalString(value.fixture.label, "fixture.label"),
      fingerprint: readRequiredString(
        value.fixture.fingerprint,
        "fixture.fingerprint",
      ),
      totalEntries: readRequiredInteger(
        value.fixture.totalEntries,
        "fixture.totalEntries",
      ),
    },
    inputs: {
      before: parseDiffInput(value.inputs.before, "inputs.before"),
      after: parseDiffInput(value.inputs.after, "inputs.after"),
    },
    comparison: comparisonReport.comparison,
  };
}

export function validateBatchReviewRunLedgerDiffReport(
  value: unknown,
): JsonContractValidationResult<BatchReviewRunLedgerDiffReport> {
  return validateContract(parseBatchReviewRunLedgerDiffReport, value);
}
