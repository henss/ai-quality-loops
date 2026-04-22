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

export interface FormatMultiModelDisagreementReportOptions {
  title?: string;
  baselineLabel?: string;
  candidateLabel?: string;
  maxDisagreementNotes?: number;
  includeStableAgreementSample?: boolean;
  maxStableAgreementNotes?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

function formatSeverityCountDelta(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function sanitizeLabel(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
    extraRedactions,
  });
}

function formatChangedEntry(
  comparison: BatchReviewSummaryEntryComparison,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const label = sanitizeLabel(comparison.resultKey, extraRedactions);
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

function formatSnapshot(
  prefix: "Only in candidate" | "Only in baseline",
  snapshot: BatchReviewSummaryEntrySnapshot,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const label = sanitizeLabel(snapshot.resultKey, extraRedactions);
  const structuredSummary = snapshot.structuredResult
    ? `severity=${snapshot.structuredResult.overallSeverity}; findings=${snapshot.structuredResult.totalFindings}`
    : "structured severity unavailable";

  return `- ${prefix} \`${label}\`: status=${snapshot.status}; mode=${snapshot.mode}; ${structuredSummary}.`;
}

function buildPriorityDisagreements(
  changed: BatchReviewSummaryEntryComparison[],
): BatchReviewSummaryEntryComparison[] {
  return changed.filter(
    (entry) =>
      entry.statusChange.changed ||
      entry.severityChange.direction === "regressed" ||
      entry.severityChange.direction === "unavailable",
  );
}

function buildSecondaryDisagreements(
  changed: BatchReviewSummaryEntryComparison[],
): BatchReviewSummaryEntryComparison[] {
  return changed.filter(
    (entry) =>
      !entry.statusChange.changed &&
      entry.severityChange.direction !== "regressed" &&
      entry.severityChange.direction !== "unavailable",
  );
}

function buildDisagreementUncertainties(
  report: BatchReviewSummaryComparisonReport,
): string[] {
  const uncertainties: string[] = [];
  const { comparison } = report;

  if (comparison.counts.severityMovement.unavailable > 0) {
    uncertainties.push(
      `${comparison.counts.severityMovement.unavailable} matched entr${
        comparison.counts.severityMovement.unavailable === 1 ? "y has" : "ies have"
      } unavailable severity movement, so disagreement severity is only partially observed.`,
    );
  }

  if ((comparison.counts.promptEvalCountUnavailable ?? 0) > 0) {
    uncertainties.push(
      `${comparison.counts.promptEvalCountUnavailable ?? 0} entr${
        (comparison.counts.promptEvalCountUnavailable ?? 0) === 1
          ? "y lacks"
          : "ies lack"
      } prompt-eval telemetry, so cost deltas are incomplete.`,
    );
  }

  uncertainties.push(
    "This template highlights disagreement signals only; caller-owned triage still decides acceptance, routing, thresholds, and follow-up.",
  );

  return uncertainties;
}

export function formatMultiModelDisagreementReport(
  report: BatchReviewSummaryComparisonReport,
  options: FormatMultiModelDisagreementReportOptions = {},
): string {
  const title = options.title || "Multi-Model Disagreement Report";
  const baselineLabel = options.baselineLabel || "Baseline cohort";
  const candidateLabel = options.candidateLabel || "Candidate cohort";
  const maxDisagreementNotes = options.maxDisagreementNotes ?? 8;
  const maxStableAgreementNotes = options.maxStableAgreementNotes ?? 3;
  const { comparison } = report;
  const priorityDisagreements = buildPriorityDisagreements(comparison.changed);
  const secondaryDisagreements = buildSecondaryDisagreements(comparison.changed);
  const otherDifferenceNotes = [
    ...secondaryDisagreements.map((entry) =>
      formatChangedEntry(entry, options.extraRedactions),
    ),
    ...comparison.added.map((entry) =>
      formatSnapshot("Only in candidate", entry, options.extraRedactions),
    ),
    ...comparison.removed.map((entry) =>
      formatSnapshot("Only in baseline", entry, options.extraRedactions),
    ),
  ].slice(0, maxDisagreementNotes);
  const stableAgreementNotes = options.includeStableAgreementSample
    ? comparison.unchanged
        .slice(0, maxStableAgreementNotes)
        .map((entry) => formatChangedEntry(entry, options.extraRedactions))
    : [];
  const omittedDisagreements =
    secondaryDisagreements.length +
    comparison.added.length +
    comparison.removed.length -
    otherDifferenceNotes.length;
  const omittedStableAgreements =
    comparison.unchanged.length - stableAgreementNotes.length;
  const lines = [
    `# ${title}`,
    "",
    "This report is generated from sanitized AIQL batch-summary comparison data. It is a caller-owned triage template for model-cohort disagreement, not an approval or routing decision.",
    "",
    "## Inputs",
    "",
    `- ${baselineLabel}: ${report.inputs.before.pathLabel}`,
    `- ${candidateLabel}: ${report.inputs.after.pathLabel}`,
    "",
    "## Disagreement Snapshot",
    "",
    `- Compared entries: matched=${comparison.counts.matched}; changed=${comparison.changed.length}; unchanged=${comparison.unchanged.length}.`,
    `- Cohort-only entries: candidate-only=${comparison.counts.added}; baseline-only=${comparison.counts.removed}.`,
    [
      "- Severity movement across matched entries:",
      `improved=${comparison.counts.severityMovement.improved},`,
      `regressed=${comparison.counts.severityMovement.regressed},`,
      `unchanged=${comparison.counts.severityMovement.unchanged},`,
      `unavailable=${comparison.counts.severityMovement.unavailable}.`,
    ].join(" "),
    `- Finding count delta: total=${comparison.counts.totalFindingsDelta}; ${formatSeverityCountDelta(comparison.counts.findingCountDelta)}.`,
    `- Prompt eval delta: total=${comparison.counts.promptEvalCountDelta ?? 0}; added=${comparison.counts.addedPromptEvalCount ?? 0}; unavailable=${comparison.counts.promptEvalCountUnavailable ?? 0}.`,
    "",
    "## Priority Disagreements",
    "",
    ...(priorityDisagreements.length > 0
      ? priorityDisagreements
          .slice(0, maxDisagreementNotes)
          .map((entry) => formatChangedEntry(entry, options.extraRedactions))
      : ["- No priority disagreements were found."]),
    "",
    "## Other Differences",
    "",
    ...(secondaryDisagreements.length > 0 || comparison.added.length > 0 || comparison.removed.length > 0
      ? otherDifferenceNotes
      : ["- No additional disagreement notes were found beyond the priority section."]),
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
      : ["- Stable matched entries are summarized only by count; set includeStableAgreementSample when a caller needs examples."]),
    ...(options.includeStableAgreementSample && omittedStableAgreements > 0
      ? [
          `- ${omittedStableAgreements} additional stable entr${
            omittedStableAgreements === 1 ? "y was" : "ies were"
          } omitted by the sample limit.`,
        ]
      : []),
    "",
    "## Uncertainties",
    "",
    ...buildDisagreementUncertainties(report).map(
      (uncertainty) => `- ${uncertainty}`,
    ),
    "",
    "## Boundary",
    "",
    "This template assumes disagreement is expressed through two comparable published batch summaries. If a workflow needs same-run multi-model arbitration, reviewer clustering, or approval policy, keep that domain-specific layer outside AIQL or promote it only after a separate generic-boundary decision.",
  ];

  return lines.join("\n");
}
