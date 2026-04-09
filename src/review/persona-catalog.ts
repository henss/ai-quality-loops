import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveFromCwd } from "../shared/io.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_EXPERT_ALIASES: Record<string, string> = {
  "UI/UX": "SKEPTICAL UI/UX CRITIC",
  Efficiency: "REPOSITORY & AI EFFICIENCY SPECIALIST",
};

const PERSONA_HEADER_REGEX =
  /(?:^|\r?\n)(?:### LLM COMMITTEE PERSONA: \d+\. |#{1,3} )([^\r\n]+)(?=\r?\n|$)/g;

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

export interface PersonaCatalogAlias {
  alias: string;
  personaName: string;
  source: "built-in" | "custom";
}

export interface PersonaCatalogEntry {
  personaName: string;
  aliases: string[];
}

export interface PersonaCatalog {
  promptLibraryPath: string;
  personas: PersonaCatalogEntry[];
  aliases: PersonaCatalogAlias[];
  unmatchedAliases: PersonaCatalogAlias[];
}

export function resolvePersonaName(
  expert: string,
  expertMap?: Record<string, string>,
): string {
  return expertMap?.[expert] || DEFAULT_EXPERT_ALIASES[expert] || expert;
}

export function resolveExpertAliases(
  expertMap?: Record<string, string>,
): Record<string, string> {
  return {
    ...DEFAULT_EXPERT_ALIASES,
    ...(expertMap || {}),
  };
}

export function listPersonaNames(promptLibrary: string): string[] {
  const seen = new Set<string>();
  const personaNames: string[] = [];

  for (const match of promptLibrary.matchAll(PERSONA_HEADER_REGEX)) {
    const personaName = match[1]?.trim();
    if (!personaName || seen.has(personaName)) {
      continue;
    }

    seen.add(personaName);
    personaNames.push(personaName);
  }

  return personaNames;
}

export function resolvePromptLibraryPath(
  promptLibraryPath?: string,
  cwd = process.cwd(),
): string {
  if (promptLibraryPath) {
    return resolveFromCwd(promptLibraryPath, cwd);
  }

  const envPath = process.env.PROMPT_LIBRARY_PATH;
  if (envPath) {
    return resolveFromCwd(envPath, cwd);
  }

  const defaultInCwd = path.resolve(cwd, "personas.md");
  if (fsSync.existsSync(defaultInCwd)) {
    return defaultInCwd;
  }

  return path.resolve(__dirname, "../../personas/universal.md");
}

export async function getPersonaCatalog({
  promptLibraryPath,
  expertMap,
  cwd = process.cwd(),
}: {
  promptLibraryPath?: string;
  expertMap?: Record<string, string>;
  cwd?: string;
} = {}): Promise<PersonaCatalog> {
  const resolvedPromptLibraryPath = resolvePromptLibraryPath(promptLibraryPath, cwd);
  if (!fsSync.existsSync(resolvedPromptLibraryPath)) {
    throw new Error(`Persona library not found at: ${resolvedPromptLibraryPath}`);
  }

  const promptLibrary = await fs.readFile(resolvedPromptLibraryPath, "utf-8");
  const personaNames = listPersonaNames(promptLibrary);
  const aliases = Object.entries(resolveExpertAliases(expertMap)).map(
    ([alias, personaName]) =>
      ({
        alias,
        personaName,
        source:
          expertMap && Object.prototype.hasOwnProperty.call(expertMap, alias)
            ? "custom"
            : "built-in",
      }) satisfies PersonaCatalogAlias,
  );
  const personaNameSet = new Set(personaNames);

  return {
    promptLibraryPath: resolvedPromptLibraryPath,
    personas: personaNames.map((personaName) => ({
      personaName,
      aliases: aliases
        .filter((alias) => alias.personaName === personaName)
        .map((alias) => alias.alias),
    })),
    aliases: aliases.filter((alias) => personaNameSet.has(alias.personaName)),
    unmatchedAliases: aliases.filter(
      (alias) => !personaNameSet.has(alias.personaName),
    ),
  };
}

export function formatPersonaCatalog(catalog: PersonaCatalog): string {
  const lines = [
    `Available personas from ${path.basename(catalog.promptLibraryPath)}:`,
    ...catalog.personas.map((persona) =>
      persona.aliases.length > 0
        ? `- ${persona.personaName} (aliases: ${persona.aliases.join(", ")})`
        : `- ${persona.personaName}`,
    ),
  ];

  if (catalog.unmatchedAliases.length > 0) {
    lines.push(
      "",
      "Aliases without a matching persona in this library:",
      ...catalog.unmatchedAliases.map(
        (alias) =>
          `- ${alias.alias} -> ${alias.personaName} [${alias.source}]`,
      ),
    );
  }

  return lines.join("\n");
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
