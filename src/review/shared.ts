import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../shared/io.js";

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

export interface BuildReviewEnvelopeOptions {
  personaPrompt: string;
  context?: Record<string, unknown>;
  taskInstructions: string;
  sections?: ReviewEnvelopeSection[];
  outputInstructions?: string;
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
    return path.resolve(promptLibraryPath);
  }

  const envPath = process.env.PROMPT_LIBRARY_PATH;
  if (envPath) {
    return path.resolve(envPath);
  }

  const defaultInCwd = path.resolve(cwd, "personas.md");
  if (fsSync.existsSync(defaultInCwd)) {
    return defaultInCwd;
  }

  return path.resolve(__dirname, "../../personas/universal.md");
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
  const resolvedContextPath = contextPath
    ? path.resolve(contextPath)
    : process.env.CONTEXT_PATH
      ? path.resolve(process.env.CONTEXT_PATH)
      : path.resolve(cwd, "context.json");

  try {
    return await readJson<Record<string, unknown>>(resolvedContextPath);
  } catch {
    return {};
  }
}

export async function writeReviewOutput(
  outputPath: string,
  content: string,
  cwd = process.cwd(),
): Promise<string> {
  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(cwd, outputPath);
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, content);
  return absoluteOutputPath;
}

export function buildReviewEnvelope({
  personaPrompt,
  context,
  taskInstructions,
  sections = [],
  outputInstructions = "Provide your critical feedback in Markdown.",
}: BuildReviewEnvelopeOptions): string {
  const blocks: string[] = [personaPrompt.trim(), "", "## CONTEXT"];

  blocks.push(JSON.stringify(context || {}, null, 2));
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
