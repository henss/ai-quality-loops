import { cac } from "cac";
import { runExpertReview } from "../review/expert-review.js";
import * as dotenv from "dotenv";
import { getDefaultExpertReviewModel } from "../shared/models.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

const DEFAULT_MODEL = getDefaultExpertReviewModel();

async function main() {
  const cli = cac("expert-review");

  cli
    .command("[content]", "Review content with an expert persona")
    .option("--expert <type>", "Expert type (Persona name from library)")
    .option(
      "--content <path>",
      "Path to content file (or raw text if not a file)",
    )
    .option("--model <id>", "Ollama model ID", { default: DEFAULT_MODEL })
    .option("--output <path>", "Path to save the review")
    .action(async (content, options) => {
      const expertType = options.expert;
      const contentInput = options.content || content;
      const modelId = options.model;
      const outputPath = options.output;

      if (!expertType || !contentInput) {
        cli.outputHelp();
        process.exit(1);
      }

      await runExpertReview({
        expert: expertType,
        content: contentInput,
        modelId,
        outputPath,
      });
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
