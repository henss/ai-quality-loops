import { execa } from "execa";
import {
  generateTextWithOllamaDetailed,
  type DetailedOllamaGenerationResult,
} from "../shared/ollama.js";
import { getDefaultExpertReviewModel, getDefaultOllamaUrl } from "../shared/models.js";
import { resolveFromCwd, writeJson } from "../shared/io.js";
import { loadPersonaPrompt } from "./persona-catalog.js";
import {
  buildReviewEnvelope,
  loadReviewContent,
  loadReviewContext,
  prepareReviewInputMaterialSections,
  writeReviewOutput,
  type ReviewRedactionOptions,
} from "./shared.js";

export type QualityReviewProvider = "ollama" | "codex" | "claude";
export type QualityReviewStatus = "passed" | "failed" | "process_failed";

export interface QualityReviewSubject {
  kind: string;
  objective: string;
  successCriteria: string[];
  outcomePath?: string;
  promptPath?: string;
  changedPaths?: string[];
  content?: string;
}

export interface QualityReviewResult {
  status: QualityReviewStatus;
  provider: QualityReviewProvider;
  model?: string;
  summary: string;
  reviewArtifactPath?: string;
  requiredRepairs: string[];
  rawText: string;
}

export interface QualityReviewProviderOptions {
  provider: QualityReviewProvider;
  model?: string;
  cwd?: string;
  command?: string;
  extraArgs?: string[];
  ollamaUrl?: string;
  ollamaKeepAlive?: string | number;
}

export interface RunQualityReviewOptions extends ReviewRedactionOptions {
  subject: QualityReviewSubject;
  provider: QualityReviewProviderOptions;
  expert?: string;
  promptLibraryPath?: string;
  contextPath?: string;
  outputPath?: string;
  structuredOutputPath?: string;
  runCommand?: QualityReviewCommandRunner;
  generateWithOllama?: QualityReviewOllamaGenerator;
}

export type QualityReviewCommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string; input: string },
) => Promise<{ stdout: string; stderr: string }>;

export type QualityReviewOllamaGenerator = (options: {
  ollamaUrl: string;
  model: string;
  prompt: string;
  keepAlive?: string | number;
}) => Promise<DetailedOllamaGenerationResult>;

interface ParsedProviderDecision {
  status: QualityReviewStatus;
  summary: string;
  requiredRepairs: string[];
}

const DEFAULT_EXPERT = "EVIDENCE REVIEWER";

export async function runQualityReview(
  options: RunQualityReviewOptions,
): Promise<QualityReviewResult> {
  const cwd = options.provider.cwd ?? process.cwd();
  const provider = options.provider.provider;
  const model = options.provider.model ?? defaultProviderModel(provider);
  const prompt = await buildProviderReviewPrompt(options, cwd);
  const rawText = await runProviderPrompt({
    provider: options.provider,
    prompt,
    model,
    cwd,
    runCommand: options.runCommand ?? runCliCommand,
    generateWithOllama: options.generateWithOllama ?? runOllamaPrompt,
  });
  const parsed = parseProviderDecision(rawText);
  const result: QualityReviewResult = {
    status: parsed.status,
    provider,
    model,
    summary: parsed.summary,
    requiredRepairs: parsed.requiredRepairs,
    rawText,
  };

  if (options.outputPath) {
    result.reviewArtifactPath = await writeReviewOutput(options.outputPath, rawText, cwd);
  }
  if (options.structuredOutputPath) {
    await writeJson(resolveFromCwd(options.structuredOutputPath, cwd), result, false);
  }

  return result;
}

async function buildProviderReviewPrompt(
  options: RunQualityReviewOptions,
  cwd: string,
): Promise<string> {
  const subject = options.subject;
  const { personaPrompt } = await loadPersonaPrompt({
    expert: options.expert ?? DEFAULT_EXPERT,
    promptLibraryPath: options.promptLibraryPath,
  });
  const context = await loadReviewContext(options.contextPath, cwd);
  const content = await buildSubjectContent(subject, cwd);
  return buildReviewEnvelope({
    personaPrompt,
    context,
    extraRedactions: options.extraRedactions,
    taskInstructions:
      "Review the provided agent work outcome. Decide whether it satisfies the objective and success criteria, identify any required repairs, and avoid broad follow-up suggestions that are not needed before acceptance.",
    sections: [
      ...prepareReviewInputMaterialSections({
        evidenceDescriptors: [
          { label: "Subject kind", descriptor: subject.kind },
          { label: "Outcome path", value: subject.outcomePath },
          { label: "Prompt path", value: subject.promptPath },
        ],
        metadataItems: [
          { label: "Objective", value: subject.objective, sanitizeValue: false },
          {
            label: "Success criteria",
            value: subject.successCriteria.join("; "),
            sanitizeValue: false,
          },
          { label: "Changed paths", value: subject.changedPaths?.join(", ") },
        ],
        extraRedactions: options.extraRedactions,
      }),
      {
        heading: "REVIEW SUBJECT",
        body: content,
        fenced: true,
      },
    ],
    outputInstructions: [
      "Return a concise review followed by exactly one fenced JSON block.",
      "The JSON block must use this shape:",
      "```json",
      JSON.stringify(
        {
          quality_review_decision: {
            schema: "quality_review_decision_v1",
            status: "passed | failed | process_failed",
            summary: "one concise sentence",
            required_repairs: [],
          },
        },
        null,
        2,
      ),
      "```",
      "Use `passed` only when no required repair remains. Use `failed` when implementation or evidence must be repaired. Use `process_failed` when the review could not inspect enough evidence.",
    ].join("\n"),
  });
}

