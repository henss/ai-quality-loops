import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatBatchReviewSummaryComparisonReport,
  runBatchReviewSummaryComparison,
} from "../review/batch-review-summary-compare.js";
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
    .option("--json", "Emit structured JSON output")
    .action(async (beforePath, afterPath, options) => {
      const report = await runBatchReviewSummaryComparison({
        beforePath,
        afterPath,
      });

      if (options.json) {
        console.info(JSON.stringify(report, null, 2));
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
