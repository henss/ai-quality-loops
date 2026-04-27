import type { StructuredReviewFinding } from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";
import type { LaunchPacketVerificationEvidence } from "./launch-packet-evidence-sufficiency-types.js";

function normalizeCommand(value?: string): string | undefined {
  return value?.replace(/\s+/g, " ").trim().toLowerCase();
}

function addUniqueAction(
  actions: StructuredReviewNextStepAction[],
  action: StructuredReviewNextStepAction,
): void {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

function reviewTargetedRunEvidence(
  verification: LaunchPacketVerificationEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (verification.targetedRun === false) {
    findings.push({
      key: "missing-targeted-test-run",
      title: "Targeted verification run is missing",
      summary:
        "The packet records verification, but not the narrow test run that directly exercises the changed review surface.",
      severity: "medium",
      recommendation:
        "Run the targeted test or record why only a broader validation command can defend this packet.",
    });
    addUniqueAction(actions, "rerun_review");
  }

  if (
    verification.targetedRun === true &&
    verification.fixturePassFailLog !== "complete"
  ) {
    findings.push({
      key: "missing-fixture-pass-fail-log",
      title: "Fixture pass/fail log is missing",
      summary:
        "The packet claims targeted reviewer verification without explicit fixture pass/fail evidence for the clean and waste-pattern cases.",
      severity: "medium",
      recommendation:
        "Record the targeted fixture pass/fail log, or rerun the focused reviewer test before launch.",
    });
    addUniqueAction(actions, "collect_more_evidence");
    addUniqueAction(actions, "rerun_review");
  }
}

function reviewCommandEvidence(
  verification: LaunchPacketVerificationEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  const claimedCommand = normalizeCommand(verification.claimedCommand);
  const observedCommand = normalizeCommand(verification.observedCommand);

  if (claimedCommand && observedCommand && claimedCommand !== observedCommand) {
    findings.push({
      key: "verification-wrapper-mismatch",
      title: "Verification wrapper mismatches observed command",
      summary:
        "The packet claims one verification command while the observed evidence records a different command.",
      severity: "high",
      recommendation:
        "Restate the verification evidence or rerun the intended command before treating the packet as defended.",
    });
    addUniqueAction(actions, "rerun_review");
    addUniqueAction(actions, "request_caller_review");
  }
}

function reviewFailedRunEvidence(
  verification: LaunchPacketVerificationEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (verification.result === "failed") {
    findings.push({
      key: "failed-verification-evidence",
      title: "Verification evidence did not pass",
      summary:
        "The recorded verification result failed, so the packet needs repair or an explicit blocker.",
      severity: "high",
      recommendation:
        "Repair only the blocking seam needed for verification, or classify the unresolved failure before launch.",
    });
    addUniqueAction(actions, "revise_artifact");
  }

  if ((verification.repeatedFailedCommandCount ?? 0) >= 3) {
    findings.push({
      key: "repeated-command-noise",
      title: "Repeated command noise obscures evidence",
      summary:
        "Multiple repeated failed-command attempts are present, which makes the actual verification signal harder to audit.",
      severity: "medium",
      recommendation:
        "Replace repeated command logs with the final materially changed command, result, and blocker.",
    });
    addUniqueAction(actions, "revise_artifact");
  }
}

function reviewRuntimeEvidence(
  verification: LaunchPacketVerificationEvidence,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (verification.runtimeStderr === "unresolved") {
    findings.push({
      key: "unclassified-runtime-stderr",
      title: "Runtime stderr is unclassified",
      summary:
        "The packet records stderr from the reviewer runtime without explaining whether it is expected, harmless, or blocking.",
      severity: "medium",
      recommendation:
        "Record the stderr interpretation and rerun evidence, or classify the packet as blocked if the warning may affect review output.",
    });
    addUniqueAction(actions, "rerun_review");
    addUniqueAction(actions, "request_caller_review");
  }

  if (verification.surfaceBudgetChecked === false) {
    findings.push({
      key: "missing-surface-budget-check",
      title: "Agent-surface budget check is missing",
      summary:
        "The packet changed a review surface without recording the pre-edit or changed-file surface-budget check.",
      severity: "medium",
      recommendation:
        "Run the repo-local agent-surface guard for the touched files, or record why the change is not code-surface work.",
    });
    addUniqueAction(actions, "collect_more_evidence");
  }
}

export function reviewVerificationEvidence(
  verification: LaunchPacketVerificationEvidence | undefined,
  findings: StructuredReviewFinding[],
  actions: StructuredReviewNextStepAction[],
): void {
  if (!verification || verification.result === "missing") {
    findings.push({
      key: "missing-verification-evidence",
      title: "Verification evidence is missing",
      summary:
        "The packet does not include a concrete verification result that defends the launch surface.",
      severity: "high",
      recommendation:
        "Run the repo-local validation command or record the exact blocker before launch.",
    });
    addUniqueAction(actions, "collect_more_evidence");
    return;
  }

  reviewTargetedRunEvidence(verification, findings, actions);
  reviewCommandEvidence(verification, findings, actions);
  reviewFailedRunEvidence(verification, findings, actions);
  reviewRuntimeEvidence(verification, findings, actions);
}
