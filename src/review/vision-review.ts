import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { readJson } from "../shared/io.js";
import { getLogger } from "../shared/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { callOllamaVision, imageToBase64 } from "../shared/ollama.js";
import { takeScreenshot } from "../utils/screenshot.js";

/**
 * Options for the Vision Review engine.
 */
export interface VisionReviewOptions {
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
  /** The vision-capable Ollama model ID to use (default: env.VISION_MODEL or 'llama3.2-vision') */
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

const OLLAMA_URL =
  process.env.OLLAMA_HOST || process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const VISION_MODEL = process.env.VISION_MODEL || "llama3.2-vision";

/**
 * Run a visual audit of a page using a vision-capable LLM.
 *
 * @param options - Review configuration options.
 * @returns The review feedback as a Markdown string.
 */
export async function runVisionReview(options: VisionReviewOptions): Promise<string> {
  const { urlOrPath } = options;
  const expertType = options.expert || "UI/UX";
  const outputPath = options.outputPath;
  const width = options.width || 1280;
  const height = options.height || 720;
  const visionModel = options.model || VISION_MODEL;
  const sectionList = options.sections || [];
  const ollamaUrl = options.ollamaUrl || OLLAMA_URL;

  // 1. Take Screenshots
  const screenshotPaths: string[] = [];

  const capture = async (target: string, label: string, capOptions: any) => {
    const p = path.resolve(
      os.tmpdir(),
      `aiql_screenshot_${label}_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`,
    );
    try {
      await takeScreenshot(target, p, capOptions);
      screenshotPaths.push(p);
    } catch (err) {
      getLogger().error(`Failed to take screenshot of ${label}:`, err);
    }
  };

  try {
    if (options.customCss && urlOrPath.endsWith(".html")) {
      const htmlContent = await fs.readFile(urlOrPath, "utf-8");
      if (!htmlContent.includes('id="custom-vision-fix"')) {
        const fix = `
  <style id="custom-vision-fix">
    ${options.customCss}
  </style>
`;
        const updated = htmlContent.replace("</head>", `${fix}</head>`);
        await fs.writeFile(urlOrPath, updated);
        getLogger().info("Applied custom CSS fix to HTML file");
      }
    }

    if (sectionList.length > 0) {
      for (const section of sectionList) {
        await capture(`${urlOrPath}#${section}`, section, {
          width,
          height,
        });
      }
    } else {
      await capture(urlOrPath, "full", { width, height: 6000 });
    }
  } finally {
    // CLEANUP HTML FIX if we edited it
    if (options.customCss && urlOrPath.endsWith(".html")) {
      try {
        const htmlContent = await fs.readFile(urlOrPath, "utf-8");
        if (htmlContent.includes('id="custom-vision-fix"')) {
          const cleaned = htmlContent.replace(
            /<style id="custom-vision-fix">[\s\S]*?<\/style>/,
            "",
          );
          await fs.writeFile(urlOrPath, cleaned);
          console.log("Cleaned up custom CSS fix in HTML file");
        }
      } catch (err) {}
    }
  }

  if (screenshotPaths.length === 0) {
    throw new Error("No screenshots were captured.");
  }

  // 2. Load Expert Prompt
  let promptLibraryPath =
    options.promptLibraryPath || process.env.PROMPT_LIBRARY_PATH;
  if (!promptLibraryPath) {
    const defaultInCwd = path.resolve(process.cwd(), "personas.md");
    if (fsSync.existsSync(defaultInCwd)) {
      promptLibraryPath = defaultInCwd;
    } else {
      promptLibraryPath = path.resolve(__dirname, "../../personas/universal.md");
    }
  } else {
    promptLibraryPath = path.resolve(promptLibraryPath);
  }

  if (!fsSync.existsSync(promptLibraryPath)) {
    throw new Error(`Persona library not found at: ${promptLibraryPath}`);
  }

  const promptLibrary = await fs.readFile(promptLibraryPath, "utf-8");

  const expertMap: Record<string, string> = options.expertMap || {
    "UI/UX": "SKEPTICAL UI/UX CRITIC",
    Efficiency: "REPOSITORY & AI EFFICIENCY SPECIALIST",
  };

  const personaName = expertMap[expertType] || expertType;
  const escapedPersona = personaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const personaRegex = new RegExp(
    `(?:### LLM COMMITTEE PERSONA: \\d+\\. |#{1,3} )${escapedPersona}[\\s\\S]*?(?=(?:### LLM COMMITTEE PERSONA|#{1,3} [^\\n]+)|$)`,
    "i",
  );
  const personaMatch = promptLibrary.match(personaRegex);

  if (!personaMatch) {
    for (const p of screenshotPaths)
      if (fsSync.existsSync(p)) fsSync.unlinkSync(p);
    throw new Error(`Could not find persona prompt for: ${personaName}`);
  }

  const personaPrompt = personaMatch[0].trim();

  // 3. Load Brand Context
  const brandPath =
    options.contextPath ||
    (process.env.CONTEXT_PATH
      ? path.resolve(process.env.CONTEXT_PATH)
      : path.resolve(process.cwd(), "context.json"));
  let brand: any = {};
  try {
    brand = await readJson<any>(brandPath);
  } catch (err) {}

  console.info(
    `[Vision Review] Using Expert: ${personaName} | Model: ${visionModel} | Images: ${screenshotPaths.length}`,
  );

  // 4. Orchestrate VRAM if needed
  if (options.orchestrator) {
    await options.orchestrator.prepareForOllama();
  }

  // 5. Run Vision Analysis
  try {
    const imagesBase64 = await Promise.all(
      screenshotPaths.map((p) => imageToBase64(p)),
    );

    const finalPrompt = `
${personaPrompt}

## CONTEXT
${JSON.stringify(brand || {}, null, 2)}

## TASK
You are looking at a screenshot of a website (${urlOrPath}).
The screenshot is a "full page" capture, scrolling down from the hero section.

Please focus your analysis on the visual design, layout, and usability.

Analyze the visual design, layout, and usability based on your persona.

How is the visual hierarchy and consistency?

Provide your critical feedback in Markdown.
`;

    const text = await callOllamaVision({
      ollamaUrl: ollamaUrl,
      model: visionModel,
      prompt: finalPrompt,
      imagesBase64,
      temperature: 0.2,
    });

    getLogger().info("\n--- VISION " + personaName.toUpperCase() + " REVIEW ---");
    getLogger().info(text);
    getLogger().info("---------------------\n");

    if (outputPath) {
      const absoluteOutputPath = path.isAbsolute(outputPath)
        ? outputPath
        : path.resolve(process.cwd(), outputPath);
      await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
      await fs.writeFile(absoluteOutputPath, text);
      getLogger().info(`Review saved to: ${absoluteOutputPath}`);
    }

    return text;
  } catch (error) {
    getLogger().error("Error during Vision review:", error);
    throw error;
  } finally {
    // Cleanup
    for (const p of screenshotPaths) {
      if (fsSync.existsSync(p)) {
        fsSync.unlinkSync(p);
      }
    }
  }
}
