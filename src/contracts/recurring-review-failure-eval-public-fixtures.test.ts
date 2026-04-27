import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseBatchReviewManifest, validateStructuredReviewResult } from "./json-contracts.js";
import {
  RECURRING_REVIEW_FAILURE_EVAL_CASES,
  evaluateRecurringReviewFailureHarness,
  formatRecurringReviewFailureHarnessReport,
} from "../review/recurring-review-failure-eval.js";
import { loadPersonaPrompt } from "../review/persona-catalog.js";

const ACTUAL_REPLAY_OUTPUTS = [
  {
    caseId: "missing-evidence-handles",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-missing-evidence-handles-expert-review.json",
  },
  {
    caseId: "stale-deterministic-inputs",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-stale-deterministic-inputs-expert-review.json",
  },
  {
    caseId: "repeated-command-noise",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-repeated-command-noise-expert-review.json",
  },
  {
    caseId: "verification-wrapper-mismatch",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-verification-wrapper-mismatch-expert-review.json",
  },
  {
    caseId: "launch-evidence-regression-omission",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-launch-evidence-regression-omission-expert-review.json",
  },
  {
    caseId: "launch-evidence-gate-overclaim",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-launch-evidence-gate-overclaim-expert-review.json",
  },
  {
    caseId: "bundle-truncation-hides-signals",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-bundle-truncation-hides-signals-expert-review.json",
  },
  {
    caseId: "source-audit-evidence-path-gap",
    structuredOutputPath:
      "reviews/recurring-review-failure-eval/json/recurring-failure-eval-source-audit-evidence-path-gap-expert-review.json",
  },
] as const;

const PUBLIC_SAFE_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "ops-",
  "company",
  "customer",
  "tenant",
  "employee",
  "https://",
  "d:\\",
  "/users/",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

async function loadActualReplayObservedResult(entry: (typeof ACTUAL_REPLAY_OUTPUTS)[number]) {
  const result = JSON.parse(
    await fs.readFile(path.join(process.cwd(), entry.structuredOutputPath), "utf-8"),
  ) as unknown;
  const validation = validateStructuredReviewResult(result);

  expect(validation.ok).toBe(true);
  if (!validation.ok) {
    throw validation.error;
  }

  return {
    caseId: entry.caseId,
    result: validation.value,
  };
}

async function evaluateActualReplayOutputs() {
  const observedResults = await Promise.all(
    ACTUAL_REPLAY_OUTPUTS.map(loadActualReplayObservedResult),
  );
  const actualReplayCases = RECURRING_REVIEW_FAILURE_EVAL_CASES.filter((evalCase) =>
    ACTUAL_REPLAY_OUTPUTS.some((entry) => entry.caseId === evalCase.caseId),
  );

  return evaluateRecurringReviewFailureHarness({
    cases: actualReplayCases,
    observedResults,
  });
}

describe("synthetic recurring review-failure eval public fixtures", () => {
  it("ships a runnable public-safe manifest and packet set", async () => {
    const manifestPath = path.join(
      process.cwd(),
      "examples/synthetic-recurring-review-failure-eval.manifest.json",
    );
    const manifestText = await fs.readFile(manifestPath, "utf-8");
    const manifest = parseBatchReviewManifest(JSON.parse(manifestText) as unknown);
    const contextText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-recurring-review-failure-eval-context.json",
      ),
      "utf-8",
    );

    expect(manifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Evidence Reviewer",
        contextPath: "./examples/synthetic-recurring-review-failure-eval-context.json",
      }),
    );
    expect(manifest.reviews).toHaveLength(9);

    const targetTexts = await Promise.all(
      manifest.reviews.map(async (review) =>
        fs.readFile(path.join(process.cwd(), review.target), "utf-8"),
      ),
    );

    expect(targetTexts[0]).toContain("missing-evidence-handle");
    expect(targetTexts[1]).toContain("stale-deterministic-input");
    expect(targetTexts[2]).toContain("command-noise-obscures-signal");
    expect(targetTexts[3]).toContain("verification-wrapper-mismatch");
    expect(targetTexts[4]).toContain("launch-evidence-regression-omission");
    expect(targetTexts[5]).toContain("launch-evidence-gate-overclaim");
    expect(targetTexts[6]).toContain("bundle-truncation-hides-signals");
    expect(targetTexts[7]).toContain("source-audit-evidence-path-gap");
    expect(targetTexts[8]).toContain("unclassified-runtime-stderr");

    const serialized = [manifestText, contextText, ...targetTexts].join("\n").toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });

  it("ships a public-safe structured-results fixture that passes the harness", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-recurring-review-failure-eval-results.fixture.json",
        ),
        "utf-8",
      ),
    ) as {
      results?: Array<{
        caseId?: string;
        result?: unknown;
      }>;
    };

    expect(fixture.results).toHaveLength(9);

    const observedResults = (fixture.results ?? []).map((entry) => {
      const validation = validateStructuredReviewResult(entry.result);
      expect(validation.ok).toBe(true);
      if (!validation.ok) {
        throw validation.error;
      }

      return {
        caseId: entry.caseId ?? "",
        result: validation.value,
      };
    });

    const report = evaluateRecurringReviewFailureHarness({
      cases: RECURRING_REVIEW_FAILURE_EVAL_CASES,
      observedResults,
    });

    expect(report.status).toBe("passed");
    expect(report.failed).toBe(0);

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });

  it("replays the checked-in local reviewer outputs through the harness", async () => {
    const report = await evaluateActualReplayOutputs();

    expect(report).toEqual(
      expect.objectContaining({
        status: "passed",
        total: 8,
        passed: 8,
        failed: 0,
      }),
    );
    expect(report.results.map((result) => result.status)).toEqual([
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
      "passed",
    ]);
    expect(formatRecurringReviewFailureHarnessReport(report)).toContain(
      "Recurring review-failure eval: 8 passed, 0 failed, 8 total.",
    );
  });

  it("resolves the recurring eval persona from the shipped prompt library", async () => {
    const prompt = await loadPersonaPrompt({
      expert: "Evidence Reviewer",
    });

    expect(prompt.personaName).toBe("Evidence Reviewer");
    expect(prompt.personaPrompt).toContain("traceability");
    expect(prompt.personaPrompt).toContain("authority-boundary");
  });
});
