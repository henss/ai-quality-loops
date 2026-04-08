import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { resolveFromCwd } from "../shared/io.js";
import { takeScreenshot } from "../utils/screenshot.js";
import {
  planVisionCaptures,
  type VisionCapturePlanOptions,
} from "./vision-capture-plan.js";

export interface RunVisionPreviewOptions extends VisionCapturePlanOptions {
  outputDir?: string;
  outputFileStem?: string;
  browserPath?: string;
}

export interface VisionPreviewArtifact {
  label: string;
  target: string;
  outputPath: string;
  width: number;
  height: number;
  section?: string;
}

export interface VisionPreviewResult {
  targetSummary: string;
  captureMode: "full-page" | "targeted-sections";
  customCssRequested: boolean;
  customCssInjected: boolean;
  outputDir: string;
  screenshots: VisionPreviewArtifact[];
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "capture";
}

function buildOutputFilename(
  fileStem: string,
  label: string,
  section?: string,
): string {
  const sectionSuffix = section ? `-${toSlug(section)}` : "";
  return `${fileStem}-${label}${sectionSuffix}.png`;
}

export function formatVisionPreviewResult(
  result: VisionPreviewResult,
): string {
  const lines = [
    `Captured ${result.screenshots.length} preview screenshot(s) for ${result.targetSummary}.`,
    `Capture mode: ${result.captureMode}`,
    `Custom CSS requested: ${result.customCssRequested ? "yes" : "no"}`,
    `Custom CSS injected: ${result.customCssInjected ? "yes" : "no"}`,
    `Output directory: ${result.outputDir}`,
    "",
    "Screenshots:",
  ];

  for (const artifact of result.screenshots) {
    const sectionSuffix = artifact.section ? ` [section: ${artifact.section}]` : "";
    lines.push(
      `- ${artifact.label}${sectionSuffix} (${artifact.width}x${artifact.height}) -> ${artifact.outputPath}`,
    );
  }

  return lines.join("\n");
}

export async function runVisionPreview(
  options: RunVisionPreviewOptions,
): Promise<VisionPreviewResult> {
  const capturePlan = await planVisionCaptures(options);
  const outputDir = options.outputDir
    ? resolveFromCwd(options.outputDir)
    : await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-preview-"));
  const fileStem = toSlug(options.outputFileStem || "capture-preview");
  const screenshots: VisionPreviewArtifact[] = [];

  await fs.mkdir(outputDir, { recursive: true });

  try {
    for (const capture of capturePlan.captures) {
      const outputPath = path.join(
        outputDir,
        buildOutputFilename(fileStem, capture.label, capture.section),
      );

      await takeScreenshot(capture.target, outputPath, {
        width: capture.width,
        height: capture.height,
        chromePath: options.browserPath,
        extraRedactions: options.extraRedactions,
      });

      screenshots.push({
        ...capture,
        outputPath,
      });
    }
  } finally {
    await capturePlan.cleanup();
  }

  return {
    targetSummary: capturePlan.targetSummary,
    captureMode: capturePlan.captureMode,
    customCssRequested: capturePlan.customCssRequested,
    customCssInjected: capturePlan.customCssInjected,
    outputDir,
    screenshots,
  };
}
