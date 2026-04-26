import type {
  StructuredReviewDecisionConfidence,
  StructuredReviewDecisionVerdict,
} from "./structured-review-decision-contract.js";
import type { StructuredReviewSeverity } from "./json-contracts.js";

export interface BatchReviewOllamaTelemetry {
  totalDurationMs?: number;
  loadDurationMs?: number;
  promptEvalCount?: number;
  promptEvalDurationMs?: number;
  evalCount?: number;
  evalDurationMs?: number;
}

export interface BatchReviewStructuredResultSummary {
  overallSeverity: StructuredReviewSeverity;
  totalFindings: number;
  findingCounts: Record<StructuredReviewSeverity, number>;
  decision?: BatchReviewStructuredDecisionSummary;
}

export interface BatchReviewStructuredDecisionSummary {
  verdict: StructuredReviewDecisionVerdict;
  confidence: StructuredReviewDecisionConfidence;
  acceptedFindings: number;
  rejectedFindings: number;
}

export interface BatchReviewArtifactResult {
  index: number;
  name?: string;
  resultKey: string;
  mode: "expert" | "vision";
  targetSummary: string;
  outputPath?: string;
  structuredOutputPath?: string;
  structuredResult?: BatchReviewStructuredResultSummary;
  status: "success" | "failure";
  errorSummary?: string;
  durationMs?: number;
  outputChars?: number;
  decisionParsed?: boolean;
  ollamaTelemetry?: BatchReviewOllamaTelemetry;
}

export interface BatchReviewArtifactSummary {
  manifestPath?: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchReviewArtifactResult[];
}

export interface BatchReviewSummaryValidationSuccess {
  ok: true;
  value: BatchReviewArtifactSummary;
}

export interface BatchReviewSummaryValidationFailure {
  ok: false;
  error: Error;
}

export type BatchReviewSummaryValidationResult =
  | BatchReviewSummaryValidationSuccess
  | BatchReviewSummaryValidationFailure;

const SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredString(value, fieldName);
}

function readOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Manifest field "${fieldName}" must be a finite number.`);
  }

  return value;
}

function readRequiredInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-negative integer.`);
  }

  return value;
}

function readOptionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readRequiredInteger(value, fieldName);
}

function readOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Manifest field "${fieldName}" must be a boolean.`);
  }

  return value;
}

function readDecisionVerdict(
  value: unknown,
  fieldName: string,
): StructuredReviewDecisionVerdict {
  switch (value) {
    case "accept":
    case "accept_with_follow_up":
    case "abstain_request_evidence":
    case "changes_requested":
    case "blocked":
    case "process_failed":
      return value;
    default:
      throw new Error(`Manifest field "${fieldName}" must be a decision verdict.`);
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
      throw new Error(`Manifest field "${fieldName}" must be a decision confidence.`);
  }
}

function readRequiredMode(value: unknown, fieldName: string): "expert" | "vision" {
  if (value === "expert" || value === "vision") {
    return value;
  }

  throw new Error(`Manifest field "${fieldName}" must be "expert" or "vision".`);
}

function createBatchReviewResultKey(input: {
  index: number;
  name?: string;
  mode: "expert" | "vision";
}): string {
  const label = input.name?.trim() || `review-${input.index + 1}`;
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${input.mode}`;
}

function parseBatchReviewStructuredResultSummary(
  value: unknown,
  fieldName: string,
): BatchReviewStructuredResultSummary {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  if (!isRecord(value.findingCounts)) {
    throw new Error(`Manifest field "${fieldName}.findingCounts" must be an object.`);
  }

  const findingCounts = {} as Record<StructuredReviewSeverity, number>;
  for (const severity of SEVERITIES) {
    findingCounts[severity] = readRequiredInteger(
      value.findingCounts[severity],
      `${fieldName}.findingCounts.${severity}`,
    );
  }

  const decision =
    value.decision === undefined
      ? undefined
      : parseBatchReviewStructuredDecisionSummary(
          value.decision,
          `${fieldName}.decision`,
        );

  return {
    overallSeverity: readSeverity(value.overallSeverity, `${fieldName}.overallSeverity`),
    totalFindings: readRequiredInteger(value.totalFindings, `${fieldName}.totalFindings`),
    findingCounts,
    ...(decision ? { decision } : {}),
  };
}