async function buildSubjectContent(
  subject: QualityReviewSubject,
  cwd: string,
): Promise<string> {
  const blocks = [];
  if (subject.content) {
    blocks.push(subject.content);
  }
  if (subject.promptPath) {
    blocks.push(`## Launch Prompt\n\n${await loadReviewContent(subject.promptPath, cwd)}`);
  }
  if (subject.outcomePath) {
    blocks.push(`## Outcome\n\n${await loadReviewContent(subject.outcomePath, cwd)}`);
  }
  return blocks.join("\n\n").trim() || "[No review content supplied]";
}

async function runProviderPrompt(input: {
  provider: QualityReviewProviderOptions;
  prompt: string;
  model: string;
  cwd: string;
  runCommand: QualityReviewCommandRunner;
  generateWithOllama: QualityReviewOllamaGenerator;
}): Promise<string> {
  if (input.provider.provider === "ollama") {
    return (
      await input.generateWithOllama({
        ollamaUrl: input.provider.ollamaUrl ?? getDefaultOllamaUrl(),
        model: input.model,
        prompt: input.prompt,
        keepAlive: input.provider.ollamaKeepAlive,
      })
    ).text;
  }
  const { command, args } = buildProviderCommand(input.provider, input.model);
  const result = await input.runCommand(command, args, {
    cwd: input.cwd,
    input: input.prompt,
  });
  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

export function buildProviderCommand(
  provider: QualityReviewProviderOptions,
  model: string,
): { command: string; args: string[] } {
  if (provider.provider === "codex") {
    return {
      command: provider.command ?? "codex",
      args: [
        "exec",
        "--cd",
        provider.cwd ?? process.cwd(),
        "--model",
        model,
        "-",
        ...(provider.extraArgs ?? []),
      ],
    };
  }
  if (provider.provider === "claude") {
    return {
      command: provider.command ?? "claude",
      args: [
        "--print",
        "--permission-mode",
        "plan",
        "--model",
        model,
        ...(provider.extraArgs ?? []),
        "-",
      ],
    };
  }
  return { command: provider.command ?? "ollama", args: [] };
}

function parseProviderDecision(text: string): ParsedProviderDecision {
  const parsed = parseDecisionJson(text);
  if (!parsed) {
    return {
      status: "process_failed",
      summary: "Review provider did not emit a parseable quality_review_decision_v1 block.",
      requiredRepairs: ["Rerun review with structured output enabled."],
    };
  }
  return parsed;
}

function parseDecisionJson(text: string): ParsedProviderDecision | undefined {
  const candidates = [
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1]),
    text,
  ];
  for (const candidate of candidates) {
    try {
      const decision = (JSON.parse(candidate ?? "") as {
        quality_review_decision?: {
          schema?: string;
          status?: string;
          summary?: string;
          required_repairs?: string[];
        };
      }).quality_review_decision;
      if (decision?.schema !== "quality_review_decision_v1") {
        continue;
      }
      if (!isQualityReviewStatus(decision.status)) {
        continue;
      }
      return {
        status: decision.status,
        summary: decision.summary || "Review completed without a summary.",
        requiredRepairs: Array.isArray(decision.required_repairs)
          ? decision.required_repairs.filter((item): item is string => typeof item === "string")
          : [],
      };
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function isQualityReviewStatus(value: unknown): value is QualityReviewStatus {
  return value === "passed" || value === "failed" || value === "process_failed";
}

async function runCliCommand(
  command: string,
  args: string[],
  options: { cwd: string; input: string },
): Promise<{ stdout: string; stderr: string }> {
  const result = await execa(command, args, {
    cwd: options.cwd,
    input: options.input,
    reject: false,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `${command} review provider failed with exit code ${result.exitCode}: ${result.stderr}`,
    );
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

async function runOllamaPrompt(options: {
  ollamaUrl: string;
  model: string;
  prompt: string;
  keepAlive?: string | number;
}): Promise<DetailedOllamaGenerationResult> {
  return generateTextWithOllamaDetailed({
    ollamaUrl: options.ollamaUrl,
    model: options.model,
    prompt: options.prompt,
    keepAlive: options.keepAlive,
    temperature: 0.1,
    numPredict: 4096,
  });
}

function defaultProviderModel(provider: QualityReviewProvider): string {
  if (provider === "claude") {
    return "sonnet";
  }
  if (provider === "codex") {
    return "gpt-5.2";
  }
  return getDefaultExpertReviewModel();
}
