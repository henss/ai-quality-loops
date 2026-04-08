import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, resolveFromCwd } from "../shared/io.js";
import {
  type ReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
} from "../shared/review-surface.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_EXPERT_ALIASES: Record<string, string> = {
  "UI/UX": "SKEPTICAL UI/UX CRITIC",
  Efficiency: "REPOSITORY & AI EFFICIENCY SPECIALIST",
};

export interface LoadPersonaPromptOptions {
  expert: string;
  promptLibraryPath?: string;
  expertMap?: Record<string, string>;
}

export interface LoadedPersonaPrompt {
  personaName: string;
  personaPrompt: string;
  promptLibraryPath: string;
}

export interface ReviewEnvelopeSection {
  heading: string;
  body: string;
  fenced?: boolean;
}

export interface ReviewMaterialInput {
  heading: string;
  body?: string;
  items?: Array<string | null | undefined | false>;
  fenced?: boolean;
}

export interface ReviewMetadataItemInput {
  label: string;
  value?: string | number | boolean | null | undefined;
  sanitizeValue?: boolean;
}

export interface ReviewEvidenceDescriptorItemInput {
  label: string;
  value?: string | null | undefined;
  descriptor?: string | null | undefined;
  maxLength?: number;
}

export interface ReviewInputMaterialSectionOptions extends ReviewRedactionOptions {
  heading?: string;
  evidenceDescriptors?: ReviewEvidenceDescriptorItemInput[];
  metadataItems?: ReviewMetadataItemInput[];
}

