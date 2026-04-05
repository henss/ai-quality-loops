import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getLogger } from "../shared/logger.js";
import { callOllamaVision, imageToBase64 } from "../shared/ollama.js";
import {
  getDefaultOllamaUrl,
  getDefaultVisionReviewModel,
} from "../shared/models.js";
import {
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "../shared/review-surface.js";
import { takeScreenshot } from "../utils/screenshot.js";
import {
  buildReviewEnvelope,
  loadPersonaPrompt,
  prepareReviewEvidenceDescriptorItems,
  prepareReviewMetadataItems,
  prepareReviewMaterialSections,
  loadReviewContext,
  type ReviewRedactionOptions,
  summarizeReviewOutputReference,
  writeReviewOutput,
} from "./shared.js";
import { prepareVisionCaptureTarget } from "./vision-capture-target.js";

/**
 * Options for the Vision Review engine.
 */
export interface VisionReviewOptions extends ReviewRedactionOptions {
  /** URL or local path to the page to review */
  urlOrPath: string;
  /** The type of expert to use (must match a name in the persona library) */
  expert: string;
  /** Path to save the review result (optional) */
  outputPath?: string;
  /** Viewport width for the screenshot (default: 1280) */
  width?: number;
  /** Viewport height for the screenshot (default: 720) */
  height?: number;
  /** Specific section IDs to capture (optional) */
  sections?: string[];
  /** The vision-capable Ollama model ID to use (default: env.VISION_MODEL or 'qwen3-vl:30b') */
  model?: string;
  /** Path to the persona Markdown library (optional) */
  promptLibraryPath?: string;
  /** Path to the brand/project context JSON (optional) */
  contextPath?: string;
  /** Base URL for the Ollama API (optional) */
  ollamaUrl?: string;
  /** Custom mapping of expert types to persona names (optional) */
  expertMap?: Record<string, string>;
  /** Custom CSS to inject before taking the screenshot (optional) */
  customCss?: string;
  /** Optional orchestrator to prepare the environment */
  orchestrator?: { prepareForOllama: () => Promise<void> };
}

/**
 * Run a visual audit of a page using a vision-capable LLM.
 *
 * @param options - Review configuration options.
 * @returns The review feedback as a Markdown string.
 */
export async function runVisionReview(options: VisionReviewOptions): Promise<string> {
  const OLLAMA_URL = getDefaultOllamaUrl();
  const VISION_MODEL = getDefaultVisionReviewModel();
  const { urlOrPath } = options;
  const expertType = options.expert || "UI/UX";
  const outputPath = options.outputPath;
  const width = options.width || 1280;
  const height = options.height || 720;
  const visionModel = options.model || VISION_MODEL;
  const sectionList = options.sections || [];
  const ollamaUrl = options.ollamaUrl || OLLAMA_URL;
  const sanitizedSource = sanitizeReviewSurfaceValue(urlOrPath, {
    extraRedactions: options.extraRedactions,
  });
  const summarizedSectionLabels = sectionList.map((_, index) => `section-${index + 1}`);

  // 1. Take Screenshots
  const screenshotPaths: string[] = [];
  const tempFiles: string[] = [];
  let cleanupCaptureTarget: (() => Promise<void>) | undefined;

  const capture = async (target: string, label: string, capOptions: any) => {
    const p = path.resolve(
      os.tmpdir(),
      `aiql_screenshot_${label}_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`,
    );
    try {
      await takeScreenshot(target, p, capOptions);
      screenshotPaths.push(p);
      tempFiles.push(p);
    } catch (err) {
      getLogger().error(
        `Failed to take screenshot of ${label}: ${summarizeReviewSurfaceError(
          err,
          {
            extraRedactions: options.extraRedactions,
          },
        )}`,
      );
    }
  };

  try {
    const isLocalImage =
      /\.(png|jpe?g|webp)$/i.test(urlOrPath) && fsSync.existsSync(urlOrPath);
    if (isLocalImage) {
      screenshotPaths.push(path.resolve(urlOrPath));
      getLogger().info(
        `Using existing image file for review: ${sanitizedSource}`,
      );
    } else {
      const preparedTarget = await prepareVisionCaptureTarget(
        urlOrPath,
        options.customCss,
      );
      cleanupCaptureTarget = preparedTarget.cleanup;
      const captureTarget = preparedTarget.target;

      if (captureTarget !== urlOrPath) {
        getLogger().info("Prepared a temporary styled HTML capture target");
      }

      if (sectionList.length > 0) {
        for (const [index, section] of sectionList.entries()) {
          await capture(`${captureTarget}#${section}`, summarizedSectionLabels[index], {
            width,
            height,
            extraRedactions: options.extraRedactions,
          });
        }
      } else {
        await capture(captureTarget, "full", {
          width,
          height: 6000,
          extraRedactions: options.extraRedactions,
        });
      }
    }
  } finally {
    await cleanupCaptureTarget?.();
  }

  if (screenshotPaths.length === 0) {
    throw new Error("No screenshots were captured.");
  }

  try {
    const { personaName, personaPrompt } = await loadPersonaPrompt({
      expert: expertType,
      promptLibraryPath: options.promptLibraryPath,
      expertMap: options.expertMap,
    });
    const brand = await loadReviewContext(options.contextPath);

    getLogger().info(
      `[Vision Review] Using Expert: ${personaName} | Model: ${visionModel} | Images: ${screenshotPaths.length}`,
    );

    // 4. Orchestrate VRAM if needed
    if (options.orchestrator) {
      await options.orchestrator.prepareForOllama();
    }

    // 5. Run Vision Analysis
    const imagesBase64 = await Promise.all(
      screenshotPaths.map((p) => imageToBase64(p)),
    );

    const finalPrompt = buildReviewEnvelope({
      personaPrompt,
      context: brand,
      extraRedactions: options.extraRedactions,
      taskInstructions: [
        `You are reviewing screenshots captured from this source: ${sanitizedSource}.`,
        sectionList.length > 0
          ? `The screenshots focus on ${sectionList.length} explicitly targeted section(s): ${summarizedSectionLabels.join(", ")}.`
          : 'The screenshots represent a "full page" capture, scrolling down from the hero section.',
        "Focus your analysis on the visual design, layout, usability, hierarchy, and consistency through the lens of your persona.",
      ].join("\n"),
      sections: prepareReviewMaterialSections([
        {
          heading: "REVIEW INPUT MATERIAL",
          items: [
            ...prepareReviewEvidenceDescriptorItems(
              [
                {
                  label: "Source",
                  value: urlOrPath,
                },
              ],
              {
                extraRedactions: options.extraRedactions,
              },
            ),
            ...prepareReviewMetadataItems(
              [
                {
                  label: "Attached image count",
                  value: screenshotPaths.length,
                  sanitizeValue: false,
                },
                {
                  label: "Capture mode",
                  value:
                    sectionList.length > 0
                      ? "targeted section screenshots"
                      : "full-page screenshot",
                  sanitizeValue: false,
                },
                {
                  label: "Captured section references",
                  value:
                    sectionList.length > 0
                      ? summarizedSectionLabels.join(", ")
                      : undefined,
                  sanitizeValue: false,
                },
              ],
              {
                extraRedactions: options.extraRedactions,
              },
            ),
          ],
        },
      ]),
    });

    const text = await callOllamaVision({
      ollamaUrl,
      model: visionModel,
      prompt: finalPrompt,
      imagesBase64,
      temperature: 0.2,
    });

    getLogger().info("\n--- VISION " + personaName.toUpperCase() + " REVIEW ---");
    getLogger().info(text);
    getLogger().info("---------------------\n");

    if (outputPath) {
      const absoluteOutputPath = await writeReviewOutput(outputPath, text);
      getLogger().info(
        `Review saved to: ${summarizeReviewOutputReference(
          absoluteOutputPath,
          process.cwd(),
          {
            extraRedactions: options.extraRedactions,
          },
        )}`,
      );
    }

    return text;
  } catch (error) {
    getLogger().error(
      `Error during Vision review: ${summarizeReviewSurfaceError(error, {
        extraRedactions: options.extraRedactions,
      })}`,
    );
    throw error;
  } finally {
    // Cleanup temporary screenshots.
    for (const p of tempFiles) {
      if (fsSync.existsSync(p)) {
        fsSync.unlinkSync(p);
      }
    }
  }
}
