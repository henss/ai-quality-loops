import { cac } from "cac";
import { runVisionReview } from "../review/vision-review.js";
import * as dotenv from "dotenv";
import { getDefaultVisionReviewModel } from "../shared/models.js";

dotenv.config();

const VISION_MODEL = getDefaultVisionReviewModel();

async function main() {
  const cli = cac("vision-review");

  cli
    .command("<urlOrPath>", "Review a website or local page using a vision LLM")
    .option("--expert <type>", "Expert persona (default: UI/UX)", {
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
    .option("--css <css>", "Custom CSS to inject before screenshot")
    .action(async (urlOrPath, options) => {
      try {
        await runVisionReview({
          urlOrPath,
          expert: options.expert,
          outputPath: options.output,
          width: parseInt(options.width),
          height: parseInt(options.height),
          sections: options.sections ? options.sections.split(",") : [],
          model: options.model,
          customCss: options.css,
        });
      } catch (err) {
        process.exit(1);
      }
    });

  cli.help();
  cli.parse();
}

main().catch(console.error);
