import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import type { BatchReviewArtifactSummary } from "../contracts/json-contracts.js";
import { compareBatchReviewArtifactSummaries } from "./batch-review-summary-compare.js";
import {
  createMultiReviewContradictionCoverageMatrix,
  formatMultiReviewContradictionCoverageMatrix,
} from "./multi-review-contradiction-coverage-matrix.js";

async function readExampleJson<T>(filename: string): Promise<T> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}

async function readExampleMarkdown(filename: string): Promise<string> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return fs.readFile(filePath, "utf-8");
}

describe("multi-review contradiction and coverage matrix", () => {
  it("creates a stable matrix artifact from synthetic multi-review summaries", async () => {
    const [before, after, expected] = await Promise.all([
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-before-summary.fixture.json",
      ),
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-after-summary.fixture.json",
      ),
      readExampleJson(
        "synthetic-multi-review-contradiction-coverage-matrix.expected.json",
      ),
    ]);
    const comparison = compareBatchReviewArtifactSummaries({ before, after });

    const matrix = createMultiReviewContradictionCoverageMatrix({
      inputs: {
        before: { pathLabel: "Synthetic disagreement baseline summary" },
        after: { pathLabel: "Synthetic disagreement candidate summary" },
      },
      comparison,
    });

    expect(matrix).toEqual(expected);
  });

  it("renders the matrix as a compact markdown review artifact", async () => {
    const [before, after, expected] = await Promise.all([
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-before-summary.fixture.json",
      ),
      readExampleJson<BatchReviewArtifactSummary>(
        "synthetic-multi-review-disagreement-after-summary.fixture.json",
      ),
      readExampleMarkdown(
        "synthetic-multi-review-contradiction-coverage-matrix.expected.md",
      ),
    ]);
    const comparison = compareBatchReviewArtifactSummaries({ before, after });
    const matrix = createMultiReviewContradictionCoverageMatrix({
      inputs: {
        before: { pathLabel: "Synthetic disagreement baseline summary" },
        after: { pathLabel: "Synthetic disagreement candidate summary" },
      },
      comparison,
    });

    expect(formatMultiReviewContradictionCoverageMatrix(matrix)).toBe(
      expected.trimEnd(),
    );
  });
});