function parseBatchReviewStructuredDecisionSummary(
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

function readSeverity(value: unknown, fieldName: string): StructuredReviewSeverity {
  if (SEVERITIES.includes(value as StructuredReviewSeverity)) {
    return value as StructuredReviewSeverity;
  }

  throw new Error(`Manifest field "${fieldName}" must be a review severity.`);
}

function parseBatchReviewOllamaTelemetry(
  value: unknown,
  fieldName: string,
): BatchReviewOllamaTelemetry {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    totalDurationMs: readOptionalNumber(value.totalDurationMs, `${fieldName}.totalDurationMs`),
    loadDurationMs: readOptionalNumber(value.loadDurationMs, `${fieldName}.loadDurationMs`),
    promptEvalCount: readOptionalNumber(value.promptEvalCount, `${fieldName}.promptEvalCount`),
    promptEvalDurationMs: readOptionalNumber(
      value.promptEvalDurationMs,
      `${fieldName}.promptEvalDurationMs`,
    ),
    evalCount: readOptionalNumber(value.evalCount, `${fieldName}.evalCount`),
    evalDurationMs: readOptionalNumber(value.evalDurationMs, `${fieldName}.evalDurationMs`),
  };
}

export function parseBatchReviewArtifactSummary(
  value: unknown,
): BatchReviewArtifactSummary {
  if (!isRecord(value)) {
    throw new Error("Batch review summary artifact must be a JSON object.");
  }

  if (!Array.isArray(value.results)) {
    throw new Error('Batch review summary artifact requires a "results" array.');
  }

  return {
    manifestPath: readOptionalString(value.manifestPath, "manifestPath"),
    total: readRequiredInteger(value.total, "total"),
    succeeded: readRequiredInteger(value.succeeded, "succeeded"),
    failed: readRequiredInteger(value.failed, "failed"),
    results: value.results.map((result, index) => {
      const fieldPath = `results[${index}]`;
      if (!isRecord(result)) {
        throw new Error(`Manifest field "${fieldPath}" must be an object.`);
      }

      const mode = readRequiredMode(result.mode, `${fieldPath}.mode`);
      const resultIndex = readRequiredInteger(result.index, `${fieldPath}.index`);
      const name = readOptionalString(result.name, `${fieldPath}.name`);
      return {
        index: resultIndex,
        name,
        resultKey:
          readOptionalString(result.resultKey, `${fieldPath}.resultKey`) ||
          createBatchReviewResultKey({ index: resultIndex, name, mode }),
        mode,
        targetSummary: readRequiredString(result.targetSummary, `${fieldPath}.targetSummary`),
        outputPath: readOptionalString(result.outputPath, `${fieldPath}.outputPath`),
        structuredOutputPath: readOptionalString(
          result.structuredOutputPath,
          `${fieldPath}.structuredOutputPath`,
        ),
        structuredResult:
          result.structuredResult === undefined
            ? undefined
            : parseBatchReviewStructuredResultSummary(
                result.structuredResult,
                `${fieldPath}.structuredResult`,
              ),
        status:
          result.status === "success" || result.status === "failure"
            ? result.status
            : (() => {
                throw new Error(
                  `Manifest field "${fieldPath}.status" must be "success" or "failure".`,
                );
              })(),
        errorSummary: readOptionalString(result.errorSummary, `${fieldPath}.errorSummary`),
        durationMs: readOptionalInteger(result.durationMs, `${fieldPath}.durationMs`),
        outputChars: readOptionalInteger(result.outputChars, `${fieldPath}.outputChars`),
        decisionParsed: readOptionalBoolean(result.decisionParsed, `${fieldPath}.decisionParsed`),
        ollamaTelemetry:
          result.ollamaTelemetry === undefined
            ? undefined
            : parseBatchReviewOllamaTelemetry(
                result.ollamaTelemetry,
                `${fieldPath}.ollamaTelemetry`,
              ),
      };
    }),
  };
}

export function validateBatchReviewArtifactSummary(
  value: unknown,
): BatchReviewSummaryValidationResult {
  try {
    return { ok: true, value: parseBatchReviewArtifactSummary(value) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
