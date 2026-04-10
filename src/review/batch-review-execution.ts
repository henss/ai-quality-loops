import { getLogger } from "../shared/logger.js";
import {
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "../shared/review-surface.js";
import {
  runReviewPreflight,
  type ReviewPreflightMode,
  type ReviewPreflightResult,
  type RunReviewPreflightOptions,
} from "./preflight.js";
import {
  runExpertReview,
  type ExpertReviewOptions,
} from "./expert-review.js";
import {
  runVisionReview,
  type VisionReviewOptions,
} from "./vision-review.js";
import {
  summarizeStructuredReviewResultRollup,
  type StructuredReviewResult,
} from "./review-result.js";
import type {
  BatchReviewSummary,
  NormalizedBatchReviewEntry,
} from "./batch-review.js";
import { createBatchReviewResultKey } from "../contracts/json-contracts.js";

export interface BatchReviewExecutionPlanEntry
  extends NormalizedBatchReviewEntry {
  targetSummary: string;
}

export interface BatchReviewExecutionPlan {
  total: number;
  entries: BatchReviewExecutionPlanEntry[];
  preflight: RunReviewPreflightOptions;
}

function uniqueDefined(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getBatchReviewPreflightMode(
  entries: NormalizedBatchReviewEntry[],
): ReviewPreflightMode {
  const hasExpert = entries.some((entry) => entry.mode === "expert");
  const hasVision = entries.some((entry) => entry.mode === "vision");

  if (hasExpert && hasVision) {
    return "both";
  }

  return hasVision ? "vision" : "expert";
}

export function deriveBatchReviewPreflightOptions(
  entries: NormalizedBatchReviewEntry[],
): RunReviewPreflightOptions {
  return {
    mode: getBatchReviewPreflightMode(entries),
    personaRequirements: [
      ...new Map(
        entries.map((entry) => {
          const expert = entry.expert || "UI/UX";
          const promptLibraryPath = entry.promptLibraryPath;
          return [
            `${expert}::${promptLibraryPath || ""}`,
            {
              expert,
              promptLibraryPath,
            },
          ];
        }),
      ).values(),
    ],
    modelRequirements: [
      ...[
        ...new Map(
          entries
            .filter((entry) => entry.mode === "expert" && entry.model)
            .map((entry) => [
              `${entry.model}::${entry.ollamaUrl || ""}`,
              {
                name: "expert-model" as const,
                model: entry.model!,
                ollamaUrl: entry.ollamaUrl,
              },
            ]),
        ).values(),
      ],
      ...[
        ...new Map(
          entries
            .filter((entry) => entry.mode === "vision" && entry.model)
            .map((entry) => [
              `${entry.model}::${entry.ollamaUrl || ""}`,
              {
                name: "vision-model" as const,
                model: entry.model!,
                ollamaUrl: entry.ollamaUrl,
              },
            ]),
        ).values(),
      ],
    ],
    contextPaths: uniqueDefined(entries.map((entry) => entry.contextPath)),
  };
}

export function deriveBatchReviewExecutionPlan(
  entries: NormalizedBatchReviewEntry[],
): BatchReviewExecutionPlan {
  return {
    total: entries.length,
    entries: entries.map((entry) => ({
      ...entry,
      targetSummary: sanitizeReviewSurfaceValue(entry.target),
    })),
    preflight: deriveBatchReviewPreflightOptions(entries),
  };
}

export async function runBatchReviewEntriesPreflight({
  entries,
  cwd = process.cwd(),
  browserPath,
  fetchImpl,
}: {
  entries: NormalizedBatchReviewEntry[];
  cwd?: string;
  browserPath?: string;
  fetchImpl?: typeof fetch;
}): Promise<ReviewPreflightResult> {
  const preflightOptions = deriveBatchReviewPreflightOptions(entries);

  return runReviewPreflight({
    ...preflightOptions,
    browserPath,
    cwd,
    fetchImpl,
  });
}

export async function runBatchReviewEntries({
  manifestPath,
  entries,
  runExpertReviewImpl = runExpertReview,
  runVisionReviewImpl = runVisionReview,
}: {
  manifestPath: string;
  entries: NormalizedBatchReviewEntry[];
  runExpertReviewImpl?: (
    options: ExpertReviewOptions,
  ) => Promise<string | StructuredReviewResult>;
  runVisionReviewImpl?: (
    options: VisionReviewOptions,
  ) => Promise<string | StructuredReviewResult>;
}): Promise<BatchReviewSummary> {
  const results: BatchReviewSummary["results"] = [];

  for (const entry of entries) {
    const targetSummary = sanitizeReviewSurfaceValue(entry.target);
    const label = entry.name || `Review ${entry.index + 1}`;
    const resultKey = createBatchReviewResultKey({
      index: entry.index,
      name: entry.name,
      mode: entry.mode,
    });

    getLogger().info(
      `[Batch Review] Starting ${label} (${entry.mode}) for ${targetSummary}`,
    );

    try {
      let structuredResult: StructuredReviewResult | undefined;

      if (entry.mode === "expert") {
        const reviewResult = await runExpertReviewImpl({
          expert: entry.expert!,
          content: entry.target,
          modelId: entry.model,
          outputPath: entry.outputPath,
          structuredOutputPath: entry.structuredOutputPath,
          promptLibraryPath: entry.promptLibraryPath,
          contextPath: entry.contextPath,
          ollamaUrl: entry.ollamaUrl,
          resultFormat: entry.structuredOutputPath ? "structured" : "markdown",
        });
        structuredResult =
          typeof reviewResult === "string" ? undefined : reviewResult;
      } else {
        const reviewResult = await runVisionReviewImpl({
          urlOrPath: entry.target,
          expert: entry.expert || "UI/UX",
          outputPath: entry.outputPath,
          structuredOutputPath: entry.structuredOutputPath,
          width: entry.width,
          height: entry.height,
          sections: entry.sections,
          model: entry.model,
          promptLibraryPath: entry.promptLibraryPath,
          contextPath: entry.contextPath,
          ollamaUrl: entry.ollamaUrl,
          customCss: entry.css,
          resultFormat: entry.structuredOutputPath ? "structured" : "markdown",
        });
        structuredResult =
          typeof reviewResult === "string" ? undefined : reviewResult;
      }

      results.push({
        index: entry.index,
        name: entry.name,
        resultKey,
        mode: entry.mode,
        targetSummary,
        outputPath: entry.outputPath,
        structuredOutputPath: entry.structuredOutputPath,
        structuredResult: structuredResult
          ? summarizeStructuredReviewResultRollup(structuredResult)
          : undefined,
        status: "success",
      });
    } catch (error) {
      const errorSummary = summarizeReviewSurfaceError(error);
      getLogger().error(`[Batch Review] ${label} failed: ${errorSummary}`);

      results.push({
        index: entry.index,
        name: entry.name,
        resultKey,
        mode: entry.mode,
        targetSummary,
        outputPath: entry.outputPath,
        structuredOutputPath: entry.structuredOutputPath,
        status: "failure",
        errorSummary,
      });
    }
  }

  const succeeded = results.filter((result) => result.status === "success").length;
  const failed = results.length - succeeded;

  return {
    manifestPath,
    total: results.length,
    succeeded,
    failed,
    results,
  };
}
