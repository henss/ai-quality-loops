#!/usr/bin/env node
import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatReviewerCalibrationBenchmarkReport,
} from "../review/reviewer-calibration-benchmark.js";
import { runReviewerCalibrationBenchmark } from "../review/reviewer-calibration-benchmark-runner.js";
import { reportCliError } from "../shared/cli-errors.js";

process.env.DOTENV_CONFIG_QUIET = "true";
dotenv.config({ quiet: true });

async function main() {
  const cli = cac("reviewer-calibration-benchmark");

  cli
    .command(
      "",
      "Score reviewer structured results against withheld gold calibration judgments",
    )
    .option(
      "--cases <path>",
      "Prompt-only benchmark cases JSON shown to reviewer configurations",
    )
    .option(
      "--gold <path>",
      "Withheld gold judgments JSON used only by the scorer",
    )
    .option(
      "--observed-runs <path>",
      "Observed reviewer run JSON containing structured review results by case",
    )
    .option("--json", "Emit structured JSON output")
    .action(async (options) => {
      if (!options.cases || !options.gold || !options.observedRuns) {
        throw new Error("Provide --cases, --gold, and --observed-runs.");
      }

      const report = await runReviewerCalibrationBenchmark({
        casesPath: String(options.cases),
        goldJudgmentsPath: String(options.gold),
        observedRunsPath: String(options.observedRuns),
      });

      if (options.json) {
        console.info(JSON.stringify(report, null, 2));
        return;
      }

      console.info(formatReviewerCalibrationBenchmarkReport(report));
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
