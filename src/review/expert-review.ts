import { getLogger } from "../shared/logger.js";
import { generateTextWithOllama } from "../shared/ollama.js";
import { resolveFromCwd, writeJson } from "../shared/io.js";
import {
  getDefaultExpertReviewModel,
  getDefaultOllamaUrl,
} from "../shared/models.js";
import { summarizeReviewSurfaceError } from "../shared/review-surface.js";
import {
  buildReviewEnvelope,
  loadReviewContent,
  prepareReviewInputMaterialSections,
  prepareReviewMaterialSections,
  loadReviewContext,
  type ReviewRedactionOptions,
  summarizeReviewInputReference,
  summarizeReviewOutputReference,
  writeReviewOutput,
} from "./shared.js";
import { loadPersonaPrompt } from "./persona-catalog.js";
import {
  buildStructuredReviewResult,
  type StructuredReviewResult,
} from "./review-result.js";

/**
 * Options for the Expert Review engine.
 */
export interface ExpertReviewOptions extends ReviewRedactionOptions {
  /** The type of expert to use (must match a name in the persona library) */
  expert: string;
  /** The content to review (raw text or path to a file) */
  content: string;
  /** The Ollama model ID to use (default: env.AI_MODEL or 'qwen3.5:27b') */
  modelId?: string;
  /** Path to save the review result (optional) */
  outputPath?: string;
  /** Path to save the structured review result JSON (optional) */
  structuredOutputPath?: string;
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
  /** Return a structured review result instead of the raw Markdown string */
  resultFormat?: "markdown" | "structured";
}

/**
 * Run a text-based expert review using an LLM persona.
 *
 * @param options - Review configuration options.
 * @returns The review feedback as Markdown by default, or a structured result when requested.
 */
export async function runExpertReview(
  options: ExpertReviewOptions & { resultFormat: "structured" },
): Promise<StructuredReviewResult>;
export async function runExpertReview(
  options: ExpertReviewOptions,
): Promise<string>;
export async function runExpertReview(
  options: ExpertReviewOptions,
): Promise<string | StructuredReviewResult> {
  const DEFAULT_MODEL = getDefaultExpertReviewModel();
  const OLLAMA_URL = getDefaultOllamaUrl();

  const expertType = options.expert;
  const contentInput = options.content;
  const modelId = options.modelId || DEFAULT_MODEL;
  const outputPath = options.outputPath;
  const structuredOutputPath = options.structuredOutputPath;
  const ollamaUrl = (options.ollamaUrl || OLLAMA_URL).replace(/\/$/, "");
  const contentText = await loadReviewContent(contentInput);
  const summarizedContentSource = await summarizeReviewInputReference(
    contentInput,
    process.cwd(),
    {
      extraRedactions: options.extraRedactions,
    },
  );

  const { personaName, personaPrompt } = await loadPersonaPrompt({
    expert: expertType,
    promptLibraryPath: options.promptLibraryPath,
    expertMap: options.expertMap,
  });
  const brand = await loadReviewContext(options.contextPath);

  getLogger().info(
    `[Expert Review] Using Expert: ${personaName} | Model: ${modelId}`,
  );

  // Orchestrate VRAM if needed
  if (options.orchestrator) {
    await options.orchestrator.prepareForOllama();
  }

  const finalPrompt = buildReviewEnvelope({
    personaPrompt,
    context: brand,
    extraRedactions: options.extraRedactions,
    taskInstructions:
      "Analyze the provided content based on your persona and identify the most important issues, risks, and improvement opportunities.",
    sections: [
      ...prepareReviewInputMaterialSections({
        evidenceDescriptors: [
          {
            label: "Content source",
            descriptor: summarizedContentSource,
          },
        ],
        extraRedactions: options.extraRedactions,
      }),
      {
        heading: "CONTENT TO REVIEW",
        body: contentText,
        fenced: true,
      },
    ],
    outputInstructions: "Provide your critical feedback based on your persona. Output in Markdown.",
  });

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

    const structuredResult = buildStructuredReviewResult({
      workflow: "expert",
      expert: personaName,
      model: modelId,
      markdown: text,
      provenance: [
        {
          label: "Content source",
          value: summarizedContentSource,
        },
      ],
    });

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

    if (structuredOutputPath) {
      const absoluteStructuredOutputPath = resolveFromCwd(structuredOutputPath);
      await writeJson(absoluteStructuredOutputPath, structuredResult, false);
      getLogger().info(
        `Structured review saved to: ${summarizeReviewOutputReference(
          absoluteStructuredOutputPath,
          process.cwd(),
          {
            extraRedactions: options.extraRedactions,
          },
        )}`,
      );
    }

    return options.resultFormat === "structured" ? structuredResult : text;
  } catch (error) {
    getLogger().error(
      `Error during Expert review: ${summarizeReviewSurfaceError(error, {
        extraRedactions: options.extraRedactions,
      })}`,
    );
    throw error;
  }
}
