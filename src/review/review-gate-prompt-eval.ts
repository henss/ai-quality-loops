import type { BatchReviewArtifactSummary } from "../contracts/json-contracts.js";
import type { ReviewGateViolation } from "./review-gate.js";

export interface ReviewGatePromptEvalCounts {
  promptEvalCount: number;
  missingPromptEvalCount: number;
}

export function countBatchReviewPromptEval(
  summaries: BatchReviewArtifactSummary[],
): ReviewGatePromptEvalCounts {
  let promptEvalCount = 0;
  let missingPromptEvalCount = 0;

  for (const summary of summaries) {
    for (const result of summary.results) {
      const resultPromptEvalCount = result.ollamaTelemetry?.promptEvalCount;
      if (resultPromptEvalCount === undefined) {
        missingPromptEvalCount += 1;
      } else {
        promptEvalCount += resultPromptEvalCount;
      }
    }
  }

  return {
    promptEvalCount,
    missingPromptEvalCount,
  };
}

export function createPromptEvalBudgetViolations(input: {
  counts: ReviewGatePromptEvalCounts;
  maxPromptEvalCount?: number;
}): ReviewGateViolation[] {
  if (input.maxPromptEvalCount === undefined) {
    return [];
  }

  const violations: ReviewGateViolation[] = [];
  const { promptEvalCount, missingPromptEvalCount } = input.counts;

  if (missingPromptEvalCount > 0) {
    violations.push({
      kind: "missing-prompt-eval-count",
      actual: missingPromptEvalCount,
      allowed: "0 missing prompt eval counts",
      message: `Cannot fully apply the prompt eval budget because ${missingPromptEvalCount} batch summary result${missingPromptEvalCount === 1 ? "" : "s"} do${missingPromptEvalCount === 1 ? "es" : ""} not include ollamaTelemetry.promptEvalCount.`,
    });
  }

  if (promptEvalCount > input.maxPromptEvalCount) {
    violations.push({
      kind: "prompt-eval-budget",
      actual: promptEvalCount,
      allowed: input.maxPromptEvalCount,
      message: `Observed ${promptEvalCount} batch summary prompt eval count, which exceeds the max-prompt-eval-count budget (${input.maxPromptEvalCount}).`,
    });
  }

  return violations;
}
