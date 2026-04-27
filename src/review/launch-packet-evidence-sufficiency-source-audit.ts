import type { StructuredReviewFinding } from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";
import type { LaunchPacketSourceAuditEvidence } from "./launch-packet-evidence-sufficiency-types.js";

function isBlank(value?: string): boolean {
  return value === undefined || value.trim().length === 0;
}

function hasNonBlankEntry(values?: ReadonlyArray<string>): boolean {
  return values?.some((value) => !isBlank(value)) === true;
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

function reviewNotApplicableSourceAudit(
  sourceAudit: LaunchPacketSourceAuditEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): boolean {
  if (sourceAudit.status !== "not_applicable") {
    return false;
  }

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

  return true;
}

function reviewCompleteSourceAudit(
  sourceAudit: LaunchPacketSourceAuditEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (
    sourceAudit.status === "complete" &&
    !hasNonBlankEntry(sourceAudit.inspectedSourceHandles)
  ) {
    findings.push({
      key: "missing-source-inspection-evidence",
      title: "Source-inspection evidence handle is missing",
      summary:
        "The packet marks source inspection complete without listing the raw source handle or sanitized artifact that was inspected.",
      severity: "medium",
      recommendation:
        "Record the inspected source handle or caller-owned retrieval note before reusing the packet evidence.",
    });
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "request_caller_review");
  }
}

function reviewSourceAuditPathGap(
  sourceAudit: LaunchPacketSourceAuditEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
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

function reviewTruncatedSourceAudit(
  sourceAudit: LaunchPacketSourceAuditEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (sourceAudit.decisiveEvidenceTruncated) {
    findings.push({
      key: "truncated-decisive-source-evidence",
      title: "Decisive source evidence is truncated",
      summary:
        "The packet marks source inspection as available, but the decisive evidence excerpt is truncated enough that the reviewer cannot verify the claim.",
      severity: "high",
      recommendation:
        "Attach the bounded decisive excerpt, a sanitized artifact handle, or classify the packet as blocked before launch.",
    });
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "request_caller_review");
  }
}

export function reviewSourceAuditEvidence(
  sourceAudit: LaunchPacketSourceAuditEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!sourceAudit) {
    findings.push({
      key: "missing-source-audit-disposition",
      title: "Source-audit disposition is missing",
      summary:
        "The packet does not say whether source inspection was completed, skipped as not applicable, or blocked by unresolved paths.",
      severity: "medium",
      recommendation:
        "Record source-audit evidence or a concise not-applicable rationale before reusing the launch packet.",
    });
    addUniqueAction(actions, "collect_more_evidence");
    return;
  }

  if (reviewNotApplicableSourceAudit(sourceAudit, findings, actions)) {
    return;
  }

  reviewCompleteSourceAudit(sourceAudit, findings, actions);
  reviewSourceAuditPathGap(sourceAudit, findings, actions);
  reviewTruncatedSourceAudit(sourceAudit, findings, actions);
}
