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

  return thresholds;
}

function hasAnyThreshold(thresholds: ReviewGateThresholds): boolean {
  return Boolean(
    thresholds.failOnSeverity ||
      thresholds.maxFailedReviews !== undefined ||
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
      "--fail-on-severity <severity>",
      "Fail when any loaded structured review result reaches this severity or higher.",
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
    .option("--json", "Emit the gate result as JSON")
    .action(async (options) => {
      const resultPaths = parsePathList(options.result);
      const batchSummaryPaths = parsePathList(options.batchSummary);

      if (resultPaths.length === 0 && batchSummaryPaths.length === 0) {
        throw new Error(
          "Provide at least one input via --result or --batch-summary.",
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

