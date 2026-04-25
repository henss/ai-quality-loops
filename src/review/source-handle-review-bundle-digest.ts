import type {
  BatchReviewArtifactResult,
  BatchReviewArtifactSummary,
} from "../contracts/batch-review-summary-contract.js";
import {
  sanitizeReviewSurfaceValue,
  type ReviewSurfaceRedactions,
} from "../shared/review-surface.js";

export interface FormatSourceHandleReviewBundleDigestOptions {
  title?: string;
  maxEntryNotes?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

interface PrioritizedEntry {
  entry: BatchReviewArtifactResult;
  priority: number;
}

function sanitizeDigestValue(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
    extraRedactions,
  });
}

function formatPromptEvalTotal(summary: BatchReviewArtifactSummary): string {
  let total = 0;
  let unavailable = 0;

  for (const entry of summary.results) {
    const promptEvalCount = entry.ollamaTelemetry?.promptEvalCount;
    if (typeof promptEvalCount === "number" && Number.isFinite(promptEvalCount)) {
      total += promptEvalCount;
      continue;
    }

    unavailable += 1;
  }

  return `total=${total}; unavailable=${unavailable}.`;
}

function countStructuredRollups(summary: BatchReviewArtifactSummary): {
  available: number;
  missing: number;
} {
  let available = 0;

  for (const entry of summary.results) {
    if (entry.structuredResult) {
      available += 1;
    }
  }

  return {
    available,
    missing: summary.results.length - available,
  };
}

function collectDecisionCounts(summary: BatchReviewArtifactSummary): string {
  const counts = new Map<string, number>();

  for (const entry of summary.results) {
    const verdict = entry.structuredResult?.decision?.verdict;
    if (!verdict) {
      continue;
    }

    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return "none published.";
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([verdict, count]) => `${verdict}=${count}`)
    .join(", ");
}

function buildEntryPriority(entry: BatchReviewArtifactResult): number {
  if (entry.status === "failure") {
    return 0;
  }

  switch (entry.structuredResult?.decision?.verdict) {
    case "process_failed":
      return 1;
    case "blocked":
      return 2;
    case "changes_requested":
      return 3;
    default:
      break;
  }

  switch (entry.structuredResult?.overallSeverity) {
    case "critical":
      return 4;
    case "high":
      return 5;
    case "medium":
      return 6;
    case "low":
      return 7;
    default:
      return 8;
  }
}

