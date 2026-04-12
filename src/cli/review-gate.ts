import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatReviewGateReport,
  runReviewGate,
  type ReviewGateThresholds,
} from "../review/review-gate.js";
import type { StructuredReviewSeverity } from "../contracts/json-contracts.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

function parsePathList(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];

  return rawValues
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptionalBudget(value: unknown, flagName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }

  return parsed;
}

function parseSeverity(value: unknown): StructuredReviewSeverity | undefined {
  switch (value) {
    case undefined:
      return undefined;
    case "critical":
    case "high":
    case "medium":
    case "low":
    case "unknown":
      return value;
    default:
      throw new Error(
        `Unsupported severity "${String(value)}". Use critical, high, medium, low, or unknown.`,
      );
  }
}

function createThresholds(options: Record<string, unknown>): ReviewGateThresholds {
  const thresholds: ReviewGateThresholds = {
    failOnSeverity: parseSeverity(options.failOnSeverity),
    maxFailedReviews: parseOptionalBudget(
      options.maxFailedReviews,
      "--max-failed-reviews",
    ),
  };

  const maxFindings = {
    critical: parseOptionalBudget(options.maxCritical, "--max-critical"),
    high: parseOptionalBudget(options.maxHigh, "--max-high"),
    medium: parseOptionalBudget(options.maxMedium, "--max-medium"),
    low: parseOptionalBudget(options.maxLow, "--max-low"),
    unknown: parseOptionalBudget(options.maxUnknown, "--max-unknown"),
  };

  if (Object.values(maxFindings).some((value) => value !== undefined)) {
    thresholds.maxFindings = maxFindings;
  }

  const maxAddedFindings = {
    critical: parseOptionalBudget(
      options.maxAddedCritical,
      "--max-added-critical",
    ),
    high: parseOptionalBudget(options.maxAddedHigh, "--max-added-high"),
    medium: parseOptionalBudget(options.maxAddedMedium, "--max-added-medium"),
    low: parseOptionalBudget(options.maxAddedLow, "--max-added-low"),
    unknown: parseOptionalBudget(
      options.maxAddedUnknown,
      "--max-added-unknown",
    ),
  };
  const maxSeverityRegressions = parseOptionalBudget(
    options.maxSeverityRegressions,
    "--max-severity-regressions",
  );

  if (
    maxSeverityRegressions !== undefined ||
    Object.values(maxAddedFindings).some((value) => value !== undefined)
  ) {
    thresholds.batchComparison = {
      maxSeverityRegressions,
      maxAddedFindings,
    };
  }

  return thresholds;
}

function hasAnyThreshold(thresholds: ReviewGateThresholds): boolean {
  return Boolean(
    thresholds.failOnSeverity ||
      thresholds.maxFailedReviews !== undefined ||
      thresholds.batchComparison?.maxSeverityRegressions !== undefined ||
      Object.values(thresholds.batchComparison?.maxAddedFindings || {}).some(
        (value) => value !== undefined,
      ) ||
      Object.values(thresholds.maxFindings || {}).some(
        (value) => value !== undefined,
      ),
  );
}

async function main() {
  const cli = cac("review-gate");

  cli
    .command(
      "",
      "Apply explicit finding and failure budgets to structured review-result artifacts and/or batch summaries",
    )
    .option(
      "--result <path>",
      "Path to a structured review-result JSON artifact. Repeat or use comma-separated values.",
    )
    .option(
      "--batch-summary <path>",
      "Path to a batch summary JSON artifact. Repeat or use comma-separated values.",
    )
    .option(
      "--batch-comparison <path>",
      "Path to a batch-review-compare --json report. Repeat or use comma-separated values.",
    )
    .option(
      "--fail-on-severity <severity>",
      "Fail when any loaded structured review result or batch-summary rollup reaches this severity or higher.",
    )
    .option(
      "--max-failed-reviews <count>",
      "Allow at most this many failed reviews across loaded batch summaries.",
    )
    .option("--max-critical <count>", "Allow at most this many critical findings.")
    .option("--max-high <count>", "Allow at most this many high findings.")
    .option("--max-medium <count>", "Allow at most this many medium findings.")
    .option("--max-low <count>", "Allow at most this many low findings.")
    .option("--max-unknown <count>", "Allow at most this many unknown findings.")
    .option(
      "--max-added-critical <count>",
      "Allow at most this many added critical finding deltas across batch comparison reports.",
    )
    .option(
      "--max-added-high <count>",
      "Allow at most this many added high finding deltas across batch comparison reports.",
    )
    .option(
      "--max-added-medium <count>",
      "Allow at most this many added medium finding deltas across batch comparison reports.",
    )
    .option(
      "--max-added-low <count>",
      "Allow at most this many added low finding deltas across batch comparison reports.",
    )
    .option(
      "--max-added-unknown <count>",
      "Allow at most this many added unknown finding deltas across batch comparison reports.",
    )
    .option(
      "--max-severity-regressions <count>",
      "Allow at most this many matched-entry severity regressions across batch comparison reports.",
    )
    .option("--json", "Emit the gate result as JSON")
    .action(async (options) => {
      const resultPaths = parsePathList(options.result);
      const batchSummaryPaths = parsePathList(options.batchSummary);
      const batchComparisonPaths = parsePathList(options.batchComparison);

      if (
        resultPaths.length === 0 &&
        batchSummaryPaths.length === 0 &&
        batchComparisonPaths.length === 0
      ) {
        throw new Error(
          "Provide at least one input via --result, --batch-summary, or --batch-comparison.",
        );
      }

      const thresholds = createThresholds(options as Record<string, unknown>);
      if (!hasAnyThreshold(thresholds)) {
        throw new Error(
          "Provide at least one gate threshold such as --fail-on-severity, --max-failed-reviews, or --max-medium.",
        );
      }

      const report = await runReviewGate({
        resultPaths,
        batchSummaryPaths,
        batchComparisonPaths,
        thresholds,
      });

      if (options.json) {
        console.info(JSON.stringify(report, null, 2));
      } else {
        console.info(formatReviewGateReport(report));
      }

      if (!report.ok) {
        process.exitCode = 1;
      }
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
