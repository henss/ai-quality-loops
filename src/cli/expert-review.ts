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
    .option("--json", "Emit a structured review result to stdout")
    .option("--json-output <path>", "Path to save the structured review result JSON")
    .action(async (content, options) => {
      const expertType = options.expert;
      const contentInput = options.content || content;
      const modelId = options.model;
      const outputPath = options.output;
      const structuredOutputPath = options.jsonOutput;

      if (!expertType || !contentInput) {
        cli.outputHelp();
        process.exit(1);
      }

      const result = await runExpertReview({
        expert: expertType,
        content: contentInput,
        modelId,
        outputPath,
        structuredOutputPath,
        resultFormat: options.json ? "structured" : "markdown",
      });

      if (options.json) {
        console.info(JSON.stringify(result, null, 2));
      }
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
