import {
  type BatchReviewArtifactResult,
  type BatchReviewArtifactSummary,
  type BatchReviewStructuredResultSummary,
  type StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import {
  type BatchReviewSummaryComparison,
  type BatchReviewSummaryComparisonReport,
  type BatchReviewSummaryEntryComparison,
  type BatchReviewSummaryEntrySnapshot,
  type BatchReviewReviewerConfidenceCalibrationDelta,
  type BatchReviewReviewerConfidenceCalibrationSnapshot,
  type BatchReviewReviewerConfidenceCounts,
  type BatchReviewSummarySeverityDirection,
} from "../contracts/batch-review-summary-comparison-contract.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";
import { loadBatchReviewArtifactSummary } from "./batch-review-artifacts.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export type {
  BatchReviewSummaryComparison,
  BatchReviewSummaryComparisonReport,
  BatchReviewSummaryEntryComparison,
  BatchReviewSummaryEntrySnapshot,
  BatchReviewReviewerConfidenceCalibrationDelta,
  BatchReviewReviewerConfidenceCalibrationSnapshot,
  BatchReviewReviewerConfidenceCounts,
  BatchReviewSummarySeverityDirection,
};

function createEmptySeverityCounts(): Record<StructuredReviewSeverity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
}

function createEmptyConfidenceCounts(): BatchReviewReviewerConfidenceCounts {
  return {
    low: 0,
    medium: 0,
    high: 0,
  };
}

function createEmptyCalibrationSnapshot(): BatchReviewReviewerConfidenceCalibrationSnapshot {
  return {
    decisionsWithConfidence: 0,
    acceptedDecisions: 0,
    rejectedDecisions: 0,
    acceptedFindings: 0,
    rejectedFindings: 0,
    acceptedConfidence: createEmptyConfidenceCounts(),
    rejectedConfidence: createEmptyConfidenceCounts(),
  };
}

function createCalibrationDelta(
  before: BatchReviewReviewerConfidenceCalibrationSnapshot,
  after: BatchReviewReviewerConfidenceCalibrationSnapshot,
): BatchReviewReviewerConfidenceCalibrationDelta {
  return {
    decisionsWithConfidence:
      after.decisionsWithConfidence - before.decisionsWithConfidence,
    acceptedDecisions: after.acceptedDecisions - before.acceptedDecisions,
    rejectedDecisions: after.rejectedDecisions - before.rejectedDecisions,
    acceptedFindings: after.acceptedFindings - before.acceptedFindings,
    rejectedFindings: after.rejectedFindings - before.rejectedFindings,
    acceptedConfidence: {
      low: after.acceptedConfidence.low - before.acceptedConfidence.low,
      medium:
        after.acceptedConfidence.medium - before.acceptedConfidence.medium,
      high: after.acceptedConfidence.high - before.acceptedConfidence.high,
    },
    rejectedConfidence: {
      low: after.rejectedConfidence.low - before.rejectedConfidence.low,
      medium:
        after.rejectedConfidence.medium - before.rejectedConfidence.medium,
      high: after.rejectedConfidence.high - before.rejectedConfidence.high,
    },
  };
}

function summarizeReviewerConfidenceCalibration(
  summary: BatchReviewArtifactSummary,
): BatchReviewReviewerConfidenceCalibrationSnapshot {
  const snapshot = createEmptyCalibrationSnapshot();

  for (const result of summary.results) {
    const decision = result.structuredResult?.decision;
    if (!decision) {
      continue;
    }

    snapshot.decisionsWithConfidence += 1;
    const accepted = decision.acceptedFindings > 0 || decision.verdict === "accept" || decision.verdict === "accept_with_follow_up";
    const target = accepted
      ? snapshot.acceptedConfidence
      : snapshot.rejectedConfidence;
    target[decision.confidence] += 1;

    if (accepted) {
      snapshot.acceptedDecisions += 1;
      snapshot.acceptedFindings += decision.acceptedFindings;
    } else {
      snapshot.rejectedDecisions += 1;
      snapshot.rejectedFindings += decision.rejectedFindings;
    }
  }

  return snapshot;
}

function compareSeverityDirection(
  before?: StructuredReviewSeverity,
  after?: StructuredReviewSeverity,
): BatchReviewSummarySeverityDirection {
  if (!before || !after) {
    return "unavailable";
  }

  const beforeRank = REVIEW_SEVERITY_ORDER.indexOf(before);
  const afterRank = REVIEW_SEVERITY_ORDER.indexOf(after);

  if (afterRank < beforeRank) {
    return "regressed";
  }

  if (afterRank > beforeRank) {
    return "improved";
  }

  return "unchanged";
}

