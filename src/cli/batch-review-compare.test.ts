import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { execa } from "execa";
import { validateMultiReviewContradictionCoverageMatrix } from "../contracts/multi-review-contradiction-coverage-matrix-contract.js";

describe("batch-review-compare CLI", () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const batchReviewCompareCli = path.join(
    repoRoot,
    "src/cli/batch-review-compare.ts",
  );

  it("emits a validated contradiction-and-coverage matrix from summary fixtures", async () => {
    const result = await execa(
      "pnpm",
      [
        "exec",
        "tsx",
        batchReviewCompareCli,
        "examples/synthetic-multi-review-disagreement-before-summary.fixture.json",
        "examples/synthetic-multi-review-disagreement-after-summary.fixture.json",
        "--matrix",
        "--json",
      ],
      { cwd: repoRoot },
    );

    const matrix = JSON.parse(result.stdout) as unknown;

    expect(validateMultiReviewContradictionCoverageMatrix(matrix)).toEqual({
      ok: true,
      value: expect.objectContaining({
        totals: expect.objectContaining({
          rows: 6,
          rowsWithContradictions: 5,
          uncoveredChecks: 3,
        }),
      }),
    });
  });
});
