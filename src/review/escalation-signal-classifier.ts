import type {
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type {
  StructuredReviewNextStepAction,
} from "../contracts/structured-review-decision-contract.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export type ReviewEscalationSignalId =
  | "critical_severity"
  | "high_severity"
  | "blocking_decision"
  | "changes_requested_verdict"
  | "blocked_verdict"
  | "process_failed_verdict"
  | "request_caller_review"
  | "collect_more_evidence"
  | "rerun_review"
  | "track_follow_up";

export type ReviewEscalationSignalCategory =
  | "severity"
  | "decision"
  | "workflow";

export interface ReviewEscalationSignal {
  id: ReviewEscalationSignalId;
  category: ReviewEscalationSignalCategory;
  severity: StructuredReviewSeverity;
  summary: string;
  findingKeys: string[];
  nextStepActions: StructuredReviewNextStepAction[];
}

export interface ReviewEscalationSignalReport {
  highestSignalSeverity: StructuredReviewSeverity;
  signals: ReviewEscalationSignal[];
}

function severityRank(severity: StructuredReviewSeverity): number {
  return REVIEW_SEVERITY_ORDER.indexOf(severity);
}

function highestSeverity(
  severities: ReadonlyArray<StructuredReviewSeverity>,
): StructuredReviewSeverity {
  for (const severity of REVIEW_SEVERITY_ORDER) {
    if (severities.includes(severity)) {
      return severity;
    }
  }

  return "unknown";
}

function findingReference(finding: StructuredReviewFinding): string {
  return finding.key?.trim() || finding.title.trim();
}

function uniqueValues(values: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function findingsAtOrAbove(
  result: StructuredReviewResult,
  threshold: StructuredReviewSeverity,
): StructuredReviewFinding[] {
  return result.findings.filter(
    (finding) => severityRank(finding.severity) <= severityRank(threshold),
  );
}

function fallbackOperationalSeverity(
  result: StructuredReviewResult,
): StructuredReviewSeverity {
  return result.overallSeverity === "unknown" ? "medium" : result.overallSeverity;
}

function createSignal(input: {
  id: ReviewEscalationSignalId;
  category: ReviewEscalationSignalCategory;
  severity: StructuredReviewSeverity;
  summary: string;
  findings?: ReadonlyArray<StructuredReviewFinding>;
  nextStepActions?: ReadonlyArray<StructuredReviewNextStepAction>;
}): ReviewEscalationSignal {
  return {
    id: input.id,
    category: input.category,
    severity: input.severity,
    summary: input.summary,
    findingKeys: uniqueValues((input.findings || []).map(findingReference)),
    nextStepActions: [...(input.nextStepActions || [])],
  };
}

export function classifyReviewEscalationSignals(
  result: StructuredReviewResult,
): ReviewEscalationSignalReport {
  const signals: ReviewEscalationSignal[] = [];
  const criticalFindings = findingsAtOrAbove(result, "critical");
  const highOrAboveFindings = findingsAtOrAbove(result, "high");
  const decision = result.decision;

  if (result.overallSeverity === "critical") {
    signals.push(
      createSignal({
        id: "critical_severity",
        category: "severity",
        severity: "critical",
        summary:
          "Review output contains at least one critical-severity finding that needs immediate caller-owned attention.",
        findings: criticalFindings,
      }),
    );
  } else if (result.overallSeverity === "high") {
    signals.push(
      createSignal({
        id: "high_severity",
        category: "severity",
        severity: "high",
        summary:
          "Review output contains high-severity findings that merit prompt caller-owned attention.",
        findings: highOrAboveFindings,
      }),
    );
  }

  if (decision?.blocking) {
    signals.push(
      createSignal({
        id: "blocking_decision",
        category: "decision",
        severity: decision.max_severity,
        summary:
          "Review decision is explicitly blocking and should not be treated as resolved without caller-owned follow-up.",
        findings: decision.blocking_findings,
        nextStepActions: decision.next_step_actions,
      }),
    );
  }

  if (decision?.verdict === "changes_requested") {
    signals.push(
      createSignal({
        id: "changes_requested_verdict",
        category: "decision",
        severity: decision.max_severity,
        summary:
          "Review requested changes before the artifact should be treated as ready for caller-owned downstream use.",
        findings: [
          ...decision.blocking_findings,
          ...decision.non_blocking_findings,
        ],
        nextStepActions: decision.next_step_actions,
      }),
    );
  }

  if (decision?.verdict === "blocked") {
    signals.push(
      createSignal({
        id: "blocked_verdict",
        category: "decision",
        severity: decision.max_severity,
        summary:
          "Review output is blocked and needs caller-owned interpretation before the workflow can proceed.",
        findings: decision.blocking_findings,
        nextStepActions: decision.next_step_actions,
      }),
    );
  }

  if (decision?.verdict === "process_failed") {
    signals.push(
      createSignal({
        id: "process_failed_verdict",
        category: "decision",
        severity: fallbackOperationalSeverity(result),
        summary:
          "Review process failed, so the output should be treated as incomplete until the caller resolves the failure.",
        findings: decision.blocking_findings,
        nextStepActions: decision.next_step_actions,
      }),
    );
  }

  if (decision) {
    for (const action of decision.next_step_actions) {
      if (action === "request_caller_review") {
        signals.push(
          createSignal({
            id: "request_caller_review",
            category: "workflow",
            severity: fallbackOperationalSeverity(result),
            summary:
              "Review requested caller-owned review before downstream action.",
            findings: decision.blocking_findings,
            nextStepActions: [action],
          }),
        );
      }

      if (action === "collect_more_evidence") {
        signals.push(
          createSignal({
            id: "collect_more_evidence",
            category: "workflow",
            severity: fallbackOperationalSeverity(result),
            summary:
              "Review requested additional evidence before a caller-owned decision.",
            findings: [
              ...decision.blocking_findings,
              ...decision.non_blocking_findings,
            ],
            nextStepActions: [action],
          }),
        );
      }

      if (action === "rerun_review") {
        signals.push(
          createSignal({
            id: "rerun_review",
            category: "workflow",
            severity: fallbackOperationalSeverity(result),
            summary:
              "Review requested a rerun because the current output is not sufficient on its own.",
            findings: decision.blocking_findings,
            nextStepActions: [action],
          }),
        );
      }

      if (action === "track_follow_up") {
        signals.push(
          createSignal({
            id: "track_follow_up",
            category: "workflow",
            severity: fallbackOperationalSeverity(result),
            summary:
              "Review accepted follow-up work that still needs caller-owned tracking.",
            findings: decision.non_blocking_findings,
            nextStepActions: [action],
          }),
        );
      }
    }
  }

  return {
    highestSignalSeverity: highestSeverity(signals.map((signal) => signal.severity)),
    signals,
  };
}