function createEntrySnapshot(
  result: BatchReviewArtifactResult,
): BatchReviewSummaryEntrySnapshot {
  return {
    resultKey: result.resultKey,
    index: result.index,
    name: result.name,
    mode: result.mode,
    targetSummary: result.targetSummary,
    status: result.status,
    structuredResult: result.structuredResult,
  };
}

function indexResultsByKey(
  summary: BatchReviewArtifactSummary,
  label: string,
): Map<string, BatchReviewArtifactResult> {
  const results = new Map<string, BatchReviewArtifactResult>();

  for (const result of summary.results) {
    if (results.has(result.resultKey)) {
      throw new Error(
        `Batch summary ${label} contains duplicate resultKey "${result.resultKey}".`,
      );
    }

    results.set(result.resultKey, result);
  }

  return results;
}

function compareFindingCounts(
  before?: BatchReviewStructuredResultSummary,
  after?: BatchReviewStructuredResultSummary,
): Record<StructuredReviewSeverity, number> | undefined {
  if (!before || !after) {
    return undefined;
  }

  const delta = createEmptySeverityCounts();
  for (const severity of REVIEW_SEVERITY_ORDER) {
    delta[severity] = after.findingCounts[severity] - before.findingCounts[severity];
  }

  return delta;
}

function compareMatchedEntry(
  before: BatchReviewArtifactResult,
  after: BatchReviewArtifactResult,
): BatchReviewSummaryEntryComparison {
  const beforeStructured = before.structuredResult;
  const afterStructured = after.structuredResult;

  return {
    resultKey: before.resultKey,
    before: createEntrySnapshot(before),
    after: createEntrySnapshot(after),
    statusChange: {
      before: before.status,
      after: after.status,
      changed: before.status !== after.status,
    },
    severityChange: {
      before: beforeStructured?.overallSeverity,
      after: afterStructured?.overallSeverity,
      direction: compareSeverityDirection(
        beforeStructured?.overallSeverity,
        afterStructured?.overallSeverity,
      ),
    },
    totalFindingsDelta:
      beforeStructured && afterStructured
        ? afterStructured.totalFindings - beforeStructured.totalFindings
        : undefined,
    findingCountDelta: compareFindingCounts(beforeStructured, afterStructured),
  };
}

function sortSnapshots(
  snapshots: BatchReviewSummaryEntrySnapshot[],
): BatchReviewSummaryEntrySnapshot[] {
  return snapshots.sort((left, right) => left.resultKey.localeCompare(right.resultKey) || left.index - right.index);
}

function sortComparisons(
  comparisons: BatchReviewSummaryEntryComparison[],
): BatchReviewSummaryEntryComparison[] {
  return comparisons.sort((left, right) => left.resultKey.localeCompare(right.resultKey));
}

function isChangedEntry(comparison: BatchReviewSummaryEntryComparison): boolean {
  const hasTotalFindingsDelta =
    comparison.totalFindingsDelta !== undefined &&
    comparison.totalFindingsDelta !== 0;
  const hasFindingCountDelta = comparison.findingCountDelta
    ? REVIEW_SEVERITY_ORDER.some(
        (severity) => comparison.findingCountDelta?.[severity] !== 0,
      )
    : false;

  return (
    comparison.statusChange.changed ||
    comparison.severityChange.direction === "improved" ||
    comparison.severityChange.direction === "regressed" ||
    hasTotalFindingsDelta ||
    hasFindingCountDelta
  );
}

