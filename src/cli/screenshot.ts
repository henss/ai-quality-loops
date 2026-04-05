import { cac } from "cac";
import { takeScreenshot } from "../utils/screenshot.js";
import * as dotenv from "dotenv";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

async function main() {
  const cli = cac("web-screenshot");

  cli
    .command(
      "<urlOrPath> <outputPath>",
      "Capture a screenshot of a website or local file",
    )
    .option("--width <w>", "Viewport width", { default: 1280 })
    .option("--height <h>", "Viewport height", { default: 720 })
    .action(async (urlOrPath, outputPath, options) => {
      await takeScreenshot(urlOrPath, outputPath, {
        width: parseInt(options.width),
        height: parseInt(options.height),
      });
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
