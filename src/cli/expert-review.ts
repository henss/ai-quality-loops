import { cac } from "cac";
import { runExpertReview } from "../review/expert-review.js";
import * as dotenv from "dotenv";
import { getDefaultExpertReviewModel } from "../shared/models.js";
import { reportCliError } from "../shared/cli-errors.js";
import {
  formatPersonaCatalog,
  getPersonaCatalog,
} from "../review/persona-catalog.js";

dotenv.config();

const DEFAULT_MODEL = getDefaultExpertReviewModel();

async function main() {
  const cli = cac("expert-review");

  cli
    .command("[content]", "Review content with an expert persona")
    .option("--expert <type>", "Expert type (persona name or built-in alias)")
    .option(
      "--content <path>",
      "Path to content file (or raw text if not a file)",
    )
    .option("--model <id>", "Ollama model ID", { default: DEFAULT_MODEL })
    .option("--output <path>", "Path to save the review")
    .option("--prompt-library <path>", "Path to the persona library markdown file")
    .option("--list-personas", "List available personas and built-in aliases")
    .option("--json", "Emit a structured review result to stdout")
    .option("--json-output <path>", "Path to save the structured review result JSON")
    .action(async (content, options) => {
      if (options.listPersonas) {
        const catalog = await getPersonaCatalog({
          promptLibraryPath: options.promptLibrary,
        });
        if (options.json) {
          console.info(JSON.stringify(catalog, null, 2));
        } else {
          console.info(formatPersonaCatalog(catalog));
        }
        return;
      }

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
        promptLibraryPath: options.promptLibrary,
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
