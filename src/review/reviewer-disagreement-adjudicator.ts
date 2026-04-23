import * as fs from "node:fs/promises";
import type {
  StructuredReviewFindingComparison,
  StructuredReviewFindingSnapshot,
  StructuredReviewResultComparison,
} from "./review-result-comparison.js";
import { compareStructuredReviewResults } from "./review-result-comparison.js";
import { parseStructuredReviewResult, type StructuredReviewSeverity } from "../contracts/json-contracts.js";
import { resolveFromCwd } from "../shared/io.js";
import {
  sanitizeReviewSurfaceValue,
  type ReviewSurfaceRedactions,
} from "../shared/review-surface.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

const DISAGREEMENT_PRIORITY: ReviewerDisagreementClass[] = [
  "finding_presence_mismatch",
  "severity_calibration_mismatch",
  "evidence_coverage_mismatch",
  "recommendation_scope_mismatch",
  "rationale_wording_mismatch",
];

const ROOT_CAUSE_PRIORITY: ReviewerDisagreementRootCause[] = [
  "issue_detection_gap",
  "severity_calibration_gap",
  "evidence_traceability_gap",
  "recommendation_scope_gap",
  "wording_normalization_gap",
];

export type ReviewerDisagreementClass =
  | "finding_presence_mismatch"
  | "severity_calibration_mismatch"
  | "evidence_coverage_mismatch"
  | "recommendation_scope_mismatch"
  | "rationale_wording_mismatch";

export type ReviewerDisagreementRootCause =
  | "issue_detection_gap"
  | "severity_calibration_gap"
  | "evidence_traceability_gap"
  | "recommendation_scope_gap"
  | "wording_normalization_gap";

export interface ReviewerDisagreementFinding {
  key: string;
  title: string;
  disagreementClasses: ReviewerDisagreementClass[];
  likelyRootCauses: ReviewerDisagreementRootCause[];
  sponsorTieBreakSummary: string;
  left?: StructuredReviewFindingSnapshot;
  right?: StructuredReviewFindingSnapshot;
}

export interface ReviewerDisagreementAdjudication {
  overallSeverityAlignment: "aligned" | "mixed";
  stableAgreementCount: number;
  counts: {
    disagreements: number;
    byClass: Record<ReviewerDisagreementClass, number>;
    byLikelyRootCause: Record<ReviewerDisagreementRootCause, number>;
  };
  disagreements: ReviewerDisagreementFinding[];
}

export interface ReviewerDisagreementArtifactInput {
  pathLabel: string;
}

export interface ReviewerDisagreementAdjudicationReport {
  inputs: {
    left: ReviewerDisagreementArtifactInput;
    right: ReviewerDisagreementArtifactInput;
  };
  comparison: StructuredReviewResultComparison;
  adjudication: ReviewerDisagreementAdjudication;
}

export interface FormatReviewerDisagreementAdjudicationOptions {
  title?: string;
  leftLabel?: string;
  rightLabel?: string;
  maxDisagreementNotes?: number;
  maxStableAgreementNotes?: number;
  includeStableAgreementSample?: boolean;
  extraRedactions?: ReviewSurfaceRedactions;
}

function createDisagreementClassCounts(): Record<ReviewerDisagreementClass, number> {
  return {
    finding_presence_mismatch: 0,
    severity_calibration_mismatch: 0,
    evidence_coverage_mismatch: 0,
    recommendation_scope_mismatch: 0,
    rationale_wording_mismatch: 0,
  };
}

function createRootCauseCounts(): Record<ReviewerDisagreementRootCause, number> {
  return {
    issue_detection_gap: 0,
    severity_calibration_gap: 0,
    evidence_traceability_gap: 0,
    recommendation_scope_gap: 0,
    wording_normalization_gap: 0,
  };
}

function compareSeverity(
  left: StructuredReviewSeverity,
  right: StructuredReviewSeverity,
): number {
  return REVIEW_SEVERITY_ORDER.indexOf(left) - REVIEW_SEVERITY_ORDER.indexOf(right);
}

function dedupeOrdered<T extends string>(values: T[], order: T[]): T[] {
  return order.filter((value) => values.includes(value));
}

