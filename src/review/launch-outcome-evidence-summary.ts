import type {
  BatchReviewSummaryComparisonReport,
  BatchReviewSummaryEntryComparison,
  BatchReviewSummaryEntrySnapshot,
} from "../contracts/batch-review-summary-comparison-contract.js";
import type { StructuredReviewSeverity } from "../contracts/json-contracts.js";
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

export interface LaunchOutcomeEvidenceGateSummary {
  ok: boolean;
  summary?: string;
}

export interface FormatLaunchOutcomeEvidenceSummaryOptions {
  title?: string;
  gate?: LaunchOutcomeEvidenceGateSummary;
  maxEvidenceNotes?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

function formatSeverityCountDelta(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function sanitizeEvidenceLabel(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
    extraRedactions,
  });
}

function formatGateSignal(gate?: LaunchOutcomeEvidenceGateSummary): string {
  if (!gate) {
    return "not provided; caller-owned thresholds were not included.";
  }

  const status = gate.ok ? "pass" : "fail";
  return gate.summary ? `${status} (${gate.summary})` : status;
}

function formatEvidenceNote(
  comparison: BatchReviewSummaryEntryComparison,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const label = sanitizeEvidenceLabel(comparison.resultKey, extraRedactions);
  const status = comparison.statusChange.changed
    ? `status ${comparison.statusChange.before}->${comparison.statusChange.after}`
    : "status unchanged";
  const severity =
    comparison.severityChange.direction === "unavailable"
      ? "severity unavailable"
      : `severity ${comparison.severityChange.before}->${comparison.severityChange.after} (${comparison.severityChange.direction})`;
  const findings =
    comparison.totalFindingsDelta === undefined
      ? "findings unavailable"
      : `findings delta=${comparison.totalFindingsDelta}`;

  return `- \`${label}\`: ${status}; ${severity}; ${findings}.`;
}

function formatSnapshotEvidenceNote(
  prefix: "Added" | "Removed",
  snapshot: BatchReviewSummaryEntrySnapshot,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const label = sanitizeEvidenceLabel(snapshot.resultKey, extraRedactions);
  const severity = snapshot.structuredResult
    ? `; severity=${snapshot.structuredResult.overallSeverity}; findings=${snapshot.structuredResult.totalFindings}`
    : "; structured severity unavailable";

  return `- ${prefix} \`${label}\`: status=${snapshot.status}; mode=${snapshot.mode}${severity}.`;
}

function buildLaunchOutcomeUncertainties(
  report: BatchReviewSummaryComparisonReport,
  gate?: LaunchOutcomeEvidenceGateSummary,
): string[] {
  const uncertainties: string[] = [];
  const { comparison } = report;

  if (comparison.counts.severityMovement.unavailable > 0) {
    uncertainties.push(
      `${comparison.counts.severityMovement.unavailable} matched entr${
        comparison.counts.severityMovement.unavailable === 1 ? "y has" : "ies have"
      } unavailable severity movement, so aggregate movement is incomplete.`,
    );
  }

  if (comparison.counts.severityMovement.regressed > 0) {
    uncertainties.push(
      `${comparison.counts.severityMovement.regressed} matched entr${
        comparison.counts.severityMovement.regressed === 1 ? "y regressed" : "ies regressed"
      } in severity and needs caller-owned interpretation.`,
    );
  }

  if (comparison.added.some((entry) => !entry.structuredResult)) {
    uncertainties.push(
      "At least one added entry lacks a structured rollup, so new review risk cannot be fully summarized.",
    );
  }

  if (!gate) {
    uncertainties.push(
      "No gate report was supplied, so this summary does not claim threshold pass/fail evidence.",
    );
  }

  uncertainties.push(
    "This summary does not decide launch readiness, publish tracker comments, or route follow-up work.",
  );

  return uncertainties;
}

export function formatLaunchOutcomeEvidenceSummary(
  report: BatchReviewSummaryComparisonReport,
  options: FormatLaunchOutcomeEvidenceSummaryOptions = {},
): string {
  const { comparison } = report;
  const title = options.title || "Launch-Outcome Evidence Summary";
  const maxEvidenceNotes = options.maxEvidenceNotes ?? 6;
  const changedNotes = comparison.changed
    .slice(0, maxEvidenceNotes)
    .map((entry) => formatEvidenceNote(entry, options.extraRedactions));
  const remainingNoteBudget = Math.max(0, maxEvidenceNotes - changedNotes.length);
  const addedRemovedNotes = [
    ...comparison.added.map((entry) =>
      formatSnapshotEvidenceNote("Added", entry, options.extraRedactions),
    ),
    ...comparison.removed.map((entry) =>
      formatSnapshotEvidenceNote("Removed", entry, options.extraRedactions),
    ),
  ].slice(0, remainingNoteBudget);
  const evidenceNotes = [...changedNotes, ...addedRemovedNotes];
  const omittedNotes =
    comparison.changed.length + comparison.added.length + comparison.removed.length -
    evidenceNotes.length;
  const uncertainties = buildLaunchOutcomeUncertainties(report, options.gate);
  const lines = [
    `# ${title}`,
    "",
    "This summary is generated from sanitized AIQL review artifacts. It is evidence for a caller-owned launch outcome note, not a launch-readiness decision.",
    "",
    "## Inputs",
    "",
    `- Previous review artifact: ${report.inputs.before.pathLabel}`,
    `- Current review artifact: ${report.inputs.after.pathLabel}`,
    "",
    "## Material Signals",
    "",
    [
      "- Entries:",
      `before=${comparison.counts.beforeEntries},`,
      `after=${comparison.counts.afterEntries},`,
      `matched=${comparison.counts.matched},`,
      `added=${comparison.counts.added},`,
      `removed=${comparison.counts.removed},`,
      `statusChanged=${comparison.counts.statusChanged}.`,
    ].join(" "),
    [
      "- Severity movement among matched entries:",
      `improved=${comparison.counts.severityMovement.improved},`,
      `regressed=${comparison.counts.severityMovement.regressed},`,
      `unchanged=${comparison.counts.severityMovement.unchanged},`,
      `unavailable=${comparison.counts.severityMovement.unavailable}.`,
    ].join(" "),
    `- Finding count delta: total=${comparison.counts.totalFindingsDelta}; ${formatSeverityCountDelta(comparison.counts.findingCountDelta)}.`,
    `- Gate result: ${formatGateSignal(options.gate)}`,
    "",
    "## Evidence Notes",
    "",
    ...(evidenceNotes.length > 0 ? evidenceNotes : ["- No changed, added, or removed entries were found."]),
    ...(omittedNotes > 0
      ? [
          `- ${omittedNotes} additional entr${
            omittedNotes === 1 ? "y was" : "ies were"
          } omitted by the evidence-note limit.`,
        ]
      : []),
    "",
    "## Uncertainties",
    "",
    ...uncertainties.map((uncertainty) => `- ${uncertainty}`),
    "",
    "## Boundary",
    "",
    "AIQL can summarize sanitized review comparisons and optional gate evidence. The embedding workflow owns real source selection, launch definition, approval authority, decision labels, tracker writes, and downstream action.",
  ];

  return lines.join("\n");
}
