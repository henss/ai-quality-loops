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
