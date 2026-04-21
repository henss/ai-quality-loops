import { getLogger } from "../shared/logger.js";
import {
  generateTextWithOllamaDetailed,
  type OllamaGenerationTelemetry,
} from "../shared/ollama.js";
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
  formatReviewOperationalReference,
  summarizeReviewInputReference,
  writeReviewOutput,
} from "./shared.js";
import { loadPersonaPrompt } from "./persona-catalog.js";
import {
  buildStructuredReviewResult,
  stripReviewReasoningBlocks,
  type StructuredReviewResult,
} from "./review-result.js";

export interface ExpertReviewDiagnostics {
  elapsedMs: number;
  outputChars: number;
  decisionParsed: boolean;
  ollamaTelemetry?: OllamaGenerationTelemetry;
}

const STRUCTURED_REVIEW_NUM_PREDICT = 4096;
const STRUCTURED_REVIEW_PROGRESS_INTERVAL_MS = 30_000;

const structuredReviewDecisionSchema = {
  type: "object",
  properties: {
    review_decision: {
      type: "object",
      properties: {
        schema: { const: "peer_review_decision_v1" },
        verdict: {
          enum: [
            "accept",
            "accept_with_follow_up",
            "changes_requested",
            "blocked",
            "process_failed",
          ],
        },
        confidence: { enum: ["low", "medium", "high"] },
        blocking: { type: "boolean" },
        max_severity: { enum: ["unknown", "low", "medium", "high", "critical"] },
        summary: { type: "string" },
        blocking_findings: {
          type: "array",
          items: { $ref: "#/$defs/finding" },
        },
        non_blocking_findings: {
          type: "array",
          items: { $ref: "#/$defs/finding" },
        },
        required_before_merge: { type: "array", items: { type: "string" } },
        follow_up: { type: "array", items: { type: "string" } },
        next_step_actions: {
          type: "array",
          items: {
            enum: [
              "revise_artifact",
              "collect_more_evidence",
              "rerun_review",
              "request_caller_review",
              "track_follow_up",
            ],
          },
        },
      },
      required: [
        "schema",
        "verdict",
        "confidence",
        "blocking",
        "max_severity",
        "summary",
        "blocking_findings",
        "non_blocking_findings",
        "required_before_merge",
        "follow_up",
        "next_step_actions",
      ],
      additionalProperties: false,
    },
  },
  required: ["review_decision"],
  additionalProperties: false,
  $defs: {
    finding: {
      type: "object",
      properties: {
        severity: { enum: ["unknown", "low", "medium", "high", "critical"] },
        key: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        recommendation: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
      },
      required: ["severity", "title", "summary"],
      additionalProperties: false,
    },
  },
};

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
  /** Ollama keep_alive duration for the loaded model (optional, defaults to Ollama helper default) */
  ollamaKeepAlive?: string | number;
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

  const reviewDecisionExample = JSON.stringify(
    {
      review_decision: {
        schema: "peer_review_decision_v1",
        verdict:
          "accept | accept_with_follow_up | changes_requested | blocked | process_failed",
        confidence: "low | medium | high",
        blocking: false,
        max_severity: "unknown | low | medium | high | critical",
        summary: "One concise sentence with the review decision.",
        blocking_findings: [],
        non_blocking_findings: [
          {
            key: "short-stable-finding-key",
            severity: "low | medium | high | critical | unknown",
            title: "Short finding title",
            summary: "One concise finding summary.",
          },
        ],
        required_before_merge: [],
        follow_up: [],
        next_step_actions: ["track_follow_up"],
      },
    },
    null,
    2,
  );
  const outputInstructions =
    options.resultFormat === "structured"
      ? [
          "Return only valid JSON. Do not include Markdown, commentary, code fences, or hidden reasoning.",
          "The top-level JSON object must contain `review_decision` using this shape:",
          reviewDecisionExample,
          "When reporting a finding, include a stable, generic `key` when you can name the same issue across repeated runs. Keep it lowercase, concise, and free of private names, paths, URLs, account identifiers, or tracker IDs.",
          "Use `accept` only when no before-merge work is required. Use `accept_with_follow_up` when the work passes but follow-up hardening or cleanup remains. Use `changes_requested` or `blocked` for findings that should fail the gate.",
          "Populate `next_step_actions` with only safe generic action labels: `revise_artifact`, `collect_more_evidence`, `rerun_review`, `request_caller_review`, or `track_follow_up`.",
        ].join("\n")
      : [
          "Provide your review in Markdown.",
          "",
          "End with exactly one fenced JSON block whose top-level object contains `review_decision` using this shape:",
          "```json",
          reviewDecisionExample,
          "```",
          "When reporting a finding, include a stable, generic `key` when you can name the same issue across repeated runs. Keep it lowercase, concise, and free of private names, paths, URLs, account identifiers, or tracker IDs.",
          "Use `accept` only when no before-merge work is required. Use `accept_with_follow_up` when the work passes but follow-up hardening or cleanup remains. Use `changes_requested` or `blocked` for findings that should fail the gate.",
          "Populate `next_step_actions` with only safe generic action labels: `revise_artifact`, `collect_more_evidence`, `rerun_review`, `request_caller_review`, or `track_follow_up`.",
        ].join("\n");

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
    outputInstructions,
  });

  try {
    const generation = await generateTextWithOllamaDetailed({
      ollamaUrl,
      model: modelId,
      prompt: finalPrompt,
      format:
        options.resultFormat === "structured"
          ? structuredReviewDecisionSchema
          : undefined,
      temperature: options.resultFormat === "structured" ? 0.1 : 0.7,
      keepAlive: options.ollamaKeepAlive,
      numPredict:
        options.resultFormat === "structured"
          ? STRUCTURED_REVIEW_NUM_PREDICT
          : undefined,
      progressIntervalMs: STRUCTURED_REVIEW_PROGRESS_INTERVAL_MS,
      onProgress: (progress) => {
        getLogger().info(
          `[Expert Review] ${personaName} still generating after ${Math.round(
            progress.elapsedMs / 1000,
          )}s (${progress.generatedChars} chars).`,
        );
      },
    });
    const reviewMarkdown = stripReviewReasoningBlocks(generation.text);

    getLogger().info(
      `[Expert Review] ${personaName} review completed; markdown output omitted from console (${reviewMarkdown.length} chars).`,
    );

    const structuredResult = buildStructuredReviewResult({
      workflow: "expert",
      expert: personaName,
      model: modelId,
      markdown: reviewMarkdown,
      provenance: [
        {
          label: "Content source",
          value: summarizedContentSource,
        },
      ],
      extraRedactions: options.extraRedactions,
    });
    const decisionParsed = Boolean(structuredResult.decision);
    const diagnostics = {
      elapsedMs: generation.elapsedMs,
      outputChars: generation.generatedChars,
      decisionParsed,
      ollamaTelemetry: generation.telemetry,
    } satisfies ExpertReviewDiagnostics;
    Object.assign(structuredResult, { diagnostics });

    if (outputPath) {
      const absoluteOutputPath = await writeReviewOutput(outputPath, reviewMarkdown);
      getLogger().info(
        `Review saved to: ${formatReviewOperationalReference(
          absoluteOutputPath,
          process.cwd(),
        )}`,
      );
    }

    if (options.resultFormat === "structured" && !decisionParsed) {
      const error = new Error(
        "Structured expert review did not emit a valid peer_review_decision_v1 JSON object.",
      );
      Object.assign(error, { diagnostics });
      throw error;
    }

    if (structuredOutputPath) {
      const absoluteStructuredOutputPath = resolveFromCwd(structuredOutputPath);
      await writeJson(absoluteStructuredOutputPath, structuredResult, false);
      getLogger().info(
        `Structured review saved to: ${formatReviewOperationalReference(
          absoluteStructuredOutputPath,
          process.cwd(),
        )}`,
      );
    }

    return options.resultFormat === "structured" ? structuredResult : reviewMarkdown;
  } catch (error) {
    getLogger().error(
      `Error during Expert review: ${summarizeReviewSurfaceError(error, {
        extraRedactions: options.extraRedactions,
      })}`,
    );
    throw error;
  }
}
