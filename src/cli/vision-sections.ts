#!/usr/bin/env node
import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  discoverVisionSections,
  formatVisionSectionDiscovery,
} from "../review/vision-section-discovery.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

async function main() {
  const cli = cac("vision-sections");

  cli
    .command("<urlOrPath>", "List valid DOM id targets for vision-review sections")
    .option("--json", "Emit structured JSON output")
    .option("--browser-path <path>", "Browser executable path override")
    .action(async (urlOrPath, options) => {
      const result = await discoverVisionSections(urlOrPath, {
        browserPath: options.browserPath,
      });

      if (options.json) {
        console.info(JSON.stringify(result, null, 2));
        return;
      }

      console.info(formatVisionSectionDiscovery(result));
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
