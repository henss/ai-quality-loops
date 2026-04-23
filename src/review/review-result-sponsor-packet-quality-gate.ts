import type {
  JsonContractValidationResult,
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { ReviewEscalationSignal } from "./escalation-signal-classifier.js";
import { classifyReviewEscalationSignals } from "./escalation-signal-classifier.js";

const DEFAULT_INCLUDED_SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
];

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

const BLOCKING_SIGNAL_IDS = new Set([
  "collect_more_evidence",
  "process_failed_verdict",
  "rerun_review",
]);

export type SponsorPacketHandoffIssueSeverity = "error" | "warning";

export type SponsorPacketHandoffIssueCode =
  | "candidate_missing_evidence"
  | "candidate_missing_recommendation"
  | "incomplete_review_signal"
  | "missing_structured_decision"
  | "no_candidate_findings";

export interface SponsorPacketHandoffIssue {
  code: SponsorPacketHandoffIssueCode;
  severity: SponsorPacketHandoffIssueSeverity;
  summary: string;
  findingIds?: string[];
  signalIds?: string[];
}

export interface ReviewResultSponsorPacketHandoffOptions {
  includeSeverities?: StructuredReviewSeverity[];
  requireRecommendation?: boolean;
  requireEvidence?: boolean;
  requireStructuredDecision?: boolean;
}

export interface ReviewResultSponsorPacketHandoffReport {
  ok: boolean;
  includedSeverities: StructuredReviewSeverity[];
  highestCandidateSeverity: StructuredReviewSeverity | null;
  candidateFindingCount: number;
  escalationSignals: ReviewEscalationSignal[];
  issues: SponsorPacketHandoffIssue[];
}

function compareSeverity(
  left: StructuredReviewSeverity,
  right: StructuredReviewSeverity,
): number {
  return REVIEW_SEVERITY_ORDER.indexOf(left) - REVIEW_SEVERITY_ORDER.indexOf(right);
}

function findingReference(finding: StructuredReviewFinding): string {
  return finding.key?.trim() || finding.title.trim();
}

function candidateFindings(
  result: StructuredReviewResult,
  includedSeverities: ReadonlyArray<StructuredReviewSeverity>,
): StructuredReviewFinding[] {
  const severities = new Set(includedSeverities);
  return result.findings.filter((finding) => severities.has(finding.severity));
}

function highestCandidateSeverity(
  findings: ReadonlyArray<StructuredReviewFinding>,
): StructuredReviewSeverity | null {
  if (findings.length === 0) {
    return null;
  }

  return [...findings]
    .sort((left, right) => compareSeverity(left.severity, right.severity))[0]
    ?.severity ?? null;
}

function validationError(report: ReviewResultSponsorPacketHandoffReport): Error {
  return new Error(
    `Sponsor packet handoff gate failed: ${report.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.summary)
      .join(" ")}`,
  );
}

export function evaluateReviewResultSponsorPacketHandoff(
  result: StructuredReviewResult,
  options: ReviewResultSponsorPacketHandoffOptions = {},
): ReviewResultSponsorPacketHandoffReport {
  const includedSeverities = options.includeSeverities ?? DEFAULT_INCLUDED_SEVERITIES;
  const requireStructuredDecision = options.requireStructuredDecision ?? true;
  const requireRecommendation = options.requireRecommendation ?? true;
  const requireEvidence = options.requireEvidence ?? true;
  const findings = candidateFindings(result, includedSeverities);
  const escalationSignalReport = classifyReviewEscalationSignals(result);
  const issues: SponsorPacketHandoffIssue[] = [];

  if (!result.decision) {
    issues.push({
      code: "missing_structured_decision",
      severity: requireStructuredDecision ? "error" : "warning",
      summary: requireStructuredDecision
        ? "Structured review result must include an explicit decision before sponsor-packet handoff."
        : "Structured review result does not include an explicit decision, so sponsor posture will be inferred from findings.",
    });
  }

  const blockingSignals = escalationSignalReport.signals.filter((signal) =>
    BLOCKING_SIGNAL_IDS.has(signal.id),
  );
  if (blockingSignals.length > 0) {
    issues.push({
      code: "incomplete_review_signal",
      severity: "error",
      summary:
        "Structured review result still indicates incomplete review work before sponsor-packet handoff.",
      signalIds: blockingSignals.map((signal) => signal.id),
    });
  }

  if (findings.length === 0) {
    issues.push({
      code: "no_candidate_findings",
      severity: "error",
      summary:
        "Structured review result does not include any backlog-candidate findings at the configured severities.",
    });
  }

  if (requireRecommendation) {
    const missingRecommendation = findings
      .filter((finding) => !finding.recommendation?.trim())
      .map(findingReference);
    if (missingRecommendation.length > 0) {
      issues.push({
        code: "candidate_missing_recommendation",
        severity: "error",
        summary:
          "Backlog-candidate findings must include a recommendation before sponsor-packet handoff.",
        findingIds: missingRecommendation,
      });
    }
  }

  if (requireEvidence) {
    const missingEvidence = findings
      .filter((finding) => !finding.evidence || finding.evidence.length === 0)
      .map(findingReference);
    if (missingEvidence.length > 0) {
      issues.push({
        code: "candidate_missing_evidence",
        severity: "error",
        summary:
          "Backlog-candidate findings must include at least one evidence label before sponsor-packet handoff.",
        findingIds: missingEvidence,
      });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    includedSeverities: [...includedSeverities],
    highestCandidateSeverity: highestCandidateSeverity(findings),
    candidateFindingCount: findings.length,
    escalationSignals: escalationSignalReport.signals,
    issues,
  };
}

export function validateReviewResultSponsorPacketHandoff(
  result: StructuredReviewResult,
  options: ReviewResultSponsorPacketHandoffOptions = {},
): JsonContractValidationResult<ReviewResultSponsorPacketHandoffReport> {
  const report = evaluateReviewResultSponsorPacketHandoff(result, options);

  if (report.ok) {
    return {
      ok: true,
      value: report,
    };
  }

  return {
    ok: false,
    error: validationError(report),
  };
}
