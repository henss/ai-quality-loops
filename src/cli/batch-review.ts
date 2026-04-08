import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatBatchReviewSummary,
  runBatchReviewManifestPreflight,
  runBatchReviewManifest,
} from "../review/batch-review.js";
import { formatReviewPreflightSummary } from "../review/preflight.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

async function main() {
  const cli = cac("batch-review");

  cli
    .command("[manifest]", "Run an expert or vision review manifest sequentially")
    .option("--manifest <path>", "Path to the batch review manifest JSON file")
    .action(async (manifest, options) => {
      const manifestPath = options.manifest || manifest;

      if (!manifestPath) {
        cli.outputHelp();
        process.exit(1);
      }

      const preflight = await runBatchReviewManifestPreflight({
        manifestPath,
      });
      console.info(formatReviewPreflightSummary(preflight));
      if (!preflight.ok) {
        process.exitCode = 1;
        return;
      }

      const summary = await runBatchReviewManifest({
        manifestPath,
      });

      console.info(formatBatchReviewSummary(summary));
      if (summary.failed > 0) {
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