function prioritizeEntries(
  summary: BatchReviewArtifactSummary,
): PrioritizedEntry[] {
  return summary.results
    .map((entry) => ({
      entry,
      priority: buildEntryPriority(entry),
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.entry.index - right.entry.index;
    });
}

function formatEntryNote(
  entry: BatchReviewArtifactResult,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const label = sanitizeDigestValue(entry.resultKey, extraRedactions);
  const name = sanitizeDigestValue(
    entry.name ?? "Unnamed review entry",
    extraRedactions,
  );
  const target = sanitizeDigestValue(entry.targetSummary, extraRedactions);

  if (entry.status === "failure") {
    const failureSummary = entry.errorSummary
      ? sanitizeDigestValue(entry.errorSummary, extraRedactions)
      : "No failure summary was published.";
    const punctuatedFailureSummary = /[.!?]$/.test(failureSummary)
      ? failureSummary
      : `${failureSummary}.`;
    return `- \`${label}\` (${name}): failure; target=${target}; error=${punctuatedFailureSummary}`;
  }

  const structuredResult = entry.structuredResult;
  if (!structuredResult) {
    return `- \`${label}\` (${name}): success; target=${target}; structured rollup unavailable.`;
  }

  const decision = structuredResult.decision
    ? `; verdict=${structuredResult.decision.verdict}; confidence=${structuredResult.decision.confidence}`
    : "";

  return `- \`${label}\` (${name}): success; target=${target}; severity=${structuredResult.overallSeverity}; findings=${structuredResult.totalFindings}${decision}.`;
}

function buildCoverageGaps(summary: BatchReviewArtifactSummary): string[] {
  const gaps: string[] = [];
  const structuredRollups = countStructuredRollups(summary);
  const missingDecisions = summary.results.filter(
    (entry) => entry.status === "success" && !entry.structuredResult?.decision,
  ).length;
  const failures = summary.results.filter((entry) => entry.status === "failure").length;

  if (structuredRollups.missing > 0) {
    gaps.push(
      `${structuredRollups.missing} entr${
        structuredRollups.missing === 1 ? "y lacks" : "ies lack"
      } a structured rollup, so severity and verdict coverage is incomplete.`,
    );
  }

  if (missingDecisions > 0) {
    gaps.push(
      `${missingDecisions} successful entr${
        missingDecisions === 1 ? "y omits" : "ies omit"
      } a decision summary, so downstream acceptance still needs caller-owned interpretation.`,
    );
  }

  if (failures > 0) {
    gaps.push(
      `${failures} entr${
        failures === 1 ? "y failed" : "ies failed"
      } before a reusable rollup was published, so the bundle still needs targeted rereads.`,
    );
  }

  gaps.push(
    "This digest does not resolve source handles, verify caller-owned source truth, or rank follow-up priority.",
  );

  return gaps;
}

export function formatSourceHandleReviewBundleDigest(
  summary: BatchReviewArtifactSummary,
  options: FormatSourceHandleReviewBundleDigestOptions = {},
): string {
  const title = options.title || "Source-Handle Review Bundle Digest";
  const maxEntryNotes = options.maxEntryNotes ?? 5;
  const prioritizedEntries = prioritizeEntries(summary);
  const notedEntries = prioritizedEntries
    .slice(0, maxEntryNotes)
    .map(({ entry }) => formatEntryNote(entry, options.extraRedactions));
  const omittedEntries = Math.max(0, prioritizedEntries.length - notedEntries.length);
  const structuredRollups = countStructuredRollups(summary);
  const modeCounts = {
    expert: summary.results.filter((entry) => entry.mode === "expert").length,
    vision: summary.results.filter((entry) => entry.mode === "vision").length,
  };

  return [
    `# ${title}`,
    "",
    "This digest is generated from sanitized AIQL batch-review summary artifacts for caller-owned source-handle packs. It compresses review signals without resolving handles or replaying raw packet contents.",
    "",
    "## Bundle Snapshot",
    "",
    `- Manifest artifact: ${sanitizeDigestValue(
      summary.manifestPath ?? "Manifest artifact unavailable",
      options.extraRedactions,
    )}.`,
    `- Reviews: total=${summary.total}; succeeded=${summary.succeeded}; failed=${summary.failed}.`,
    `- Modes: expert=${modeCounts.expert}; vision=${modeCounts.vision}.`,
    `- Structured rollups: available=${structuredRollups.available}; missing=${structuredRollups.missing}.`,
    `- Published decisions: ${collectDecisionCounts(summary)}`,
    `- Prompt eval telemetry: ${formatPromptEvalTotal(summary)}`,
    "",
    "## Priority Entry Notes",
    "",
    ...(notedEntries.length > 0
      ? notedEntries
      : ["- No review entries were available in the published summary artifact."]),
    ...(omittedEntries > 0
      ? [
          `- ${omittedEntries} additional entr${
            omittedEntries === 1 ? "y was" : "ies were"
          } omitted by the digest note limit.`,
        ]
      : []),
    "",
    "## Coverage Gaps",
    "",
    ...buildCoverageGaps(summary).map((gap) => `- ${gap}`),
    "",
    "## Boundary",
    "",
    "AIQL can summarize published batch-review artifacts into a compact source-handle bundle digest. The embedding workflow still owns packet assembly, source-handle resolution, source verification, approval thresholds, tracker context, and downstream routing.",
  ].join("\n");
}
