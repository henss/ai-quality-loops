import type { StructuredReviewFinding } from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";
import type {
  LaunchPacketEvidenceBudgetEvidence,
  LaunchPacketSourceAuditEvidence,
} from "./launch-packet-evidence-sufficiency-types.js";
import { reviewSourceAuditEvidence } from "./launch-packet-evidence-sufficiency-source-audit.js";

function isBlank(value?: string): boolean {
  return value === undefined || value.trim().length === 0;
}

function addUniqueAction(
  actions: StructuredReviewNextStepAction[],
  action: StructuredReviewNextStepAction,
): void {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

function reviewEvidenceBudgetEvidence(
  evidenceBudget: LaunchPacketEvidenceBudgetEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!evidenceBudget) {
    return;
  }

  if (evidenceBudget.status === "not_applicable") {
    if (isBlank(evidenceBudget.rationale)) {
      findings.push({
        key: "missing-evidence-budget-rationale",
        title: "Evidence-budget scope rationale is missing",
        summary:
          "The packet marks evidence-budget evidence as not applicable without explaining why no budget check is needed.",
        severity: "low",
        recommendation:
          "Record a concise rationale so callers can distinguish intentional scope from omitted budget evidence.",
      });
      addUniqueAction(actions, "revise_artifact");
    }
    return;
  }

  if (evidenceBudget.status === "missing" || evidenceBudget.status === "exceeded") {
    findings.push({
      key: "evidence-budget-gap",
      title: "Evidence-budget result is not defended",
      summary:
        evidenceBudget.status === "missing"
          ? "The packet requires an evidence-budget check but does not record the result."
          : "The packet records an exceeded evidence budget without a caller-owned decision to proceed.",
      severity: "medium",
      recommendation:
        "Record the budget result, narrow the evidence surface, or route the exception to the caller-owned workflow.",
      evidence: evidenceBudget.budgetName ? [evidenceBudget.budgetName] : undefined,
    });
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "request_caller_review");
  }
}

export function reviewTraceabilityEvidence(input: {
  sourceAudit: LaunchPacketSourceAuditEvidence | undefined;
  evidenceBudget: LaunchPacketEvidenceBudgetEvidence | undefined;
  findings: StructuredReviewFinding[];
  actions: StructuredReviewNextStepAction[];
}): void {
  reviewSourceAuditEvidence(input.sourceAudit, input.findings, input.actions);
  reviewEvidenceBudgetEvidence(input.evidenceBudget, input.findings, input.actions);
}
