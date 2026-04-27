import type {
  StructuredReviewFinding,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";
import { LAUNCH_PACKET_EVIDENCE_SUFFICIENCY_REVIEW_SCHEMA } from "./launch-packet-evidence-sufficiency-types.js";
import type {
  LaunchPacketAdoptionEvidence,
  LaunchPacketBoundaryEvidence,
  LaunchPacketEvidenceSufficiencyInput,
  LaunchPacketEvidenceSufficiencyReview,
  LaunchPacketOutcomeEvidence,
  LaunchPacketVerificationEvidence,
} from "./launch-packet-evidence-sufficiency-types.js";

export type {
  LaunchPacketAdoptionEvidence,
  LaunchPacketBoundaryEvidence,
  LaunchPacketEvidenceReference,
  LaunchPacketEvidenceStatus,
  LaunchPacketEvidenceSufficiencyInput,
  LaunchPacketEvidenceSufficiencyReview,
  LaunchPacketOutcomeEvidence,
  LaunchPacketVerificationEvidence,
} from "./launch-packet-evidence-sufficiency-types.js";

const SEVERITY_RANK: Record<StructuredReviewSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unknown: 4,
};

function isBlank(value?: string): boolean {
  return value === undefined || value.trim().length === 0;
}

function normalizeCommand(value?: string): string | undefined {
  return value?.replace(/\s+/g, " ").trim().toLowerCase();
}

function createFinding(input: StructuredReviewFinding): StructuredReviewFinding {
  return input;
}