function formatPresenceTieBreakSummary(title: string): string {
  return `Check whether both reviewers inspected the same evidence scope for ${title}; if the issue stands, keep one stable generic finding key instead of treating it as separate work.`;
}

function formatChangedTieBreakSummary(
  title: string,
  disagreementClasses: ReviewerDisagreementClass[],
  comparison: StructuredReviewFindingComparison,
): string {
  const notes: string[] = [];

  if (disagreementClasses.includes("severity_calibration_mismatch")) {
    const moreSevereSide =
      compareSeverity(comparison.before.severity, comparison.after.severity) <= 0
        ? "left reviewer"
        : "right reviewer";
    notes.push(
      `Use the ${moreSevereSide} as the sponsor-facing default severity for ${title} until the evidence justifies lowering it.`,
    );
  }

  if (disagreementClasses.includes("evidence_coverage_mismatch")) {
    notes.push(
      `Ask which evidence labels actually support ${title} before accepting or dismissing the disagreement.`,
    );
  }

  if (disagreementClasses.includes("recommendation_scope_mismatch")) {
    notes.push(
      `Prefer the narrower reversible recommendation for ${title} until the caller chooses a stronger action.`,
    );
  }

  if (
    disagreementClasses.length === 1 &&
    disagreementClasses.includes("rationale_wording_mismatch")
  ) {
    notes.push(
      `Normalize the wording for ${title}; do not create separate follow-up work unless the underlying evidence also differs.`,
    );
  } else if (disagreementClasses.includes("rationale_wording_mismatch")) {
    notes.push(
      `After resolving the material differences, normalize the wording for ${title} so later runs do not create avoidable churn.`,
    );
  }

  return notes.join(" ");
}

function classifyChangedFinding(
  finding: StructuredReviewFindingComparison,
): ReviewerDisagreementFinding {
  const disagreementClasses: ReviewerDisagreementClass[] = [];
  const likelyRootCauses: ReviewerDisagreementRootCause[] = [];

  if (finding.changedFields.includes("severity")) {
    disagreementClasses.push("severity_calibration_mismatch");
    likelyRootCauses.push("severity_calibration_gap");
  }

  if (finding.changedFields.includes("evidence")) {
    disagreementClasses.push("evidence_coverage_mismatch");
    likelyRootCauses.push("evidence_traceability_gap");
  }

  if (finding.changedFields.includes("recommendation")) {
    disagreementClasses.push("recommendation_scope_mismatch");
    likelyRootCauses.push("recommendation_scope_gap");
  }

  if (
    finding.changedFields.includes("title") ||
    finding.changedFields.includes("summary")
  ) {
    disagreementClasses.push("rationale_wording_mismatch");
    likelyRootCauses.push("wording_normalization_gap");
  }

  const orderedClasses = dedupeOrdered(disagreementClasses, DISAGREEMENT_PRIORITY);
  const orderedRootCauses = dedupeOrdered(likelyRootCauses, ROOT_CAUSE_PRIORITY);

  return {
    key: finding.key,
    title: finding.title,
    disagreementClasses: orderedClasses,
    likelyRootCauses: orderedRootCauses,
    sponsorTieBreakSummary: formatChangedTieBreakSummary(
      finding.title,
      orderedClasses,
      finding,
    ),
    left: finding.before,
    right: finding.after,
  };
}

function classifyPresenceMismatch(input: {
  finding: StructuredReviewFindingSnapshot;
  side: "left" | "right";
}): ReviewerDisagreementFinding {
  return {
    key: input.finding.key,
    title: input.finding.title,
    disagreementClasses: ["finding_presence_mismatch"],
    likelyRootCauses: ["issue_detection_gap"],
    sponsorTieBreakSummary: formatPresenceTieBreakSummary(input.finding.title),
    left: input.side === "left" ? input.finding : undefined,
    right: input.side === "right" ? input.finding : undefined,
  };
}

function compareDisagreementFindings(
  left: ReviewerDisagreementFinding,
  right: ReviewerDisagreementFinding,
): number {
  const leftPriority = Math.min(
    ...left.disagreementClasses.map((item) => DISAGREEMENT_PRIORITY.indexOf(item)),
  );
  const rightPriority = Math.min(
    ...right.disagreementClasses.map((item) => DISAGREEMENT_PRIORITY.indexOf(item)),
  );

  return (
    leftPriority - rightPriority ||
    left.title.localeCompare(right.title) ||
    left.key.localeCompare(right.key)
  );
}

