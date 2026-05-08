#!/usr/bin/env node
import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  formatReviewPreflightSummary,
  runReviewPreflight,
  type ReviewPreflightMode,
} from "../review/preflight.js";
import { reportCliError } from "../shared/cli-errors.js";
import {
  formatPersonaCatalog,
  getPersonaCatalog,
} from "../review/persona-catalog.js";

dotenv.config();

function parseMode(value: string | undefined): ReviewPreflightMode {
  if (!value || value === "both") {
    return "both";
  }

  if (value === "expert" || value === "vision") {
    return value;
  }

  throw new Error(`Unsupported preflight mode "${value}". Use expert, vision, or both.`);
}

async function main() {
  const cli = cac("review-preflight");

  cli
    .command("", "Verify local review prerequisites before running expert or vision reviews")
    .option("--mode <mode>", "Which review surface to check: expert, vision, or both", {
      default: "both",
    })
    .option("--expert <type>", "Persona name or built-in expert alias", {
      default: "UI/UX",
    })
    .option("--expert-model <id>", "Expert review Ollama model id")
    .option("--vision-model <id>", "Vision review Ollama model id")
    .option("--prompt-library <path>", "Path to the persona library markdown file")
    .option("--context <path>", "Path to the optional review context JSON file")
    .option("--ollama-url <url>", "Base URL for the Ollama API")
    .option(
      "--start-ollama",
      "Attempt to start `ollama serve` when the configured endpoint is down",
    )
    .option("--browser-path <path>", "Browser executable path for screenshot-based checks")
    .option("--list-personas", "List available personas and built-in aliases")
    .option("--json", "Emit the result as JSON")
    .action(async (options) => {
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

      const result = await runReviewPreflight({
        mode: parseMode(options.mode),
        expert: options.expert,
        expertModel: options.expertModel,
        visionModel: options.visionModel,
        promptLibraryPath: options.promptLibrary,
        contextPath: options.context,
        ollamaUrl: options.ollamaUrl,
        startOllamaIfDown: Boolean(options.startOllama),
        browserPath: options.browserPath,
      });

      if (options.json) {
        console.info(JSON.stringify(result, null, 2));
      } else {
        console.info(formatReviewPreflightSummary(result));
      }

      if (!result.ok) {
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
