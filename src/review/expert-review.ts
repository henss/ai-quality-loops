import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../shared/io.js";
import { getLogger } from "../shared/logger.js";
import { generateTextWithOllama } from "../shared/ollama.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Options for the Expert Review engine.
 */
export interface ExpertReviewOptions {
  /** The type of expert to use (must match a name in the persona library) */
  expert: string;
  /** The content to review (raw text or path to a file) */
  content: string;
  /** The Ollama model ID to use (default: env.AI_MODEL or 'llama3.2') */
  modelId?: string;
  /** Path to save the review result (optional) */
  outputPath?: string;
  /** Path to the persona Markdown library (optional, falls back to env.PROMPT_LIBRARY_PATH) */
  promptLibraryPath?: string;
  /** Path to the brand/project context JSON (optional, falls back to env.CONTEXT_PATH) */
  contextPath?: string;
  /** Base URL for the Ollama API (optional, falls back to env.OLLAMA_HOST or 'http://127.0.0.1:11434') */
  ollamaUrl?: string;
  /** Custom mapping of expert types to persona names (optional) */
  expertMap?: Record<string, string>;
  /** Optional orchestrator to prepare the environment (e.g. VRAM management) */
  orchestrator?: { prepareForOllama: () => Promise<void> };
}

const DEFAULT_MODEL = process.env.AI_MODEL || "llama3.2";
const OLLAMA_URL =
  process.env.OLLAMA_HOST || process.env.OLLAMA_URL || "http://127.0.0.1:11434";

/**
 * Run a text-based expert review using an LLM persona.
 *
 * @param options - Review configuration options.
 * @returns The review feedback as a Markdown string.
 */
export async function runExpertReview(options: ExpertReviewOptions): Promise<string> {
  const expertType = options.expert;
  const contentInput = options.content;
  const modelId = options.modelId || DEFAULT_MODEL;
  const outputPath = options.outputPath;
  const ollamaUrl = (options.ollamaUrl || OLLAMA_URL).replace(/\/$/, "");

  // Load content
  const loadContent = async (input: string) => {
    try {
      const stats = await fs.stat(input).catch(() => null);
      if (stats && stats.isFile()) {
        return await fs.readFile(input, "utf-8");
      }
    } catch (e) {}
    return input;
  };

  const contentText = await loadContent(contentInput);

  // Load Expert Prompt
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
    throw new Error(`Could not find persona prompt for: ${personaName}`);
  }

  const personaPrompt = personaMatch[0].trim();

  // Load brand context
  const brandPath =
    options.contextPath ||
    (process.env.CONTEXT_PATH
      ? path.resolve(process.env.CONTEXT_PATH)
      : path.resolve(process.cwd(), "context.json"));
  let brand: any = {};
  try {
    brand = await readJson<any>(brandPath);
  } catch (err) {}

  getLogger().info(
    `[Expert Review] Using Expert: ${personaName} | Model: ${modelId}`,
  );

  // Orchestrate VRAM if needed
  if (options.orchestrator) {
    await options.orchestrator.prepareForOllama();
  }

  const finalPrompt = `
${personaPrompt}

## CONTEXT
${JSON.stringify(brand || {}, null, 2)}

## CONTENT TO REVIEW
---
${contentText}
---

Provide your critical feedback based on your persona. Output in Markdown.
`;

  try {
    const text = await generateTextWithOllama({
      ollamaUrl,
      model: modelId,
      prompt: finalPrompt,
      temperature: 0.7,
    });

    getLogger().info("\n--- " + personaName.toUpperCase() + " REVIEW ---");
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
    getLogger().error("Error during Expert review:", error);
    throw error;
  }
}
