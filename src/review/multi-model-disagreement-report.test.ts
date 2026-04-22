import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import type { BatchReviewArtifactSummary } from "../contracts/json-contracts.js";
import { compareBatchReviewArtifactSummaries } from "./batch-review-summary-compare.js";
import { formatMultiModelDisagreementReport } from "./multi-model-disagreement-report.js";

async function readExampleJson<T>(filename: string): Promise<T> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}

async function readExampleMarkdown(filename: string): Promise<string> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return fs.readFile(filePath, "utf-8");
}

describe("multi-model disagreement report", () => {
  it("formats the synthetic disagreement template example", async () => {
    const [before, after, expected] = await Promise.all([
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-before-summary.fixture.json",
      ),
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-after-summary.fixture.json",
      ),
      readExampleMarkdown("synthetic-multi-model-disagreement-report.md"),
    ]);

    const comparison = compareBatchReviewArtifactSummaries({ before, after });
    const report = {
      inputs: {
        before: { pathLabel: "Synthetic disagreement baseline summary" },
        after: { pathLabel: "Synthetic disagreement candidate summary" },
      },
      comparison,
    };

    expect(
      formatMultiModelDisagreementReport(report, {
        title: "Synthetic Multi-Model Disagreement Report",
        baselineLabel: "Baseline model cohort",
        candidateLabel: "Candidate model cohort",
        includeStableAgreementSample: true,
        maxDisagreementNotes: 6,
        maxStableAgreementNotes: 2,
      }),
    ).toBe(expected.trimEnd());
  });
});