export function compareBatchReviewArtifactSummaries(input: {
  before: BatchReviewArtifactSummary;
  after: BatchReviewArtifactSummary;
}): BatchReviewSummaryComparison {
  const beforeResults = indexResultsByKey(input.before, "before");
  const afterResults = indexResultsByKey(input.after, "after");
  const resultKeys = new Set([...beforeResults.keys(), ...afterResults.keys()]);
  const added: BatchReviewSummaryEntrySnapshot[] = [];
  const removed: BatchReviewSummaryEntrySnapshot[] = [];
  const changed: BatchReviewSummaryEntryComparison[] = [];
  const unchanged: BatchReviewSummaryEntryComparison[] = [];
  const findingCountDelta = createEmptySeverityCounts();
  const severityMovement = {
    improved: 0,
    regressed: 0,
    unchanged: 0,
    unavailable: 0,
  } satisfies Record<BatchReviewSummarySeverityDirection, number>;
  let statusChanged = 0;
  let totalFindingsDelta = 0;
  let promptEvalCountDelta = 0;
  let addedPromptEvalCount = 0;
  let promptEvalCountUnavailable = 0;

  const beforeCalibration = summarizeReviewerConfidenceCalibration(input.before);
  const afterCalibration = summarizeReviewerConfidenceCalibration(input.after);

  for (const resultKey of [...resultKeys].sort()) {
    const before = beforeResults.get(resultKey);
    const after = afterResults.get(resultKey);

    if (!before && after) {
      const promptEvalCount = after.ollamaTelemetry?.promptEvalCount;
      if (promptEvalCount === undefined) {
        promptEvalCountUnavailable += 1;
      } else {
        promptEvalCountDelta += promptEvalCount;
        addedPromptEvalCount += promptEvalCount;
      }
      added.push(createEntrySnapshot(after));
      continue;
    }

    if (before && !after) {
      const promptEvalCount = before.ollamaTelemetry?.promptEvalCount;
      if (promptEvalCount === undefined) {
        promptEvalCountUnavailable += 1;
      } else {
        promptEvalCountDelta -= promptEvalCount;
      }
      removed.push(createEntrySnapshot(before));
      continue;
    }

    if (!before || !after) {
      continue;
    }

    const comparison = compareMatchedEntry(before, after);
    severityMovement[comparison.severityChange.direction] += 1;
    if (comparison.statusChange.changed) {
      statusChanged += 1;
    }
    if (comparison.totalFindingsDelta !== undefined) {
      totalFindingsDelta += comparison.totalFindingsDelta;
    }
    const beforePromptEvalCount = before.ollamaTelemetry?.promptEvalCount;
    const afterPromptEvalCount = after.ollamaTelemetry?.promptEvalCount;
    if (
      beforePromptEvalCount === undefined ||
      afterPromptEvalCount === undefined
    ) {
      promptEvalCountUnavailable += 1;
    } else {
      const delta = afterPromptEvalCount - beforePromptEvalCount;
      promptEvalCountDelta += delta;
      addedPromptEvalCount += Math.max(0, delta);
    }
    if (comparison.findingCountDelta) {
      for (const severity of REVIEW_SEVERITY_ORDER) {
        findingCountDelta[severity] += comparison.findingCountDelta[severity];
      }
    }

    if (isChangedEntry(comparison)) {
      changed.push(comparison);
    } else {
      unchanged.push(comparison);
    }
  }

  return {
    counts: {
      beforeEntries: input.before.results.length,
      afterEntries: input.after.results.length,
      added: added.length,
      removed: removed.length,
      matched: resultKeys.size - added.length - removed.length,
      statusChanged,
      severityMovement,
      totalFindingsDelta,
      findingCountDelta,
      promptEvalCountDelta,
      addedPromptEvalCount,
      promptEvalCountUnavailable,
    },
    calibration: {
      before: beforeCalibration,
      after: afterCalibration,
      delta: createCalibrationDelta(beforeCalibration, afterCalibration),
    },
    added: sortSnapshots(added),
    removed: sortSnapshots(removed),
    changed: sortComparisons(changed),
    unchanged: sortComparisons(unchanged),
  };
}

function formatSnapshot(snapshot: BatchReviewSummaryEntrySnapshot): string {
  const name = snapshot.name ? `${snapshot.name}: ` : "";
  const severity = snapshot.structuredResult
    ? `, severity=${snapshot.structuredResult.overallSeverity}, findings=${snapshot.structuredResult.totalFindings}`
    : "";
  return `- [${snapshot.status}] ${snapshot.resultKey} (${name}${snapshot.mode} ${snapshot.targetSummary}${severity})`;
}

function formatChangedEntry(
  comparison: BatchReviewSummaryEntryComparison,
): string {
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

  return `- ${comparison.resultKey}: ${status}; ${severity}; ${findings}`;
}

function formatEntrySection(title: string, lines: string[]): string[] {
  return lines.length === 0 ? [] : [title, ...lines];
}

