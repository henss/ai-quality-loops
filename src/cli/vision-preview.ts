#!/usr/bin/env node
import { cac } from "cac";
import * as dotenv from "dotenv";
import {
  loadBatchReviewManifest,
  normalizeBatchReviewManifest,
  type NormalizedBatchReviewEntry,
} from "../review/batch-review.js";
import {
  formatVisionPreviewResult,
  runVisionPreview,
} from "../review/vision-preview.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

function parseSections(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const sections = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return sections.length > 0 ? sections : undefined;
}

function parseEntryIndex(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("--entry-index must be a positive integer.");
  }

  return parsed;
}

function deriveOutputFileStem(entry: NormalizedBatchReviewEntry): string | undefined {
  return entry.name;
}

function selectManifestVisionEntry(
  entries: NormalizedBatchReviewEntry[],
  entryName?: string,
  entryIndex?: number,
): NormalizedBatchReviewEntry {
  const visionEntries = entries.filter((entry) => entry.mode === "vision");
  if (visionEntries.length === 0) {
    throw new Error("The manifest does not contain any vision review entries.");
  }

  if (entryName && entryIndex) {
    throw new Error("Use either --entry-name or --entry-index, not both.");
  }

  if (entryName) {
    const entry = visionEntries.find((candidate) => candidate.name === entryName);
    if (!entry) {
      throw new Error(`No vision review entry named "${entryName}" was found in the manifest.`);
    }
    return entry;
  }

  if (entryIndex) {
    const entry = visionEntries.find((candidate) => candidate.index + 1 === entryIndex);
    if (!entry) {
      throw new Error(`No vision review entry at manifest index ${entryIndex} was found.`);
    }
    return entry;
  }

  if (visionEntries.length !== 1) {
    const names = visionEntries.map((entry) => entry.name || `reviews[${entry.index}]`);
    throw new Error(
      `The manifest contains ${visionEntries.length} vision review entries (${names.join(", ")}). Select one with --entry-name or --entry-index.`,
    );
  }

  return visionEntries[0];
}

async function resolvePreviewSource(
  urlOrPath: string | undefined,
  options: Record<string, string | boolean | undefined>,
): Promise<{
  urlOrPath: string;
  sections?: string[];
  width?: number;
  height?: number;
  customCss?: string;
  outputFileStem?: string;
}> {
  const manifestPath = typeof options.manifest === "string" ? options.manifest : undefined;
  if (manifestPath) {
    if (urlOrPath) {
      throw new Error("Pass either <urlOrPath> or --manifest, not both.");
    }

    const manifest = await loadBatchReviewManifest(manifestPath);
    const entries = normalizeBatchReviewManifest(manifest);
    const entry = selectManifestVisionEntry(
      entries,
      typeof options.entryName === "string" ? options.entryName : undefined,
      parseEntryIndex(
        typeof options.entryIndex === "string" ? options.entryIndex : undefined,
      ),
    );

    return {
      urlOrPath: entry.target,
      sections: entry.sections,
      width: entry.width,
      height: entry.height,
      customCss: entry.css,
      outputFileStem: deriveOutputFileStem(entry),
    };
  }

  if (!urlOrPath) {
    throw new Error("A target is required unless --manifest is provided.");
  }

  return {
    urlOrPath,
    sections: parseSections(typeof options.sections === "string" ? options.sections : undefined),
    width:
      typeof options.width === "string"
        ? Number.parseInt(options.width, 10)
        : undefined,
    height:
      typeof options.height === "string"
        ? Number.parseInt(options.height, 10)
        : undefined,
    customCss: typeof options.css === "string" ? options.css : undefined,
  };
}

async function main() {
  const cli = cac("vision-preview");

  cli
    .command("[urlOrPath]", "Capture the screenshots a vision review would use, without calling an LLM")
    .option("--sections <sections>", "Comma-separated section IDs to capture separately")
    .option("--width <w>", "Viewport width")
    .option("--height <h>", "Viewport height")
    .option("--css <css>", "Custom CSS to inject before capture")
    .option("--output-dir <path>", "Directory to save preview screenshots")
    .option("--browser-path <path>", "Browser executable path override")
    .option("--json", "Emit structured JSON output")
    .option("--manifest <path>", "Preview one vision entry from a batch-review manifest")
    .option("--entry-name <name>", "Manifest review entry name to preview")
    .option("--entry-index <n>", "1-based manifest review index to preview")
    .action(async (urlOrPath, options) => {
      const resolved = await resolvePreviewSource(urlOrPath, options);
      const result = await runVisionPreview({
        ...resolved,
        outputDir:
          typeof options.outputDir === "string" ? options.outputDir : undefined,
        browserPath:
          typeof options.browserPath === "string" ? options.browserPath : undefined,
      });

      if (options.json) {
        console.info(JSON.stringify(result, null, 2));
        return;
      }

      console.info(formatVisionPreviewResult(result));
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
