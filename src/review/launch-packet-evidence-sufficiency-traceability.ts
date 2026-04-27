import type { StructuredReviewFinding } from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";
import type {
  LaunchPacketEvidenceBudgetEvidence,
  LaunchPacketSourceAuditEvidence,
} from "./launch-packet-evidence-sufficiency-types.js";

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

function hasSourceAuditPathGap(input: {
  sourceAudit: LaunchPacketSourceAuditEvidence;
  missingPathCount: number;
  unresolvedPathCount: number;
}): boolean {
  return (
    input.sourceAudit.status === "missing_paths" ||
    input.sourceAudit.status === "unresolved_paths" ||
    input.missingPathCount > 0 ||
    input.unresolvedPathCount > 0
  );
}

function reviewSourceAuditEvidence(
  sourceAudit: LaunchPacketSourceAuditEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!sourceAudit) {
    return;
  }

  if (sourceAudit.status === "not_applicable") {
    if (isBlank(sourceAudit.rationale)) {
      findings.push({
        key: "missing-source-audit-rationale",
        title: "Source-audit scope rationale is missing",
        summary:
          "The packet marks source-audit evidence as not applicable without explaining the public-safe boundary.",
        severity: "low",
        recommendation:
          "Record why source-audit path evidence is outside this packet's reusable review scope.",
      });
      addUniqueAction(actions, "revise_artifact");
    }
    return;
  }

  const missingPathCount = sourceAudit.missingPathCount ?? 0;
  const unresolvedPathCount = sourceAudit.unresolvedPathCount ?? 0;
  const hasPathGap = hasSourceAuditPathGap({
    sourceAudit,
    missingPathCount,
    unresolvedPathCount,
  });

  if (hasPathGap && sourceAudit.retrievalNoteProvided !== true) {
    findings.push({
      key: "source-audit-evidence-path-gap",
      title: "Source-audit evidence path is unresolved",
      summary:
        "The packet references source-audit evidence without a resolvable sanitized evidence path or caller-owned retrieval note.",
      severity: "medium",
      recommendation:
        "Attach sanitized evidence paths or record the caller-owned retrieval note before reusing the packet evidence.",
      evidence: [
        `${missingPathCount} missing path${missingPathCount === 1 ? "" : "s"}`,
        `${unresolvedPathCount} unresolved path${
          unresolvedPathCount === 1 ? "" : "s"
        }`,
      ],
    });
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "request_caller_review");
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