function formatSeverityCountDelta(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function formatConfidenceCounts(
  counts: BatchReviewReviewerConfidenceCounts,
): string {
  return `low=${counts.low}, medium=${counts.medium}, high=${counts.high}`;
}

function formatCalibrationSnapshot(
  label: string,
  snapshot: BatchReviewReviewerConfidenceCalibrationSnapshot,
): string {
  return [
    `${label}: decisionsWithConfidence=${snapshot.decisionsWithConfidence};`,
    `accepted decisions=${snapshot.acceptedDecisions} (${formatConfidenceCounts(snapshot.acceptedConfidence)}), findings=${snapshot.acceptedFindings};`,
    `rejected decisions=${snapshot.rejectedDecisions} (${formatConfidenceCounts(snapshot.rejectedConfidence)}), findings=${snapshot.rejectedFindings}.`,
  ].join(" ");
}

function formatCalibrationDelta(
  delta: BatchReviewReviewerConfidenceCalibrationDelta,
): string {
  return [
    `decisionsWithConfidence=${delta.decisionsWithConfidence};`,
    `accepted decisions=${delta.acceptedDecisions} (${formatConfidenceCounts(delta.acceptedConfidence)}), findings=${delta.acceptedFindings};`,
    `rejected decisions=${delta.rejectedDecisions} (${formatConfidenceCounts(delta.rejectedConfidence)}), findings=${delta.rejectedFindings}.`,
  ].join(" ");
}

export function formatBatchReviewSummaryComparisonReport(
  report: BatchReviewSummaryComparisonReport,
): string {
  const { comparison } = report;
  const lines = [
    "Batch review summary comparison completed.",
    `Before: ${report.inputs.before.pathLabel}.`,
    `After: ${report.inputs.after.pathLabel}.`,
    [
      "Entries:",
      `before=${comparison.counts.beforeEntries},`,
      `after=${comparison.counts.afterEntries},`,
      `matched=${comparison.counts.matched},`,
      `added=${comparison.counts.added},`,
      `removed=${comparison.counts.removed},`,
      `statusChanged=${comparison.counts.statusChanged}.`,
    ].join(" "),
    [
      "Severity movement among matched entries:",
      `improved=${comparison.counts.severityMovement.improved},`,
      `regressed=${comparison.counts.severityMovement.regressed},`,
      `unchanged=${comparison.counts.severityMovement.unchanged},`,
      `unavailable=${comparison.counts.severityMovement.unavailable}.`,
    ].join(" "),
    `Finding count delta: total=${comparison.counts.totalFindingsDelta}; ${formatSeverityCountDelta(comparison.counts.findingCountDelta)}.`,
    formatCalibrationSnapshot(
      "Reviewer confidence calibration before",
      comparison.calibration.before,
    ),
    formatCalibrationSnapshot(
      "Reviewer confidence calibration after",
      comparison.calibration.after,
    ),
    `Reviewer confidence calibration delta: ${formatCalibrationDelta(comparison.calibration.delta)}`,
    `Prompt eval count delta: total=${comparison.counts.promptEvalCountDelta ?? 0}; added=${comparison.counts.addedPromptEvalCount ?? 0}; unavailable=${comparison.counts.promptEvalCountUnavailable ?? 0}.`,
    ...formatEntrySection("Added entries:", comparison.added.map(formatSnapshot)),
    ...formatEntrySection("Removed entries:", comparison.removed.map(formatSnapshot)),
    ...formatEntrySection(
      "Changed matched entries:",
      comparison.changed.map(formatChangedEntry),
    ),
  ];

  return lines.join("\n");
}

export async function runBatchReviewSummaryComparison(input: {
  beforePath: string;
  afterPath: string;
  cwd?: string;
}): Promise<BatchReviewSummaryComparisonReport> {
  const cwd = input.cwd || process.cwd();
  const beforePath = resolveFromCwd(input.beforePath, cwd);
  const afterPath = resolveFromCwd(input.afterPath, cwd);
  const [before, after] = await Promise.all([
    loadBatchReviewArtifactSummary(beforePath, cwd),
    loadBatchReviewArtifactSummary(afterPath, cwd),
  ]);

  return {
    inputs: {
      before: {
        pathLabel: sanitizeReviewSurfaceValue(beforePath),
      },
      after: {
        pathLabel: sanitizeReviewSurfaceValue(afterPath),
      },
    },
    comparison: compareBatchReviewArtifactSummaries({ before, after }),
  };
}
