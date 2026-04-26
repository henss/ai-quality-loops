import type {
  StructuredReviewFinding,
  StructuredReviewSeverity,
} from "./json-contracts.js";

export type StructuredReviewDecisionVerdict =
  | "accept"
  | "accept_with_follow_up"
  | "abstain_request_evidence"
  | "changes_requested"
  | "blocked"
  | "process_failed";

export type StructuredReviewDecisionConfidence = "low" | "medium" | "high";
export type StructuredReviewNextStepAction =
  | "revise_artifact"
  | "collect_more_evidence"
  | "request_evidence"
  | "rerun_review"
  | "request_caller_review"
  | "track_follow_up";

export interface StructuredReviewEvidenceRequest {
  key?: string;
  summary: string;
  needed_evidence: string[];
  reason?: string;
}

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
  next_step_actions: StructuredReviewNextStepAction[];
  evidence_requests?: StructuredReviewEvidenceRequest[];
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
  "abstain_request_evidence",
  "changes_requested",
  "blocked",
  "process_failed",
];
const CONFIDENCE_VALUES: StructuredReviewDecisionConfidence[] = ["low", "medium", "high"];
const NEXT_STEP_ACTIONS: StructuredReviewNextStepAction[] = [
  "revise_artifact",
  "collect_more_evidence",
  "request_evidence",
  "rerun_review",
  "request_caller_review",
  "track_follow_up",
];

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

function readEvidenceRequest(
  value: unknown,
  fieldName: string,
): StructuredReviewEvidenceRequest {
  if (!isRecord(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an object.`);
  }

  const needed_evidence = readOptionalStringArray(
    value.needed_evidence,
    `${fieldName}.needed_evidence`,
  );
  if (needed_evidence.length === 0) {
    throw new Error(
      `Manifest field "${fieldName}.needed_evidence" must include at least one non-empty string.`,
    );
  }

  return {
    key:
      value.key === undefined
        ? undefined
        : readRequiredString(value.key, `${fieldName}.key`),
    summary: readRequiredString(value.summary, `${fieldName}.summary`),
    needed_evidence,
    reason:
      value.reason === undefined
        ? undefined
        : readRequiredString(value.reason, `${fieldName}.reason`),
  };
}

function readOptionalEvidenceRequests(
  value: unknown,
  fieldName: string,
): StructuredReviewEvidenceRequest[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an array.`);
  }

  return value.map((item, index) =>
    readEvidenceRequest(item, `${fieldName}[${index}]`),
  );
}

function readOptionalNextStepActions(
  value: unknown,
  fieldName: string,
): StructuredReviewNextStepAction[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`Manifest field "${fieldName}" must be an array.`);
  }

  return value.map((item, index) => {
    if (NEXT_STEP_ACTIONS.includes(item as StructuredReviewNextStepAction)) {
      return item as StructuredReviewNextStepAction;
    }

    throw new Error(
      `Manifest field "${fieldName}[${index}]" must be one of ${NEXT_STEP_ACTIONS.join(", ")}.`,
    );
  });
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

export function deriveStructuredReviewNextStepActions(input: {
  verdict: StructuredReviewDecisionVerdict;
  blocking: boolean;
  required_before_merge: string[];
  follow_up: string[];
  evidence_requests?: StructuredReviewEvidenceRequest[];
}): StructuredReviewNextStepAction[] {
  const actions = new Set<StructuredReviewNextStepAction>();

  if (input.required_before_merge.length > 0 || input.verdict === "changes_requested") {
    actions.add("revise_artifact");
  }

  if (input.follow_up.length > 0 || input.verdict === "accept_with_follow_up") {
    actions.add("track_follow_up");
  }

  if (
    input.verdict === "abstain_request_evidence" ||
    (input.evidence_requests?.length ?? 0) > 0
  ) {
    actions.add("request_evidence");
  }

  if (input.verdict === "blocked") {
    actions.add(input.blocking ? "request_caller_review" : "collect_more_evidence");
  }

  if (input.verdict === "process_failed") {
    actions.add("rerun_review");
  }

  return [...actions];
}

export function parseStructuredReviewDecision(value: unknown): StructuredReviewDecision {
  if (!isRecord(value)) {
    throw new Error('Manifest field "decision" must be an object.');
  }

  if (value.schema !== "peer_review_decision_v1") {
    throw new Error('Manifest field "decision.schema" must equal "peer_review_decision_v1".');
  }

  const required_before_merge = readOptionalStringArray(
    value.required_before_merge,
    "decision.required_before_merge",
  );
  const follow_up = readOptionalStringArray(value.follow_up, "decision.follow_up");
  const verdict = readVerdict(value.verdict, "decision.verdict");
  const blocking = readRequiredBoolean(value.blocking, "decision.blocking");
  const evidence_requests = readOptionalEvidenceRequests(
    value.evidence_requests,
    "decision.evidence_requests",
  );
  if (verdict === "abstain_request_evidence" && evidence_requests.length === 0) {
    throw new Error(
      'Manifest field "decision.evidence_requests" must include at least one request for abstain_request_evidence decisions.',
    );
  }
  const next_step_actions =
    readOptionalNextStepActions(value.next_step_actions, "decision.next_step_actions") ??
    deriveStructuredReviewNextStepActions({
      verdict,
      blocking,
      required_before_merge,
      follow_up,
      evidence_requests,
    });
  if (
    evidence_requests.length > 0 &&
    !next_step_actions.includes("request_evidence")
  ) {
    throw new Error(
      'Manifest field "decision.next_step_actions" must include "request_evidence" when decision.evidence_requests is non-empty.',
    );
  }

  return {
    schema: "peer_review_decision_v1",
    verdict,
    confidence: readConfidence(value.confidence, "decision.confidence"),
    blocking,
    max_severity: readSeverity(value.max_severity, "decision.max_severity"),
    summary: readRequiredString(value.summary, "decision.summary"),
    blocking_findings: readFindings(value.blocking_findings, "decision.blocking_findings"),
    non_blocking_findings: readFindings(
      value.non_blocking_findings,
      "decision.non_blocking_findings",
    ),
    required_before_merge,
    follow_up,
    next_step_actions,
    evidence_requests,
  };
}