export interface BuildReviewEnvelopeOptions {
  personaPrompt: string;
  context?: Record<string, unknown>;
  taskInstructions: string;
  sections?: ReviewEnvelopeSection[];
  outputInstructions?: string;
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface SanitizeReviewContextOptions {
  maxDepth?: number;
  maxArrayItems?: number;
  maxStringLength?: number;
  sensitiveKeyPattern?: RegExp;
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface ReviewRedactionOptions {
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface SummarizeReviewPathReferenceOptions extends ReviewRedactionOptions {
  cwd?: string;
}

const DEFAULT_SANITIZE_REVIEW_CONTEXT_OPTIONS: Required<SanitizeReviewContextOptions> =
  {
    maxDepth: 4,
    maxArrayItems: 10,
    maxStringLength: 500,
    extraRedactions: [],
    sensitiveKeyPattern:
      /(secret|token|password|passwd|pwd|api[-_]?key|auth|authorization|cookie|session|credential|private[-_]?key)/i,
  };

function truncateContextString(value: string, maxStringLength: number): string {
  if (value.length <= maxStringLength) {
    return value;
  }

  return `${value.slice(0, maxStringLength)}... [truncated ${value.length - maxStringLength} chars]`;
}

export function sanitizeReviewContext(
  value: unknown,
  options: SanitizeReviewContextOptions = {},
): unknown {
  const config = {
    ...DEFAULT_SANITIZE_REVIEW_CONTEXT_OPTIONS,
    ...options,
  };

  const visit = (current: unknown, depth: number): unknown => {
    if (current === null || current === undefined) {
      return current;
    }

    if (
      typeof current === "boolean" ||
      typeof current === "number" ||
      typeof current === "bigint"
    ) {
      return current;
    }

    if (typeof current === "string") {
      return sanitizeReviewSurfaceValue(current, {
        maxLength: config.maxStringLength,
        extraRedactions: config.extraRedactions,
      });
    }

    if (Array.isArray(current)) {
      if (depth >= config.maxDepth) {
        return `[Truncated array: max depth ${config.maxDepth} reached]`;
      }

      const limitedItems = current
        .slice(0, config.maxArrayItems)
        .map((item) => visit(item, depth + 1));
      const remainingCount = current.length - limitedItems.length;

      if (remainingCount > 0) {
        limitedItems.push(`[${remainingCount} more item(s) truncated]`);
      }

      return limitedItems;
    }

    if (typeof current === "object") {
      if (depth >= config.maxDepth) {
        return `[Truncated object: max depth ${config.maxDepth} reached]`;
      }

      const sanitizedEntries = Object.entries(current)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => {
          if (config.sensitiveKeyPattern.test(key)) {
            return [key, "[REDACTED]"] as const;
          }

          return [key, visit(entryValue, depth + 1)] as const;
        });

      return Object.fromEntries(sanitizedEntries);
    }

    return String(current);
  };

  return visit(value, 0);
}

export function resolvePersonaName(
  expert: string,
  expertMap?: Record<string, string>,
): string {
  return expertMap?.[expert] || DEFAULT_EXPERT_ALIASES[expert] || expert;
}

export function resolvePromptLibraryPath(
  promptLibraryPath?: string,
  cwd = process.cwd(),
): string {
  if (promptLibraryPath) {
    return resolveFromCwd(promptLibraryPath);
  }

  const envPath = process.env.PROMPT_LIBRARY_PATH;
  if (envPath) {
    return resolveFromCwd(envPath);
  }

  const defaultInCwd = path.resolve(cwd, "personas.md");
  if (fsSync.existsSync(defaultInCwd)) {
    return defaultInCwd;
  }

  return path.resolve(__dirname, "../../personas/universal.md");
}

export function resolveReviewContextPath(
  contextPath?: string,
  cwd = process.cwd(),
): string {
  if (contextPath) {
    return resolveFromCwd(contextPath, cwd);
  }

  const envPath = process.env.CONTEXT_PATH;
  if (envPath) {
    return resolveFromCwd(envPath, cwd);
  }

  return path.resolve(cwd, "context.json");
}

export async function loadPersonaPrompt({
  expert,
  promptLibraryPath,
  expertMap,
}: LoadPersonaPromptOptions): Promise<LoadedPersonaPrompt> {
  const resolvedPromptLibraryPath = resolvePromptLibraryPath(promptLibraryPath);
  if (!fsSync.existsSync(resolvedPromptLibraryPath)) {
    throw new Error(`Persona library not found at: ${resolvedPromptLibraryPath}`);
  }

  const promptLibrary = await fs.readFile(resolvedPromptLibraryPath, "utf-8");
  const personaName = resolvePersonaName(expert, expertMap);
  const escapedPersona = personaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const personaRegex = new RegExp(
    `(?:### LLM COMMITTEE PERSONA: \\d+\\. |#{1,3} )${escapedPersona}[\\s\\S]*?(?=(?:### LLM COMMITTEE PERSONA|#{1,3} [^\\n]+)|$)`,
    "i",
  );
  const personaMatch = promptLibrary.match(personaRegex);

  if (!personaMatch) {
    throw new Error(`Could not find persona prompt for: ${personaName}`);
  }

  return {
    personaName,
    personaPrompt: personaMatch[0].trim(),
    promptLibraryPath: resolvedPromptLibraryPath,
  };
}

export async function loadReviewContext(
  contextPath?: string,
  cwd = process.cwd(),
): Promise<Record<string, unknown>> {
  const resolvedContextPath = resolveReviewContextPath(contextPath, cwd);

  try {
    return await readJson<Record<string, unknown>>(resolvedContextPath);
  } catch {
    return {};
  }
}

export async function loadReviewContent(
  input: string,
  cwd = process.cwd(),
): Promise<string> {
  const resolvedInput = resolveFromCwd(input, cwd);

  try {
    const stats = await fs.stat(resolvedInput);
    if (stats.isFile()) {
      return await fs.readFile(resolvedInput, "utf-8");
    }
  } catch {
    return input;
  }

  return input;
}

export async function summarizeReviewInputReference(
  input: string,
  cwd = process.cwd(),
  options: ReviewRedactionOptions = {},
): Promise<string> {
  const resolvedInput = resolveFromCwd(input, cwd);

  try {
    const stats = await fs.stat(resolvedInput);
    if (stats.isFile()) {
      return summarizeReviewPathReference(resolvedInput, {
        cwd,
        extraRedactions: options.extraRedactions,
      });
    }
  } catch {
    // Fall back to a generic inline-content descriptor below.
  }

  return "Inline content";
}

export function summarizeReviewPathReference(
  referencePath: string,
  options: SummarizeReviewPathReferenceOptions = {},
): string {
  const cwd = options.cwd || process.cwd();
  const resolvedReferencePath = resolveFromCwd(referencePath, cwd);

  return sanitizeReviewSurfaceValue(resolvedReferencePath, {
    extraRedactions: options.extraRedactions,
  });
}

export function summarizeReviewOutputReference(
  outputPath: string,
  cwd = process.cwd(),
  options: ReviewRedactionOptions = {},
): string {
  return summarizeReviewPathReference(outputPath, {
    cwd,
    extraRedactions: options.extraRedactions,
  });
}

export async function writeReviewOutput(
  outputPath: string,
  content: string,
  cwd = process.cwd(),
): Promise<string> {
  const absoluteOutputPath = resolveFromCwd(outputPath, cwd);
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, content);
  return absoluteOutputPath;
}

export function prepareReviewMaterialSections(
  materials: ReviewMaterialInput[],
): ReviewEnvelopeSection[] {
  return materials.flatMap((material) => {
    const body = material.body?.trim();
    const itemLines = (material.items || [])
      .filter((item): item is string => Boolean(item && item.trim()))
      .map((item) => `- ${item.trim()}`)
      .join("\n");

    const combinedBody = [body, itemLines].filter(Boolean).join("\n\n").trim();
    if (!combinedBody) {
      return [];
    }

    return [
      {
        heading: material.heading,
        body: combinedBody,
        fenced: material.fenced,
      },
    ];
  });
}

export function prepareReviewMetadataItems(
  items: ReviewMetadataItemInput[],
  options: ReviewRedactionOptions = {},
): string[] {
  return items.flatMap((item) => {
    if (item.value === undefined || item.value === null || item.value === false) {
      return [];
    }

    const rawValue =
      typeof item.value === "string" ? item.value : String(item.value);
    const formattedValue =
      item.sanitizeValue === false
        ? rawValue
        : sanitizeReviewSurfaceValue(rawValue, {
            extraRedactions: options.extraRedactions,
          });

    return `${item.label}: ${formattedValue}`;
  });
}

export function prepareReviewEvidenceDescriptorItems(
  items: ReviewEvidenceDescriptorItemInput[],
  options: ReviewRedactionOptions = {},
): string[] {
  return items.flatMap((item) => {
    const descriptor =
      item.descriptor?.trim() ||
      (item.value
        ? sanitizeReviewSurfaceValue(item.value, {
            ...(item.maxLength === undefined ? {} : { maxLength: item.maxLength }),
            extraRedactions: options.extraRedactions,
          })
        : "");

    if (!descriptor) {
      return [];
    }

    return `${item.label}: ${descriptor}`;
  });
}

export function prepareReviewInputMaterialSections(
  options: ReviewInputMaterialSectionOptions = {},
): ReviewEnvelopeSection[] {
  const items = [
    ...prepareReviewEvidenceDescriptorItems(
      options.evidenceDescriptors || [],
      options,
    ),
    ...prepareReviewMetadataItems(options.metadataItems || [], options),
  ];

  return prepareReviewMaterialSections([
    {
      heading: options.heading || "REVIEW INPUT MATERIAL",
      items,
    },
  ]);
}

export function buildReviewEnvelope({
  personaPrompt,
  context,
  taskInstructions,
  sections = [],
  outputInstructions = "Provide your critical feedback in Markdown.",
  extraRedactions = [],
}: BuildReviewEnvelopeOptions): string {
  const sanitizedContext = sanitizeReviewContext(context || {}, {
    extraRedactions,
  });
  const blocks: string[] = [personaPrompt.trim(), "", "## CONTEXT"];

  blocks.push(JSON.stringify(sanitizedContext, null, 2));
  blocks.push("", "## TASK", taskInstructions.trim());

  for (const section of sections) {
    blocks.push("", `## ${section.heading}`);
    if (section.fenced) {
      blocks.push("---", section.body, "---");
    } else {
      blocks.push(section.body);
    }
  }

  blocks.push("", outputInstructions.trim());

  return blocks.join("\n").trim();
}
