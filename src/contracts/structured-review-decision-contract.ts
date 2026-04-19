import type {
  StructuredReviewFinding,
  StructuredReviewSeverity,
} from "./json-contracts.js";

export type StructuredReviewDecisionVerdict =
  | "accept"
  | "accept_with_follow_up"
  | "changes_requested"
  | "blocked"
  | "process_failed";

export type StructuredReviewDecisionConfidence = "low" | "medium" | "high";

export interface StructuredReviewDecision {
  schema: "peer_review_decision_v1";
  verdict: StructuredReviewDecisionVerdict;
  confidence: StructuredReviewDecisionConfidence;
  blocking: boolean;
  max_severity: StructuredReviewSeverity;
  summary: string;
  blocking_findings: StructuredReviewFinding[];
  non_blocking_findings: StructuredReviewFinding[];
  required_before_merge: string[];
  follow_up: string[];
}

const SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];
const VERDICTS: StructuredReviewDecisionVerdict[] = [
  "accept",
  "accept_with_follow_up",
  "changes_requested",
  "blocked",
  "process_failed",
];
const CONFIDENCE_VALUES: StructuredReviewDecisionConfidence[] = ["low", "medium", "high"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest field "${fieldName}" must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Manifest field "${fieldName}" must be a boolean.`);
  }

  return value;
}

function readOptionalStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Manifest field "${fieldName}" must be an array of strings.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function readSeverity(value: unknown, fieldName: string): StructuredReviewSeverity {
  if (SEVERITIES.includes(value as StructuredReviewSeverity)) {
    return value as StructuredReviewSeverity;
  }

  throw new Error(
    `Manifest field "${fieldName}" must be one of critical, high, medium, low, or unknown.`,
  );
}

function readVerdict(value: unknown, fieldName: string): StructuredReviewDecisionVerdict {
  if (VERDICTS.includes(value as StructuredReviewDecisionVerdict)) {
    return value as StructuredReviewDecisionVerdict;
  }

  throw new Error(
    `Manifest field "${fieldName}" must be one of ${VERDICTS.join(", ")}.`,
  );
}

function readConfidence(value: unknown, fieldName: string): StructuredReviewDecisionConfidence {
  if (CONFIDENCE_VALUES.includes(value as StructuredReviewDecisionConfidence)) {
    return value as StructuredReviewDecisionConfidence;
  }

  throw new Error(
    `Manifest field "${fieldName}" must be one of ${CONFIDENCE_VALUES.join(", ")}.`,
  );
}

function readFinding(value: unknown, fieldName: string): StructuredReviewFinding {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  return {
    key:
      value.key === undefined
        ? undefined
        : readRequiredString(value.key, `${fieldName}.key`),
    title: readRequiredString(value.title, `${fieldName}.title`),
    summary: readRequiredString(value.summary, `${fieldName}.summary`),
    severity: readSeverity(value.severity, `${fieldName}.severity`),
    recommendation:
      value.recommendation === undefined
        ? undefined
        : readRequiredString(value.recommendation, `${fieldName}.recommendation`),
    evidence: readOptionalStringArray(value.evidence, `${fieldName}.evidence`),
  };
}

function readFindings(value: unknown, fieldName: string): StructuredReviewFinding[] {
  if (!Array.isArray(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an array.`);
  }

  return value.map((item, index) => readFinding(item, `${fieldName}[${index}]`));
}

export function parseStructuredReviewDecision(value: unknown): StructuredReviewDecision {
  if (!isRecord(value)) {
    throw new Error('Manifest field "decision" must be an object.');
  }

  if (value.schema !== "peer_review_decision_v1") {
    throw new Error('Manifest field "decision.schema" must equal "peer_review_decision_v1".');
  }

  return {
    schema: "peer_review_decision_v1",
    verdict: readVerdict(value.verdict, "decision.verdict"),
    confidence: readConfidence(value.confidence, "decision.confidence"),
    blocking: readRequiredBoolean(value.blocking, "decision.blocking"),
    max_severity: readSeverity(value.max_severity, "decision.max_severity"),
    summary: readRequiredString(value.summary, "decision.summary"),
    blocking_findings: readFindings(value.blocking_findings, "decision.blocking_findings"),
    non_blocking_findings: readFindings(
      value.non_blocking_findings,
      "decision.non_blocking_findings",
    ),
    required_before_merge: readOptionalStringArray(
      value.required_before_merge,
      "decision.required_before_merge",
    ),
    follow_up: readOptionalStringArray(value.follow_up, "decision.follow_up"),
  };
}
