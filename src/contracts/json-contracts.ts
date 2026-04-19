import {
  parseStructuredReviewDecision,
  type StructuredReviewDecision,
} from "./structured-review-decision-contract.js";

export {
  parseBatchReviewArtifactSummary,
  validateBatchReviewArtifactSummary,
} from "./batch-review-summary-contract.js";
export type {
  BatchReviewArtifactResult,
  BatchReviewArtifactSummary,
  BatchReviewOllamaTelemetry,
  BatchReviewStructuredResultSummary,
} from "./batch-review-summary-contract.js";

export type BatchReviewMode = "expert" | "vision";

export interface BatchReviewManifestDefaults {
  mode?: BatchReviewMode;
  expert?: string;
  model?: string;
  outputDir?: string;
  structuredOutputDir?: string;
  width?: number;
  height?: number;
  sections?: string[];
  css?: string;
  promptLibraryPath?: string;
  contextPath?: string;
  ollamaUrl?: string;
  ollamaKeepAlive?: string;
}

export interface BatchReviewManifestEntry extends BatchReviewManifestDefaults {
  name?: string;
  target: string;
  outputPath?: string;
  structuredOutputPath?: string;
}

export interface BatchReviewManifest {
  defaults?: BatchReviewManifestDefaults;
  reviews: BatchReviewManifestEntry[];
}

export type StructuredReviewSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "unknown";
export interface StructuredReviewProvenanceItem {
  label: string;
  value: string;
}

export interface StructuredReviewFinding {
  key?: string;
  title: string;
  summary: string;
  severity: StructuredReviewSeverity;
  recommendation?: string;
  evidence?: string[];
}

export interface StructuredReviewResult {
  schemaVersion: "1";
  workflow: "expert" | "vision";
  expert: string;
  model: string;
  summary: string;
  overallSeverity: StructuredReviewSeverity;
  findings: StructuredReviewFinding[];
  decision?: StructuredReviewDecision;
  provenance: StructuredReviewProvenanceItem[];
  markdown: string;
}

export interface JsonContractValidationSuccess<T> {
  ok: true;
  value: T;
}

export interface JsonContractValidationFailure {
  ok: false;
  error: Error;
}

export type JsonContractValidationResult<T> =
  | JsonContractValidationSuccess<T>
  | JsonContractValidationFailure;

export const JSON_CONTRACT_SCHEMA_FILES = Object.freeze({
  batchReviewManifest: "schemas/batch-review-manifest.schema.json",
  batchReviewSummaryComparison:
    "schemas/batch-review-summary-comparison.schema.json",
  batchReviewSummary: "schemas/batch-review-summary.schema.json",
  highStakesAnalysisReviewRubric:
    "schemas/high-stakes-analysis-review-rubric.schema.json",
  structuredReviewResult: "schemas/structured-review-result.schema.json",
});

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

function readOptionalNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Manifest field "${fieldName}" must be a finite number.`);
  }

  return value;
}

function readOptionalStringArray(
  value: unknown,
  fieldName: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Manifest field "${fieldName}" must be an array of strings.`);
  }

  return value;
}

function readMode(
  value: unknown,
  fieldName: string,
): BatchReviewMode | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== "expert" && value !== "vision") {
    throw new Error(
      `Manifest field "${fieldName}" must be "expert" or "vision".`,
    );
  }

  return value;
}

function readRequiredMode(value: unknown, fieldName: string): BatchReviewMode {
  const mode = readMode(value, fieldName);
  if (!mode) {
    throw new Error(`Manifest field "${fieldName}" is required.`);
  }
  return mode;
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
function createEmptySeverityCounts(): Record<StructuredReviewSeverity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
}

function toBatchReviewResultKeySlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "review"
  );
}

export function createBatchReviewResultKey(input: {
  index: number;
  name?: string;
  mode: BatchReviewMode;
}): string {
  const namedStem = input.name ? toBatchReviewResultKeySlug(input.name) : undefined;

  return namedStem
    ? `${namedStem}-${input.mode}`
    : `review-${input.index + 1}-${input.mode}`;
}