export function adjudicateReviewerDisagreement(input: {
  left: ReturnType<typeof parseStructuredReviewResult>;
  right: ReturnType<typeof parseStructuredReviewResult>;
}): ReviewerDisagreementAdjudication {
  const comparison = compareStructuredReviewResults({
    before: input.left,
    after: input.right,
  });
  const disagreements = [
    ...comparison.changed.map(classifyChangedFinding),
    ...comparison.removed.map((finding) =>
      classifyPresenceMismatch({ finding, side: "left" }),
    ),
    ...comparison.added.map((finding) =>
      classifyPresenceMismatch({ finding, side: "right" }),
    ),
  ].sort(compareDisagreementFindings);
  const byClass = createDisagreementClassCounts();
  const byLikelyRootCause = createRootCauseCounts();

  for (const disagreement of disagreements) {
    for (const item of disagreement.disagreementClasses) {
      byClass[item] += 1;
    }

    for (const item of disagreement.likelyRootCauses) {
      byLikelyRootCause[item] += 1;
    }
  }

  return {
    overallSeverityAlignment:
      comparison.overallSeverityChange.direction === "unchanged" ? "aligned" : "mixed",
    stableAgreementCount: comparison.unchanged.length,
    counts: {
      disagreements: disagreements.length,
      byClass,
      byLikelyRootCause,
    },
    disagreements,
  };
}

function sanitizeLabel(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 4000,
    extraRedactions,
  });
}

function formatSnapshot(
  sideLabel: string,
  finding: StructuredReviewFindingSnapshot,
): string {
  return `${sideLabel}: severity=${finding.severity}; summary=${finding.summary}`;
}

function formatClassList(values: string[]): string {
  return values.join(", ");
}

function formatCountList<T extends string>(
  counts: Record<T, number>,
  order: T[],
): string {
  return order.map((item) => `${item}=${counts[item]}`).join(", ");
}

function formatDisagreementNote(
  disagreement: ReviewerDisagreementFinding,
  leftLabel: string,
  rightLabel: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const title = sanitizeLabel(disagreement.title, extraRedactions);
  const noteLines = [
    `- \`${title}\`: classes=${formatClassList(disagreement.disagreementClasses)}; likely_root_causes=${formatClassList(disagreement.likelyRootCauses)}.`,
    `  Tie-break: ${sanitizeLabel(disagreement.sponsorTieBreakSummary, extraRedactions)}`,
  ];

  if (disagreement.left) {
    noteLines.push(
      `  ${formatSnapshot(leftLabel, disagreement.left)}`,
    );
  }

  if (disagreement.right) {
    noteLines.push(
      `  ${formatSnapshot(rightLabel, disagreement.right)}`,
    );
  }

  return noteLines.join("\n");
}

function formatStableAgreementNote(
  finding: StructuredReviewFindingComparison,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return `- \`${sanitizeLabel(finding.title, extraRedactions)}\`: severity=${finding.after.severity}; summary aligned.`;
}

