import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import type {
  BatchReviewRunLedger,
  BatchReviewRunLedgerDiffReport,
  BatchReviewRunLedgerFixtureEntry,
} from "../contracts/batch-review-run-ledger-contract.js";
import {
  parseBatchReviewRunLedger,
} from "../contracts/batch-review-run-ledger-contract.js";
import type {
  BatchReviewArtifactSummary,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";
import {
  compareBatchReviewArtifactSummaries,
  type BatchReviewSummaryComparison,
} from "./batch-review-summary-compare.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface CreateBatchReviewRunLedgerOptions {
  fixtureLabel?: string;
  runLabel?: string;
}

function sanitizeOptionalLabel(value?: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
  });
}

function sortFixtureEntries(
  entries: BatchReviewRunLedgerFixtureEntry[],
): BatchReviewRunLedgerFixtureEntry[] {
  return [...entries].sort(
    (left, right) =>
      left.index - right.index || left.resultKey.localeCompare(right.resultKey),
  );
}

export function deriveBatchReviewRunLedgerFixtureEntries(
  summary: BatchReviewArtifactSummary,
): BatchReviewRunLedgerFixtureEntry[] {
  return sortFixtureEntries(
    summary.results.map((result) => ({
      index: result.index,
      name: result.name,
      resultKey: result.resultKey,
      mode: result.mode,
      targetSummary: result.targetSummary,
    })),
  );
}

export function computeBatchReviewRunLedgerFingerprint(
  entries: BatchReviewRunLedgerFixtureEntry[],
): string {
  const stableEntries = sortFixtureEntries(entries).map((entry) => ({
    index: entry.index,
    name: entry.name,
    resultKey: entry.resultKey,
    mode: entry.mode,
    targetSummary: entry.targetSummary,
  }));

  return createHash("sha256")
    .update(JSON.stringify(stableEntries))
    .digest("hex");
}

function validateStoredFingerprint(ledger: BatchReviewRunLedger): void {
  const expectedFingerprint = computeBatchReviewRunLedgerFingerprint(
    ledger.fixture.entries,
  );

  if (ledger.fixture.fingerprint !== expectedFingerprint) {
    throw new Error(
      `Batch review run ledger fingerprint mismatch: expected "${expectedFingerprint}" but found "${ledger.fixture.fingerprint}".`,
    );
  }

  if (ledger.fixture.totalEntries !== ledger.fixture.entries.length) {
    throw new Error(
      `Batch review run ledger totalEntries mismatch: expected ${ledger.fixture.entries.length} but found ${ledger.fixture.totalEntries}.`,
    );
  }
}

export function createBatchReviewRunLedger(
  summary: BatchReviewArtifactSummary,
  options: CreateBatchReviewRunLedgerOptions = {},
): BatchReviewRunLedger {
  const entries = deriveBatchReviewRunLedgerFixtureEntries(summary);

  return {
    schemaVersion: "1",
    commandFamily: "batch-review",
    fixture: {
      label: sanitizeOptionalLabel(options.fixtureLabel),
      fingerprint: computeBatchReviewRunLedgerFingerprint(entries),
      totalEntries: entries.length,
      entries,
    },
    run: {
      label: sanitizeOptionalLabel(options.runLabel),
      summary,
    },
  };
}

export async function writeBatchReviewRunLedger(
  ledger: BatchReviewRunLedger,
  outputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(ledger, null, 2));
}

export async function loadBatchReviewRunLedger(
  ledgerPath: string,
  cwd = process.cwd(),
): Promise<BatchReviewRunLedger> {
  const resolvedLedgerPath = resolveFromCwd(ledgerPath, cwd);
  const rawLedger = await fs.readFile(resolvedLedgerPath, "utf-8");
  const ledger = parseBatchReviewRunLedger(JSON.parse(rawLedger) as unknown);
  validateStoredFingerprint(ledger);
  return ledger;
}

function formatSeverityCountDelta(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function formatRunLabel(label: string | undefined, fallback: string): string {
  return label ? `${label} (${fallback})` : fallback;
}

export function compareBatchReviewRunLedgers(input: {
  before: BatchReviewRunLedger;
  after: BatchReviewRunLedger;
}): BatchReviewSummaryComparison {
  validateStoredFingerprint(input.before);
  validateStoredFingerprint(input.after);

  if (
    input.before.fixture.fingerprint !== input.after.fixture.fingerprint
  ) {
    throw new Error(
      "Batch review run ledger diff requires the same fixture fingerprint on both inputs.",
    );
  }

  return compareBatchReviewArtifactSummaries({
    before: input.before.run.summary,
    after: input.after.run.summary,
  });
}

export function formatBatchReviewRunLedgerDiffReport(
  report: BatchReviewRunLedgerDiffReport,
): string {
  const { comparison } = report;
  const lines = [
    "Same-fixture batch review ledger diff completed.",
    `Fixture: ${
      report.fixture.label
        ? `${report.fixture.label}; `
        : ""
    }fingerprint=${report.fixture.fingerprint}; entries=${report.fixture.totalEntries}.`,
    `Before run: ${formatRunLabel(report.inputs.before.runLabel, report.inputs.before.pathLabel)}.`,
    `After run: ${formatRunLabel(report.inputs.after.runLabel, report.inputs.after.pathLabel)}.`,
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
  ];

  return lines.join("\n");
}

function resolveSharedFixtureLabel(input: {
  before: BatchReviewRunLedger;
  after: BatchReviewRunLedger;
}): string | undefined {
  const beforeLabel = input.before.fixture.label;
  const afterLabel = input.after.fixture.label;

  if (beforeLabel && afterLabel && beforeLabel === afterLabel) {
    return beforeLabel;
  }

  return beforeLabel || afterLabel;
}

export async function runBatchReviewRunLedgerDiff(input: {
  beforePath: string;
  afterPath: string;
  cwd?: string;
}): Promise<BatchReviewRunLedgerDiffReport> {
  const cwd = input.cwd || process.cwd();
  const beforePath = resolveFromCwd(input.beforePath, cwd);
  const afterPath = resolveFromCwd(input.afterPath, cwd);
  const [before, after] = await Promise.all([
    loadBatchReviewRunLedger(beforePath, cwd),
    loadBatchReviewRunLedger(afterPath, cwd),
  ]);
  const comparison = compareBatchReviewRunLedgers({ before, after });

  return {
    schemaVersion: "1",
    commandFamily: "batch-review",
    fixture: {
      label: resolveSharedFixtureLabel({ before, after }),
      fingerprint: before.fixture.fingerprint,
      totalEntries: before.fixture.totalEntries,
    },
    inputs: {
      before: {
        pathLabel: sanitizeReviewSurfaceValue(beforePath),
        runLabel: before.run.label,
        fixtureLabel: before.fixture.label,
      },
      after: {
        pathLabel: sanitizeReviewSurfaceValue(afterPath),
        runLabel: after.run.label,
        fixtureLabel: after.fixture.label,
      },
    },
    comparison,
  };
}
