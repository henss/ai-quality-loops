import * as fs from "node:fs/promises";
import { getDefaultExpertReviewModel, getDefaultOllamaUrl, getDefaultVisionReviewModel } from "../shared/models.js";
import { summarizeReviewSurfaceError } from "../shared/review-surface.js";
import { resolveBrowserPath } from "../utils/screenshot.js";
import {
  loadPersonaPrompt,
  resolveReviewContextPath,
} from "./shared.js";

export type ReviewPreflightMode = "expert" | "vision" | "both";
export type ReviewPreflightCheckName =
  | "ollama"
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

async function runContextCheck(
  contextPath: string | undefined,
  cwd: string,
): Promise<ReviewPreflightCheck> {
  const resolvedContextPath = resolveReviewContextPath(contextPath, cwd);
  const explicitlyConfigured = Boolean(contextPath || process.env.CONTEXT_PATH);

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
  const expert = options.expert || "UI/UX";
  const expertModel = options.expertModel || getDefaultExpertReviewModel();
  const visionModel = options.visionModel || getDefaultVisionReviewModel();
  const ollamaUrl = (options.ollamaUrl || getDefaultOllamaUrl()).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl || fetch;
  const checks: ReviewPreflightCheck[] = [];

  const requiredModels = new Map<ReviewPreflightCheckName, string>();
  if (shouldCheckExpert(mode)) {
    requiredModels.set("expert-model", expertModel);
  }
  if (shouldCheckVision(mode)) {
    requiredModels.set("vision-model", visionModel);
  }

  let installedModels = new Set<string>();
  try {
    installedModels = await listInstalledOllamaModels(ollamaUrl, fetchImpl);
    checks.push({
      name: "ollama",
      status: "pass",
      summary: `Ollama is reachable and returned ${installedModels.size} installed model(s).`,
    });
  } catch (error) {
    checks.push({
      name: "ollama",
      status: "fail",
      summary: `Ollama is not reachable: ${summarizeReviewSurfaceError(error)}.`,
    });
  }

  for (const [name, model] of requiredModels.entries()) {
    if (!model.trim()) {
      checks.push({
        name,
        status: "fail",
        summary: "Model id is empty.",
      });
      continue;
    }

    const ollamaCheck = checks.find((check) => check.name === "ollama");
    if (ollamaCheck?.status !== "pass") {
      checks.push({
        name,
        status: "skip",
        summary: "Skipped because Ollama reachability failed.",
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

  try {
    await loadPersonaPrompt({
      expert,
      promptLibraryPath: options.promptLibraryPath,
    });
    checks.push({
      name: "persona",
      status: "pass",
      summary: `Persona "${expert}" resolved successfully.`,
    });
  } catch (error) {
    checks.push({
      name: "persona",
      status: "fail",
      summary: `Persona check failed: ${summarizeReviewSurfaceError(error)}.`,
    });
  }

  checks.push(await runContextCheck(options.contextPath, cwd));

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