function addUniqueAction(
  actions: StructuredReviewNextStepAction[],
  action: StructuredReviewNextStepAction,
): void {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

function getMaxSeverity(findings: ReadonlyArray<StructuredReviewFinding>) {
  return findings.reduce<StructuredReviewSeverity>(
    (maxSeverity, finding) =>
      SEVERITY_RANK[finding.severity] < SEVERITY_RANK[maxSeverity]
        ? finding.severity
        : maxSeverity,
    "unknown",
  );
}

function reviewEvidenceReferences(
  input: LaunchPacketEvidenceSufficiencyInput,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  const requiredEvidence = input.evidence.filter((entry) => entry.required !== false);

  if (requiredEvidence.length === 0) {
    findings.push(
      createFinding({
        key: "missing-required-evidence-registry",
        title: "Required evidence registry is empty",
        summary:
          "The packet does not list any required evidence references, so the reviewer cannot distinguish supported claims from omitted inputs.",
        severity: "high",
        recommendation:
          "Add explicit required evidence labels and handles before treating the packet as launch-ready.",
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "revise_artifact");
    return;
  }

  const missingHandles = requiredEvidence.filter(
    (entry) => entry.status === "missing" || isBlank(entry.handle),
  );
  const hintOnlyEvidence = requiredEvidence.filter(
    (entry) => entry.status === "hint_only",
  );
  const staleEvidence = requiredEvidence.filter((entry) => entry.status === "stale");

  if (missingHandles.length > 0) {
    findings.push(
      createFinding({
        key: "missing-evidence-handle",
        title: "Required evidence handle is missing",
        summary: `${missingHandles.length} required evidence reference${
          missingHandles.length === 1 ? " lacks" : "s lack"
        } a confirmed handle.`,
        severity: "high",
        recommendation:
          "Confirm each required evidence handle with an artifact read or source-owned registry before launch.",
        evidence: missingHandles.map((entry) => entry.label),
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
  }

  if (hintOnlyEvidence.length > 0) {
    findings.push(
      createFinding({
        key: "hint-treated-as-evidence",
        title: "Hint-only evidence needs confirmation",
        summary:
          "At least one path-like, stderr, failed-command, or memory-derived string is still marked as a hint instead of confirmed evidence.",
        severity: "medium",
        recommendation:
          "Confirm hinted evidence with file discovery, existence checks, or artifact reads before relying on it.",
        evidence: hintOnlyEvidence.map((entry) => entry.label),
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
  }

  if (staleEvidence.length > 0) {
    findings.push(
      createFinding({
        key: "stale-evidence-reference",
        title: "Required evidence is stale",
        summary:
          "The packet depends on stale evidence where current generated state or live tool output is needed.",
        severity: "medium",
        recommendation:
          "Refresh the stale evidence or revise the packet so it does not overclaim current-state support.",
        evidence: staleEvidence.map((entry) => entry.label),
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
  }
}

function reviewVerificationEvidence(
  verification: LaunchPacketVerificationEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!verification || verification.result === "missing") {
    findings.push(
      createFinding({
        key: "missing-verification-evidence",
        title: "Verification evidence is missing",
        summary:
          "The packet does not include a concrete verification result that defends the launch surface.",
        severity: "high",
        recommendation:
          "Run the repo-local validation command or record the exact blocker before launch.",
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
    return;
  }

  if (verification.targetedRun === false) {
    findings.push(
      createFinding({
        key: "missing-targeted-test-run",
        title: "Targeted verification run is missing",
        summary:
          "The packet records verification, but not the narrow test run that directly exercises the changed review surface.",
        severity: "medium",
        recommendation:
          "Run the targeted test or record why only a broader validation command can defend this packet.",
      }),
    );
    addUniqueAction(actions, "rerun_review");
  }

  const claimedCommand = normalizeCommand(verification.claimedCommand);
  const observedCommand = normalizeCommand(verification.observedCommand);

  if (claimedCommand && observedCommand && claimedCommand !== observedCommand) {
    findings.push(
      createFinding({
        key: "verification-wrapper-mismatch",
        title: "Verification wrapper mismatches observed command",
        summary:
          "The packet claims one verification command while the observed evidence records a different command.",
        severity: "high",
        recommendation:
          "Restate the verification evidence or rerun the intended command before treating the packet as defended.",
      }),
    );
    addUniqueAction(actions, "rerun_review");
    addUniqueAction(actions, "request_caller_review");
  }

  if (verification.result === "failed") {
    findings.push(
      createFinding({
        key: "failed-verification-evidence",
        title: "Verification evidence did not pass",
        summary:
          "The recorded verification result failed, so the packet needs repair or an explicit blocker.",
        severity: "high",
        recommendation:
          "Repair only the blocking seam needed for verification, or classify the unresolved failure before launch.",
      }),
    );
    addUniqueAction(actions, "revise_artifact");
  }

  if ((verification.repeatedFailedCommandCount ?? 0) >= 3) {
    findings.push(
      createFinding({
        key: "repeated-command-noise",
        title: "Repeated command noise obscures evidence",
        summary:
          "Multiple repeated failed-command attempts are present, which makes the actual verification signal harder to audit.",
        severity: "medium",
        recommendation:
          "Replace repeated command logs with the final materially changed command, result, and blocker.",
      }),
    );
    addUniqueAction(actions, "revise_artifact");
  }

  if (verification.runtimeStderr === "unresolved") {
    findings.push(
      createFinding({
        key: "unresolved-runtime-stderr",
        title: "Runtime stderr is unresolved",
        summary:
          "The packet records stderr from the reviewer runtime without explaining whether it is expected, harmless, or blocking.",
        severity: "medium",
        recommendation:
          "Record the stderr interpretation and rerun evidence, or classify the packet as blocked if the warning may affect review output.",
      }),
    );
    addUniqueAction(actions, "rerun_review");
    addUniqueAction(actions, "request_caller_review");
  }

  if (verification.surfaceBudgetChecked === false) {
    findings.push(
      createFinding({
        key: "missing-surface-budget-check",
        title: "Agent-surface budget check is missing",
        summary:
          "The packet changed a review surface without recording the pre-edit or changed-file surface-budget check.",
        severity: "medium",
        recommendation:
          "Run the repo-local agent-surface guard for the touched files, or record why the change is not code-surface work.",
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
  }
}

function reviewAdoptionEvidence(
  adoption: LaunchPacketAdoptionEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!adoption || adoption.status === "missing") {
    findings.push(
      createFinding({
        key: "missing-build-vs-buy-evidence",
        title: "Build-vs-buy evidence is missing",
        summary:
          "The packet does not record whether a reusable external option was checked or why the work is one-off.",
        severity: "medium",
        recommendation:
          "Record the solution-scout command, an adoption/rejection decision, or a concrete not-applicable rationale.",
      }),
    );
    addUniqueAction(actions, "collect_more_evidence");
    return;
  }

  if (
    (adoption.status === "rejected" || adoption.status === "not_applicable") &&
    isBlank(adoption.rationale)
  ) {
    findings.push(
      createFinding({
        key: "missing-build-vs-buy-rationale",
        title: "Build-vs-buy rationale is missing",
        summary:
          "The packet rejects adoption or marks the check not applicable without recording the reason.",
        severity: "medium",
        recommendation:
          "Add a concise public-safe rationale so future agents do not repeat the same scout decision.",
      }),
    );
    addUniqueAction(actions, "revise_artifact");
  }
}

function reviewOutcomeEvidence(
  outcome: LaunchPacketOutcomeEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!outcome?.generatedPath) {
    findings.push(
      createFinding({
        key: "missing-generated-outcome-path",
        title: "Generated outcome path is not explicit",
        summary:
          "The packet does not name the generated outcome path that downstream ingest should read.",
        severity: "medium",
        recommendation:
          "Record the expected generated outcome path directly instead of relying on sibling discovery or guessed filenames.",
      }),
    );
    addUniqueAction(actions, "revise_artifact");
    return;
  }

  if (!outcome.statusChecked) {
    findings.push(
      createFinding({
        key: "missing-outcome-status-check",
        title: "Generated outcome status was not checked",
        summary:
          "The packet records an outcome path but does not confirm its local git status after writing.",
        severity: "low",
        recommendation:
          "Check the generated outcome path directly before closing the session.",
      }),
    );
    addUniqueAction(actions, "track_follow_up");
  }
}

function reviewBoundaryEvidence(
  boundary: LaunchPacketBoundaryEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (isBlank(boundary?.outputClassification)) {
    findings.push(
      createFinding({
        key: "missing-output-classification",
        title: "Output classification is missing",
        summary:
          "The packet does not classify the expected output before work starts, making scope drift harder to catch.",
        severity: "medium",
        recommendation:
          "Classify the output as code, investigation, estimate, review, proposal, artifact, coordination, or blocker.",
      }),
    );
    addUniqueAction(actions, "revise_artifact");
  }

  if (boundary?.privateDetailsIncluded) {
    findings.push(
      createFinding({
        key: "private-detail-boundary-leak",
        title: "Private details are included in shared evidence",
        summary:
          "The packet evidence includes private or company-specific details that should stay caller-owned.",
        severity: "critical",
        recommendation:
          "Redact or move private details out of the shared review surface before launch.",
      }),
    );
    addUniqueAction(actions, "request_caller_review");
  }

  if (boundary?.trackerFreshnessRequired && !boundary.trackerFreshnessConfirmed) {
    findings.push(
      createFinding({
        key: "unconfirmed-tracker-freshness",
        title: "Required tracker freshness is unconfirmed",
        summary:
          "The packet makes tracker freshness material but does not confirm the tracker state was read.",
        severity: "medium",
        recommendation:
          "Either confirm tracker freshness in the caller-owned workflow or revise the packet to remove that dependency.",
      }),
    );
    addUniqueAction(actions, "request_caller_review");
  }
}

export function reviewLaunchPacketEvidenceSufficiency(
  input: LaunchPacketEvidenceSufficiencyInput,
): LaunchPacketEvidenceSufficiencyReview {
  const findings: StructuredReviewFinding[] = [];
  const nextStepActions: StructuredReviewNextStepAction[] = [];

  reviewEvidenceReferences(input, findings, nextStepActions);
  reviewAdoptionEvidence(input.adoption, findings, nextStepActions);
  reviewVerificationEvidence(input.verification, findings, nextStepActions);
  reviewOutcomeEvidence(input.outcome, findings, nextStepActions);
  reviewBoundaryEvidence(input.boundary, findings, nextStepActions);

  const maxSeverity = getMaxSeverity(findings);
  const hasCriticalOrHigh = findings.some(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  );
  const verdict =
    findings.length === 0
      ? "sufficient"
      : hasCriticalOrHigh
        ? "insufficient"
        : "needs_caller_review";

  return {
    schema: LAUNCH_PACKET_EVIDENCE_SUFFICIENCY_REVIEW_SCHEMA,
    packetId: input.packetId,
    verdict,
    confidence: findings.length === 0 ? "high" : "medium",
    maxSeverity,
    summary:
      findings.length === 0
        ? "Packet evidence is sufficient for a bounded local-first review launch."
        : `Packet evidence has ${findings.length} sufficiency issue${
            findings.length === 1 ? "" : "s"
          } that should be resolved or caller-reviewed before launch.`,
    findings,
    nextStepActions,
  };
}