function parseManifestDefaults(
  rawDefaults: unknown,
  fieldPath: string,
): BatchReviewManifestDefaults {
  if (rawDefaults === undefined) {
    return {};
  }

  if (!isRecord(rawDefaults)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    mode: readMode(rawDefaults.mode, `${fieldPath}.mode`),
    expert: readOptionalString(rawDefaults.expert, `${fieldPath}.expert`),
    model: readOptionalString(rawDefaults.model, `${fieldPath}.model`),
    outputDir: readOptionalString(rawDefaults.outputDir, `${fieldPath}.outputDir`),
    structuredOutputDir: readOptionalString(
      rawDefaults.structuredOutputDir,
      `${fieldPath}.structuredOutputDir`,
    ),
    width: readOptionalNumber(rawDefaults.width, `${fieldPath}.width`),
    height: readOptionalNumber(rawDefaults.height, `${fieldPath}.height`),
    sections: readOptionalStringArray(
      rawDefaults.sections,
      `${fieldPath}.sections`,
    ),
    css: readOptionalString(rawDefaults.css, `${fieldPath}.css`),
    promptLibraryPath: readOptionalString(
      rawDefaults.promptLibraryPath,
      `${fieldPath}.promptLibraryPath`,
    ),
    contextPath: readOptionalString(
      rawDefaults.contextPath,
      `${fieldPath}.contextPath`,
    ),
    ollamaUrl: readOptionalString(
      rawDefaults.ollamaUrl,
      `${fieldPath}.ollamaUrl`,
    ),
    ollamaKeepAlive: readOptionalString(
      rawDefaults.ollamaKeepAlive,
      `${fieldPath}.ollamaKeepAlive`,
    ),
  };
}

function parseManifestEntry(
  rawEntry: unknown,
  index: number,
): BatchReviewManifestEntry {
  const fieldPath = `reviews[${index}]`;

  if (!isRecord(rawEntry)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    ...parseManifestDefaults(rawEntry, fieldPath),
    name: readOptionalString(rawEntry.name, `${fieldPath}.name`),
    target: readRequiredString(rawEntry.target, `${fieldPath}.target`),
    outputPath: readOptionalString(rawEntry.outputPath, `${fieldPath}.outputPath`),
    structuredOutputPath: readOptionalString(
      rawEntry.structuredOutputPath,
      `${fieldPath}.structuredOutputPath`,
    ),
  };
}

function parseStructuredReviewFinding(
  value: unknown,
  index: number,
): StructuredReviewFinding {
  const fieldPath = `findings[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    key: readOptionalString(value.key, `${fieldPath}.key`),
    title: readRequiredString(value.title, `${fieldPath}.title`),
    summary: readRequiredString(value.summary, `${fieldPath}.summary`),
    severity: readStructuredReviewSeverity(
      value.severity,
      `${fieldPath}.severity`,
    ),
    recommendation: readOptionalString(
      value.recommendation,
      `${fieldPath}.recommendation`,
    ),
    evidence: readOptionalStringArray(value.evidence, `${fieldPath}.evidence`),
  };
}

function parseStructuredReviewProvenanceItem(
  value: unknown,
  index: number,
): StructuredReviewProvenanceItem {
  const fieldPath = `provenance[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldPath}" must be an object.`);
  }

  return {
    label: readRequiredString(value.label, `${fieldPath}.label`),
    value: readRequiredString(value.value, `${fieldPath}.value`),
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

export function parseBatchReviewManifest(value: unknown): BatchReviewManifest {
  if (!isRecord(value)) {
    throw new Error("Batch review manifest must be a JSON object.");
  }

  if (!Array.isArray(value.reviews) || value.reviews.length === 0) {
    throw new Error('Batch review manifest requires a non-empty "reviews" array.');
  }

  return {
    defaults: parseManifestDefaults(value.defaults, "defaults"),
    reviews: value.reviews.map((entry, index) => parseManifestEntry(entry, index)),
  };
}

export function validateBatchReviewManifest(
  value: unknown,
): JsonContractValidationResult<BatchReviewManifest> {
  return validateContract(parseBatchReviewManifest, value);
}

export function parseStructuredReviewResult(
  value: unknown,
): StructuredReviewResult {
  if (!isRecord(value)) {
    throw new Error("Structured review result must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Manifest field "schemaVersion" must equal "1".');
  }

  if (!Array.isArray(value.findings)) {
    throw new Error('Structured review result requires a "findings" array.');
  }

  if (!Array.isArray(value.provenance)) {
    throw new Error('Structured review result requires a "provenance" array.');
  }

  return {
    schemaVersion: "1",
    workflow: readRequiredMode(value.workflow, "workflow"),
    expert: readRequiredString(value.expert, "expert"),
    model: readRequiredString(value.model, "model"),
    summary: readRequiredString(value.summary, "summary"),
    overallSeverity: readStructuredReviewSeverity(
      value.overallSeverity,
      "overallSeverity",
    ),
    findings: value.findings.map((finding, index) =>
      parseStructuredReviewFinding(finding, index),
    ),
    decision:
      value.decision === undefined ? undefined : parseStructuredReviewDecision(value.decision),
    provenance: value.provenance.map((item, index) =>
      parseStructuredReviewProvenanceItem(item, index),
    ),
    markdown: readRequiredString(value.markdown, "markdown"),
  };
}

export function validateStructuredReviewResult(
  value: unknown,
): JsonContractValidationResult<StructuredReviewResult> {
  return validateContract(parseStructuredReviewResult, value);
}
