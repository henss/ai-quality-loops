import { cac } from "cac";
import { runVisionReview } from "../review/vision-review.js";
import * as dotenv from "dotenv";
import { getDefaultVisionReviewModel } from "../shared/models.js";
import { reportCliError } from "../shared/cli-errors.js";
import {
  formatPersonaCatalog,
  getPersonaCatalog,
} from "../review/persona-catalog.js";

dotenv.config();

const VISION_MODEL = getDefaultVisionReviewModel();

async function main() {
  const cli = cac("vision-review");

  cli
    .command("[urlOrPath]", "Review a website or local page using a vision LLM")
    .option("--expert <type>", "Expert persona name or built-in alias (default: UI/UX)", {
      default: "UI/UX",
    })
    .option("--output <path>", "Path to save the review")
    .option("--width <w>", "Viewport width", { default: 1280 })
    .option("--height <h>", "Viewport height", { default: 720 })
    .option(
      "--sections <sections>",
      "Comma-separated section IDs to capture separately",
    )
    .option("--model <m>", "Vision model", {
      default: VISION_MODEL,
    })
    .option("--prompt-library <path>", "Path to the persona library markdown file")
    .option("--list-personas", "List available personas and built-in aliases")
    .option("--css <css>", "Custom CSS to inject before screenshot")
    .option("--json", "Emit a structured review result to stdout")
    .option("--json-output <path>", "Path to save the structured review result JSON")
    .action(async (urlOrPath, options) => {
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

      if (!urlOrPath) {
        cli.outputHelp();
        process.exit(1);
      }

      const result = await runVisionReview({
        urlOrPath,
        expert: options.expert,
        outputPath: options.output,
        structuredOutputPath: options.jsonOutput,
        width: parseInt(options.width),
        height: parseInt(options.height),
        sections: options.sections ? options.sections.split(",") : [],
        model: options.model,
        promptLibraryPath: options.promptLibrary,
        customCss: options.css,
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
