import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { getDefaultExpertReviewModel, getDefaultOllamaUrl, getDefaultVisionReviewModel } from "../shared/models.js";
import {
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "../shared/review-surface.js";
import { resolveBrowserPath } from "../utils/screenshot.js";
import {
  resolveReviewContextPath,
} from "./shared.js";
import { loadPersonaPrompt } from "./persona-catalog.js";

export type ReviewPreflightMode = "expert" | "vision" | "both";
export type ReviewPreflightCheckName =
  | "ollama"
  | "ollama-start"
  | "expert-model"
  | "vision-model"
  | "browser"
  | "persona"
  | "context";
export type ReviewPreflightCheckStatus = "pass" | "fail" | "skip";

export interface ReviewPreflightCheck {
  name: ReviewPreflightCheckName;
  status: ReviewPreflightCheckStatus;
  summary: string;
}

export interface ReviewPreflightResult {
  ok: boolean;
  mode: ReviewPreflightMode;
  checks: ReviewPreflightCheck[];
}

export interface ReviewPreflightPersonaRequirement {
  expert: string;
  promptLibraryPath?: string;
}

export interface ReviewPreflightModelRequirement {
  name: "expert-model" | "vision-model";
  model: string;
  ollamaUrl?: string;
}

export interface RunReviewPreflightOptions {
  mode?: ReviewPreflightMode;
  expert?: string;
  expertModel?: string;
  visionModel?: string;
  promptLibraryPath?: string;
  contextPath?: string;
  ollamaUrl?: string;
  browserPath?: string;
  cwd?: string;
  fetchImpl?: typeof fetch;
  startOllamaIfDown?: boolean;
  startOllamaTimeoutMs?: number;
  startOllamaImpl?: (
    ollamaUrl: string,
    options: { timeoutMs: number; fetchImpl: typeof fetch },
  ) => Promise<ReviewPreflightCheck>;
  personaRequirements?: ReviewPreflightPersonaRequirement[];
  modelRequirements?: ReviewPreflightModelRequirement[];
  contextPaths?: string[];
}

interface OllamaTag {
  name?: string;
  model?: string;
}

function shouldCheckExpert(mode: ReviewPreflightMode): boolean {
  return mode === "expert" || mode === "both";
}

function shouldCheckVision(mode: ReviewPreflightMode): boolean {
  return mode === "vision" || mode === "both";
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listInstalledOllamaModels(
  ollamaUrl: string,
  fetchImpl: typeof fetch,
): Promise<Set<string>> {
  const response = await fetchImpl(`${ollamaUrl.replace(/\/$/, "")}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama tags request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as { models?: OllamaTag[] };
  const names = new Set<string>();

  for (const model of payload.models || []) {
    if (typeof model.name === "string" && model.name.trim()) {
      names.add(model.name.trim());
    }

    if (typeof model.model === "string" && model.model.trim()) {
      names.add(model.model.trim());
    }
  }

  return names;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultStartOllama(
  ollamaUrl: string,
  { timeoutMs, fetchImpl }: { timeoutMs: number; fetchImpl: typeof fetch },
): Promise<ReviewPreflightCheck> {
  try {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch (error) {
    return {
      name: "ollama-start",
      status: "fail",
      summary: `Could not start Ollama: ${summarizeReviewSurfaceError(error)}.`,
    };
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await listInstalledOllamaModels(ollamaUrl, fetchImpl);
      return {
        name: "ollama-start",
        status: "pass",
        summary: `Started Ollama endpoint ${sanitizeReviewSurfaceValue(ollamaUrl)}.`,
      };
    } catch {
      await sleep(250);
    }
  }

  return {
    name: "ollama-start",
    status: "fail",
    summary: `Ollama did not become reachable within ${timeoutMs} ms.`,
  };
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(value);
  }

  return unique;
}

function getPersonaRequirements(
  options: RunReviewPreflightOptions,
  mode: ReviewPreflightMode,
): ReviewPreflightPersonaRequirement[] {
  const requirements =
    options.personaRequirements && options.personaRequirements.length > 0
      ? options.personaRequirements
      : shouldCheckExpert(mode) || shouldCheckVision(mode)
        ? [
            {
              expert: options.expert || "UI/UX",
              promptLibraryPath: options.promptLibraryPath,
            },
          ]
        : [];

  return uniqueBy(
    requirements.filter((requirement) => requirement.expert.trim().length > 0),
    (requirement) => `${requirement.expert}::${requirement.promptLibraryPath || ""}`,
  );
}

function getModelRequirements(
  options: RunReviewPreflightOptions,
  mode: ReviewPreflightMode,
): ReviewPreflightModelRequirement[] {
  const requirements =
    options.modelRequirements && options.modelRequirements.length > 0
      ? options.modelRequirements
      : [
          ...(shouldCheckExpert(mode)
            ? [
                {
                  name: "expert-model" as const,
                  model: options.expertModel || getDefaultExpertReviewModel(),
                  ollamaUrl: options.ollamaUrl,
                },
              ]
            : []),
          ...(shouldCheckVision(mode)
            ? [
                {
                  name: "vision-model" as const,
                  model: options.visionModel || getDefaultVisionReviewModel(),
                  ollamaUrl: options.ollamaUrl,
                },
              ]
            : []),
        ];

  return uniqueBy(
    requirements.filter((requirement) => requirement.model.trim().length > 0),
    (requirement) =>
      `${requirement.name}::${requirement.model}::${(requirement.ollamaUrl || "").replace(/\/$/, "")}`,
  );
}

function getContextPaths(
  options: RunReviewPreflightOptions,
): { paths: string[]; explicitlyConfigured: boolean } {
  if (options.contextPaths && options.contextPaths.length > 0) {
    return {
      paths: uniqueBy(
        options.contextPaths.filter((contextPath) => contextPath.trim().length > 0),
        (contextPath) => contextPath,
      ),
      explicitlyConfigured: true,
    };
  }

  if (options.contextPath) {
    return { paths: [options.contextPath], explicitlyConfigured: true };
  }

  if (process.env.CONTEXT_PATH) {
    return { paths: [process.env.CONTEXT_PATH], explicitlyConfigured: true };
  }

  return { paths: [], explicitlyConfigured: false };
}

async function runContextCheck(
  contextPath: string,
  cwd: string,
  explicitlyConfigured: boolean,
): Promise<ReviewPreflightCheck> {
  const resolvedContextPath = resolveReviewContextPath(contextPath, cwd);

  if (!(await pathExists(resolvedContextPath))) {
    return explicitlyConfigured
      ? {
          name: "context",
          status: "fail",
          summary: "Configured context file does not exist.",
        }
      : {
          name: "context",
          status: "skip",
          summary: "No context file configured.",
        };
  }

  try {
    JSON.parse(await fs.readFile(resolvedContextPath, "utf-8"));
    return {
      name: "context",
      status: "pass",
      summary: "Context file resolved and parsed successfully.",
    };
  } catch (error) {
    return {
      name: "context",
      status: "fail",
      summary:
        error instanceof Error && error.name === "SyntaxError"
          ? "Context file is not valid JSON."
          : "Context file could not be read.",
    };
  }
}

export async function runReviewPreflight(
  options: RunReviewPreflightOptions = {},
): Promise<ReviewPreflightResult> {
  const mode = options.mode || "both";
  const cwd = options.cwd || process.cwd();
  const fetchImpl = options.fetchImpl || fetch;
  const checks: ReviewPreflightCheck[] = [];
  const personaRequirements = getPersonaRequirements(options, mode);
  const modelRequirements = getModelRequirements(options, mode).map(
    (requirement) => ({
      ...requirement,
      ollamaUrl: (requirement.ollamaUrl || getDefaultOllamaUrl()).replace(/\/$/, ""),
    }),
  );
  const { paths: contextPaths, explicitlyConfigured } = getContextPaths(options);
  const startOllamaImpl = options.startOllamaImpl ?? defaultStartOllama;
  const startOllamaTimeoutMs = options.startOllamaTimeoutMs ?? 8000;

  const modelsByOllamaUrl = new Map<string, ReviewPreflightModelRequirement[]>();
  for (const requirement of modelRequirements) {
    const existing = modelsByOllamaUrl.get(requirement.ollamaUrl);
    if (existing) {
      existing.push(requirement);
    } else {
      modelsByOllamaUrl.set(requirement.ollamaUrl, [requirement]);
    }
  }

  const installedModelsByOllamaUrl = new Map<string, Set<string>>();
  for (const [ollamaUrl] of modelsByOllamaUrl.entries()) {
    try {
      const installedModels = await listInstalledOllamaModels(ollamaUrl, fetchImpl);
      installedModelsByOllamaUrl.set(ollamaUrl, installedModels);
      checks.push({
        name: "ollama",
        status: "pass",
        summary: `Ollama endpoint ${sanitizeReviewSurfaceValue(ollamaUrl)} is reachable and returned ${installedModels.size} installed model(s).`,
      });
    } catch (error) {
      if (options.startOllamaIfDown) {
        const startCheck = await startOllamaImpl(ollamaUrl, {
          timeoutMs: startOllamaTimeoutMs,
          fetchImpl,
        });
        checks.push(startCheck);

        if (startCheck.status === "pass") {
          try {
            const installedModels = await listInstalledOllamaModels(
              ollamaUrl,
              fetchImpl,
            );
            installedModelsByOllamaUrl.set(ollamaUrl, installedModels);
            checks.push({
              name: "ollama",
              status: "pass",
              summary: `Ollama endpoint ${sanitizeReviewSurfaceValue(ollamaUrl)} is reachable after startup and returned ${installedModels.size} installed model(s).`,
            });
            continue;
          } catch (retryError) {
            checks.push({
              name: "ollama",
              status: "fail",
              summary: `Ollama endpoint ${sanitizeReviewSurfaceValue(ollamaUrl)} is still not reachable after startup: ${summarizeReviewSurfaceError(retryError)}.`,
            });
            continue;
          }
        }
      }

      checks.push({
        name: "ollama",
        status: "fail",
        summary: `Ollama endpoint ${sanitizeReviewSurfaceValue(ollamaUrl)} is not reachable: ${summarizeReviewSurfaceError(error)}.`,
      });
    }
  }

  for (const requirement of modelRequirements) {
    const { name, model, ollamaUrl } = requirement;
    if (!model.trim()) {
      checks.push({
        name,
        status: "fail",
        summary: "Model id is empty.",
      });
      continue;
    }

    const installedModels = installedModelsByOllamaUrl.get(ollamaUrl);
    if (!installedModels) {
      checks.push({
        name,
        status: "skip",
        summary: `Skipped because Ollama reachability failed for ${sanitizeReviewSurfaceValue(ollamaUrl)}.`,
      });
      continue;
    }

    checks.push(
      installedModels.has(model)
        ? {
            name,
            status: "pass",
            summary: `Configured model "${model}" is installed.`,
          }
        : {
            name,
            status: "fail",
            summary: `Configured model "${model}" is not installed in Ollama.`,
          },
    );
  }

  if (shouldCheckVision(mode)) {
    const browserPath = resolveBrowserPath(options.browserPath);
    checks.push(
      (await pathExists(browserPath))
        ? {
            name: "browser",
            status: "pass",
            summary: "Browser executable resolved successfully.",
          }
        : {
            name: "browser",
            status: "fail",
            summary: "Browser executable does not exist.",
          },
    );
  } else {
    checks.push({
      name: "browser",
      status: "skip",
      summary: "Browser check skipped for expert-only preflight.",
    });
  }

  for (const requirement of personaRequirements) {
    try {
      await loadPersonaPrompt({
        expert: requirement.expert,
        promptLibraryPath: requirement.promptLibraryPath,
      });
      checks.push({
        name: "persona",
        status: "pass",
        summary: `Persona "${requirement.expert}" resolved successfully.`,
      });
    } catch (error) {
      checks.push({
        name: "persona",
        status: "fail",
        summary: `Persona "${requirement.expert}" failed to resolve: ${summarizeReviewSurfaceError(error)}.`,
      });
    }
  }

  if (contextPaths.length === 0) {
    checks.push({
      name: "context",
      status: "skip",
      summary: "No context file configured.",
    });
  } else {
    for (const contextPath of contextPaths) {
      checks.push(await runContextCheck(contextPath, cwd, explicitlyConfigured));
    }
  }

  return {
    ok: checks.every((check) => check.status !== "fail"),
    mode,
    checks,
  };
}

export function formatReviewPreflightSummary(
  result: ReviewPreflightResult,
): string {
  const passed = result.checks.filter((check) => check.status === "pass").length;
  const failed = result.checks.filter((check) => check.status === "fail").length;
  const skipped = result.checks.filter((check) => check.status === "skip").length;
  const headline = result.ok
    ? `Review preflight passed for ${result.mode} mode.`
    : `Review preflight failed for ${result.mode} mode.`;

  return [
    `${headline} ${passed} passed, ${failed} failed, ${skipped} skipped.`,
    ...result.checks.map(
      (check) => `- [${check.status}] ${check.name}: ${check.summary}`,
    ),
  ].join("\n");
}
