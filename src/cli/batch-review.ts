#!/usr/bin/env node
import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  createBatchReviewRunLedger,
  formatBatchReviewSummary,
  loadBatchReviewArtifactSummary,
  loadBatchReviewManifest,
  normalizeBatchReviewManifest,
  runBatchReviewEntries,
  runBatchReviewEntriesPreflight,
  writeBatchReviewArtifactSummary,
  runBatchReviewManifestPreflight,
  runBatchReviewManifest,
  selectBatchReviewEntriesFromSummary,
  writeBatchReviewRunLedger,
} from "../review/batch-review.js";
import { formatReviewPreflightSummary } from "../review/preflight.js";
import { reportCliError } from "../shared/cli-errors.js";
import { resolveFromCwd } from "../shared/io.js";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

dotenv.config();

function parseEntryNames(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const names = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return names.length > 0 ? names : undefined;
}

interface BatchReviewCliLedgerOptions {
  runLedgerOutputPath?: string;
  fixtureLabel?: string;
  runLabel?: string;
}

function resolveLedgerOptions(
  options: Record<string, unknown>,
): BatchReviewCliLedgerOptions {
  const runLedgerOutputPath =
    typeof options.runLedgerOutput === "string"
      ? resolveFromCwd(options.runLedgerOutput)
      : undefined;
  const fixtureLabel =
    typeof options.fixtureLabel === "string" ? options.fixtureLabel : undefined;
  const runLabel =
    typeof options.runLabel === "string" ? options.runLabel : undefined;

  if (!runLedgerOutputPath && (fixtureLabel || runLabel)) {
    throw new Error("--fixture-label and --run-label require --run-ledger-output.");
  }

  return {
    runLedgerOutputPath,
    fixtureLabel,
    runLabel,
  };
}

async function writeOptionalBatchArtifacts(
  summary: Awaited<ReturnType<typeof runBatchReviewManifest>>,
  options: {
    summaryOutput?: unknown;
    ledger: BatchReviewCliLedgerOptions;
  },
): Promise<void> {
  if (typeof options.summaryOutput === "string") {
    const summaryOutputPath = resolveFromCwd(options.summaryOutput);
    await writeBatchReviewArtifactSummary(summary, summaryOutputPath);
    console.info(
      `Machine-readable batch summary: ${sanitizeReviewSurfaceValue(summaryOutputPath)}`,
    );
  }

  if (options.ledger.runLedgerOutputPath) {
    await writeBatchReviewRunLedger(
      createBatchReviewRunLedger(summary, {
        fixtureLabel: options.ledger.fixtureLabel,
        runLabel: options.ledger.runLabel,
      }),
      options.ledger.runLedgerOutputPath,
    );
    console.info(
      `Same-fixture run ledger: ${sanitizeReviewSurfaceValue(options.ledger.runLedgerOutputPath)}`,
    );
  }
}

function finishBatchReview(summary: Awaited<ReturnType<typeof runBatchReviewManifest>>): void {
  console.info(formatBatchReviewSummary(summary));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

async function runFreshManifest(
  manifestPath: string,
  options: Record<string, unknown>,
  ledger: BatchReviewCliLedgerOptions,
): Promise<void> {
  const entryNames = parseEntryNames(
    typeof options.entryName === "string" ? options.entryName : undefined,
  );
  if (options.rerunFailed || entryNames) {
    throw new Error("--rerun-failed and --entry-name require --rerun-summary.");
  }

  const preflight = await runBatchReviewManifestPreflight({
    manifestPath,
    startOllamaIfDown: Boolean(options.startOllama),
  });
  console.info(formatReviewPreflightSummary(preflight));
  if (!preflight.ok) {
    process.exitCode = 1;
    return;
  }

  const summary = await runBatchReviewManifest({
    manifestPath,
  });
  await writeOptionalBatchArtifacts(summary, {
    summaryOutput: options.summaryOutput,
    ledger,
  });
  finishBatchReview(summary);
}

async function runSelectedRerun(
  manifestPath: string,
  rerunSummaryPath: string,
  options: Record<string, unknown>,
  ledger: BatchReviewCliLedgerOptions,
): Promise<void> {
  const entryNames = parseEntryNames(
    typeof options.entryName === "string" ? options.entryName : undefined,
  );
  const manifestPathLabel = sanitizeReviewSurfaceValue(resolveFromCwd(manifestPath));
  const loadedManifest = await loadBatchReviewManifest(manifestPath);
  const priorSummary = await loadBatchReviewArtifactSummary(rerunSummaryPath);
  const rerunManifest = selectBatchReviewEntriesFromSummary(
    loadedManifest,
    priorSummary,
    {
      onlyFailed: Boolean(options.rerunFailed),
      entryNames,
    },
  );
  const rerunEntries = normalizeBatchReviewManifest(rerunManifest);
  const preflight = await runBatchReviewEntriesPreflight({
    entries: rerunEntries,
    startOllamaIfDown: Boolean(options.startOllama),
  });
  console.info(formatReviewPreflightSummary(preflight));
  if (!preflight.ok) {
    process.exitCode = 1;
    return;
  }

  console.info(
    `Rerunning ${rerunEntries.length} entry${rerunEntries.length === 1 ? "" : "ies"} selected from ${sanitizeReviewSurfaceValue(resolveFromCwd(rerunSummaryPath))} against ${manifestPathLabel}.`,
  );

  const summary = await runBatchReviewEntries({
    manifestPath: resolveFromCwd(manifestPath),
    entries: rerunEntries,
  });
  await writeOptionalBatchArtifacts(summary, {
    summaryOutput: options.summaryOutput,
    ledger,
  });
  finishBatchReview(summary);
}

async function main() {
  const cli = cac("batch-review");

  cli
    .command("[manifest]", "Run an expert or vision review manifest sequentially")
    .option("--manifest <path>", "Path to the batch review manifest JSON file")
    .option(
      "--rerun-summary <path>",
      "Select rerun entries from a prior machine-readable batch summary artifact",
    )
    .option(
      "--rerun-failed",
      "With --rerun-summary, rerun only entries that previously failed",
    )
    .option(
      "--entry-name <names>",
      "With --rerun-summary, rerun one or more comma-separated review names from the prior summary",
    )
    .option(
      "--summary-output <path>",
      "Write a machine-readable JSON summary artifact for the batch run",
    )
    .option(
      "--run-ledger-output <path>",
      "Write a same-fixture run ledger JSON artifact for the batch run",
    )
    .option(
      "--fixture-label <label>",
      "Optional caller-owned label for the fixed pack or fixture represented by --run-ledger-output",
    )
    .option(
      "--run-label <label>",
      "Optional caller-owned label for the run represented by --run-ledger-output",
    )
    .option(
      "--start-ollama",
      "Attempt to start `ollama serve` when the configured endpoint is down",
    )
    .action(async (manifestArg, options) => {
      const manifestPath = options.manifest || manifestArg;

      if (!manifestPath) {
        cli.outputHelp();
        process.exit(1);
        return;
      }

      const rerunSummaryPath =
        typeof options.rerunSummary === "string" ? options.rerunSummary : undefined;
      const ledger = resolveLedgerOptions(options);

      if (!rerunSummaryPath) {
        await runFreshManifest(manifestPath, options, ledger);
        return;
      }

      await runSelectedRerun(manifestPath, rerunSummaryPath, options, ledger);
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