export function formatReviewerDisagreementAdjudication(
  report: ReviewerDisagreementAdjudicationReport,
  options: FormatReviewerDisagreementAdjudicationOptions = {},
): string {
  const title = options.title ?? "Reviewer Disagreement Adjudication";
  const leftLabel = options.leftLabel ?? "Left reviewer";
  const rightLabel = options.rightLabel ?? "Right reviewer";
  const maxDisagreementNotes = options.maxDisagreementNotes ?? 6;
  const maxStableAgreementNotes = options.maxStableAgreementNotes ?? 3;
  const disagreementNotes = report.adjudication.disagreements.slice(
    0,
    maxDisagreementNotes,
  );
  const omittedDisagreements =
    report.adjudication.disagreements.length - disagreementNotes.length;
  const stableAgreementNotes = options.includeStableAgreementSample
    ? report.comparison.unchanged
        .slice(0, maxStableAgreementNotes)
        .map((finding) =>
          formatStableAgreementNote(finding, options.extraRedactions),
        )
    : [];
  const omittedStableAgreements =
    report.comparison.unchanged.length - stableAgreementNotes.length;
  const lines = [
    `# ${title}`,
    "",
    "This note summarizes disagreement between two sanitized AIQL structured review results for one caller-owned tie-break pass. It does not decide approval, routing, or remediation ownership.",
    "",
    "## Inputs",
    "",
    `- ${leftLabel}: ${report.inputs.left.pathLabel}`,
    `- ${rightLabel}: ${report.inputs.right.pathLabel}`,
    "",
    "## Disagreement Snapshot",
    "",
    `- Overall severity alignment: ${report.adjudication.overallSeverityAlignment} (${report.comparison.overallSeverityChange.before} -> ${report.comparison.overallSeverityChange.after}, ${report.comparison.overallSeverityChange.direction}).`,
    `- Findings compared: matched=${report.comparison.counts.changed + report.comparison.counts.unchanged}; disagreements=${report.adjudication.counts.disagreements}; stable_agreements=${report.adjudication.stableAgreementCount}.`,
    `- Disagreement classes: ${formatCountList(report.adjudication.counts.byClass, DISAGREEMENT_PRIORITY)}.`,
    `- Likely root causes: ${formatCountList(report.adjudication.counts.byLikelyRootCause, ROOT_CAUSE_PRIORITY)}.`,
    "",
    "## Priority Tie-Breaks",
    "",
    ...(disagreementNotes.length > 0
      ? disagreementNotes.map((note) =>
          formatDisagreementNote(
            note,
            leftLabel,
            rightLabel,
            options.extraRedactions,
          ),
        )
      : ["- No disagreement notes were derived from the two structured review results."]),
    ...(omittedDisagreements > 0
      ? [
          `- ${omittedDisagreements} additional disagreement entr${
            omittedDisagreements === 1 ? "y was" : "ies were"
          } omitted by the note limit.`,
        ]
      : []),
    "",
    "## Stable Agreement",
    "",
    ...(options.includeStableAgreementSample
      ? stableAgreementNotes.length > 0
        ? stableAgreementNotes
        : ["- No stable-agreement sample was included."]
      : ["- Stable agreements are summarized only by count; set includeStableAgreementSample when a caller needs examples."]),
    ...(options.includeStableAgreementSample && omittedStableAgreements > 0
      ? [
          `- ${omittedStableAgreements} additional stable entr${
            omittedStableAgreements === 1 ? "y was" : "ies were"
          } omitted by the sample limit.`,
        ]
      : []),
    "",
    "## Boundary",
    "",
    "AIQL can compare two published structured review results and format a caller-owned adjudication note. Reviewer assignment, approval thresholds, tracker writes, remediation routing, and private source interpretation remain outside the shared package surface.",
  ];

  return `${lines.join("\n")}\n`;
}

async function loadStructuredReviewResultArtifact(
  artifactPath: string,
  cwd = process.cwd(),
): Promise<{
  pathLabel: string;
  result: ReturnType<typeof parseStructuredReviewResult>;
}> {
  const resolvedPath = resolveFromCwd(artifactPath, cwd);
  const rawResult = await fs.readFile(resolvedPath, "utf-8");

  return {
    pathLabel: sanitizeReviewSurfaceValue(resolvedPath),
    result: parseStructuredReviewResult(JSON.parse(rawResult) as unknown),
  };
}

export async function runReviewerDisagreementAdjudication(input: {
  leftPath: string;
  rightPath: string;
  cwd?: string;
}): Promise<ReviewerDisagreementAdjudicationReport> {
  const cwd = input.cwd || process.cwd();
  const [left, right] = await Promise.all([
    loadStructuredReviewResultArtifact(input.leftPath, cwd),
    loadStructuredReviewResultArtifact(input.rightPath, cwd),
  ]);
  const comparison = compareStructuredReviewResults({
    before: left.result,
    after: right.result,
  });

  return {
    inputs: {
      left: { pathLabel: left.pathLabel },
      right: { pathLabel: right.pathLabel },
    },
    comparison,
    adjudication: adjudicateReviewerDisagreement({
      left: left.result,
      right: right.result,
    }),
  };
}
