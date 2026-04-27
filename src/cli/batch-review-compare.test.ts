import * as path from "node:path";
import * as fs from "node:fs/promises";
import os from "node:os";
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

  it("writes paired matrix markdown and raw JSON artifacts without requiring shell redirection", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "aiql-matrix-artifacts-"),
    );
    const markdownPath = path.join(tempDir, "matrix.md");
    const jsonPath = path.join(tempDir, "matrix.json");

    const result = await execa(
      "pnpm",
      [
        "exec",
        "tsx",
        batchReviewCompareCli,
        "examples/synthetic-multi-review-disagreement-before-summary.fixture.json",
        "examples/synthetic-multi-review-disagreement-after-summary.fixture.json",
        "--matrix-output",
        markdownPath,
        "--matrix-json-output",
        jsonPath,
      ],
      { cwd: repoRoot },
    );

    const [markdown, rawJson] = await Promise.all([
      fs.readFile(markdownPath, "utf-8"),
      fs.readFile(jsonPath, "utf-8"),
    ]);
    const matrix = JSON.parse(rawJson) as unknown;

    expect(result.stdout).toContain("Batch review summary comparison completed.");
    expect(markdown).toContain(
      "# Multi-Review Contradiction and Coverage Matrix",
    );
    expect(markdown).toContain(
      "| evidence-review | Evidence reviewer | covered | covered | both-covered | severity-regressed, finding-count-changed | medium -> high | 1 |",
    );
    expect(validateMultiReviewContradictionCoverageMatrix(matrix)).toEqual({
      ok: true,
      value: expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({
            resultKey: "evidence-review",
            contradictionSignals: [
              "severity-regressed",
              "finding-count-changed",
            ],
          }),
        ]),
      }),
    });
  });
});
