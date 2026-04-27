import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatBatchReviewRunLedgerDiffReport,
  runBatchReviewRunLedgerDiff,
} from "../review/batch-review.js";
import {
  formatBatchReviewSummaryComparisonReport,
  runBatchReviewSummaryComparison,
} from "../review/batch-review-summary-compare.js";
import {
  createMultiReviewContradictionCoverageMatrix,
  formatMultiReviewContradictionCoverageMatrix,
} from "../review/multi-review-contradiction-coverage-matrix.js";
import { reportCliError } from "../shared/cli-errors.js";

process.env.DOTENV_CONFIG_QUIET = "true";
dotenv.config({ quiet: true });

async function main() {
  const cli = cac("batch-review-compare");

  cli
    .command(
      "<beforePath> <afterPath>",
      "Compare two batch-review summary JSON artifacts",
    )
    .option(
      "--run-ledger",
      "Compare two same-fixture batch-review run ledger JSON artifacts instead of raw batch summaries",
    )
    .option(
      "--matrix",
      "Emit a contradiction-and-coverage matrix from two batch summary artifacts",
    )
    .option("--json", "Emit structured JSON output")
    .action(async (beforePath, afterPath, options) => {
      if (options.runLedger) {
        const report = await runBatchReviewRunLedgerDiff({
          beforePath,
          afterPath,
        });

        if (options.json) {
          console.info(JSON.stringify(report, null, 2));
          return;
        }

        console.info(formatBatchReviewRunLedgerDiffReport(report));
        return;
      }

      const report = await runBatchReviewSummaryComparison({
        beforePath,
        afterPath,
      });
      const matrix = options.matrix
        ? createMultiReviewContradictionCoverageMatrix(report)
        : undefined;

      if (options.json) {
        console.info(JSON.stringify(matrix || report, null, 2));
        return;
      }

      if (matrix) {
        console.info(formatMultiReviewContradictionCoverageMatrix(matrix));
        return;
      }

      console.info(formatBatchReviewSummaryComparisonReport(report));
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
