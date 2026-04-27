import type {
  StructuredReviewFinding,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";

export const LAUNCH_PACKET_EVIDENCE_SUFFICIENCY_REVIEW_SCHEMA =
  "launch_packet_evidence_sufficiency_review_v1";

export type LaunchPacketEvidenceStatus =
  | "confirmed"
  | "missing"
  | "hint_only"
  | "stale";

export interface LaunchPacketEvidenceReference {
  label: string;
  status: LaunchPacketEvidenceStatus;
  handle?: string;
  required?: boolean;
}

export interface LaunchPacketAdoptionEvidence {
  status?: "adopted" | "rejected" | "not_applicable" | "missing";
  scoutCommand?: string;
  evidenceHandle?: string;
  rationale?: string;
}

export interface LaunchPacketVerificationEvidence {
  claimedCommand?: string;
  observedCommand?: string;
  result?: "passed" | "failed" | "missing";
  targetedRun?: boolean;
  fixturePassFailLog?: "complete" | "partial" | "missing";
  repeatedFailedCommandCount?: number;
  runtimeStderr?: "none" | "acknowledged" | "unresolved";
  surfaceBudgetChecked?: boolean;
  surfaceBudgetCommand?: string;
}

export interface LaunchPacketOutcomeEvidence {
  expectedPath?: string;
  generatedPath?: boolean;
  statusChecked?: boolean;
}

export interface LaunchPacketSourceAuditEvidence {
  status?: "complete" | "missing_paths" | "unresolved_paths" | "not_applicable";
  inspectedSourceHandles?: ReadonlyArray<string>;
  missingPathCount?: number;
  unresolvedPathCount?: number;
  retrievalNoteProvided?: boolean;
  decisiveEvidenceTruncated?: boolean;
  rationale?: string;
}

export interface LaunchPacketEvidenceBudgetEvidence {
  status?: "satisfied" | "missing" | "exceeded" | "not_applicable";
  budgetName?: string;
  rationale?: string;
}

export interface LaunchPacketBoundaryEvidence {
  outputClassification?: string;
  privateDetailsIncluded?: boolean;
  trackerFreshnessRequired?: boolean;
  trackerFreshnessConfirmed?: boolean;
}

export interface LaunchPacketEvidenceSufficiencyInput {
  packetId: string;
  title: string;
  evidence: ReadonlyArray<LaunchPacketEvidenceReference>;
  adoption?: LaunchPacketAdoptionEvidence;
  verification?: LaunchPacketVerificationEvidence;
  outcome?: LaunchPacketOutcomeEvidence;
  sourceAudit?: LaunchPacketSourceAuditEvidence;
  evidenceBudget?: LaunchPacketEvidenceBudgetEvidence;
  boundary?: LaunchPacketBoundaryEvidence;
}

export interface LaunchPacketEvidenceSufficiencyReview {
  schema: typeof LAUNCH_PACKET_EVIDENCE_SUFFICIENCY_REVIEW_SCHEMA;
  packetId: string;
  verdict: "sufficient" | "insufficient" | "needs_caller_review";
  confidence: "low" | "medium" | "high";
  maxSeverity: StructuredReviewSeverity;
  summary: string;
  findings: StructuredReviewFinding[];
  nextStepActions: StructuredReviewNextStepAction[];
}
