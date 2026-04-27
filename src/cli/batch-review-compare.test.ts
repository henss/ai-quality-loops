import * as path from "node:path";
import * as fs from "node:fs/promises";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { execa } from "execa";
import { validateMultiReviewContradictionCoverageMatrix } from "../contracts/multi-review-contradiction-coverage-matrix-contract.js";
import type { MultiReviewContradictionCoverageMatrix } from "../contracts/multi-review-contradiction-coverage-matrix-contract.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const batchReviewCompareCli = path.join(
  repoRoot,
  "src/cli/batch-review-compare.ts",
);
const beforeSummaryFixture =
  "examples/synthetic-multi-review-disagreement-before-summary.fixture.json";
const afterSummaryFixture =
  "examples/synthetic-multi-review-disagreement-after-summary.fixture.json";
const expectedMatrixMarkdownPath =
  "examples/synthetic-multi-review-contradiction-coverage-matrix.expected.md";
const expectedMatrixJsonPath =
  "examples/synthetic-multi-review-contradiction-coverage-matrix.expected.json";

interface MatrixArtifactOutputs {
  markdown: string;
  rawJson: string;
  expectedMarkdown: string;
  expectedJson: string;
}

function expectedCliMatrixJson(expectedJson: string): string {
  const matrix = JSON.parse(expectedJson) as {
    inputs: {
      before: { pathLabel: string };
      after: { pathLabel: string };
    };
  };

  matrix.inputs.before.pathLabel = "Local file path (.json file)";
  matrix.inputs.after.pathLabel = "Local file path (.json file)";

  return JSON.stringify(matrix, null, 2);
}

function expectedCliMatrixMarkdown(expectedMarkdown: string): string {
  return expectedMarkdown
    .replace(
      "- Baseline: Synthetic disagreement baseline summary",
      "- Baseline: Local file path (.json file)",
    )
    .replace(
      "- Candidate: Synthetic disagreement candidate summary",
      "- Candidate: Local file path (.json file)",
    );
}

function runMatrixCli(args: string[]) {
  return execa(
    "pnpm",
    [
      "exec",
      "tsx",
      batchReviewCompareCli,
      beforeSummaryFixture,
      afterSummaryFixture,
      ...args,
    ],
    { cwd: repoRoot },
  );
}

function readExpectedMatrixJson(): Promise<string> {
  return fs.readFile(path.join(repoRoot, expectedMatrixJsonPath), "utf-8");
}

function readExpectedMatrixMarkdown(): Promise<string> {
  return fs.readFile(path.join(repoRoot, expectedMatrixMarkdownPath), "utf-8");
}

function parseValidMatrixJson(value: string): MultiReviewContradictionCoverageMatrix {
  const validation = validateMultiReviewContradictionCoverageMatrix(
    JSON.parse(value) as unknown,
  );

  expect(validation.ok).toBe(true);
  if (!validation.ok) {
    throw validation.error;
  }

  return validation.value;
}

function expectValidMatrixJson(value: string): void {
  expect(parseValidMatrixJson(value).totals).toEqual(
    expect.objectContaining({
      rows: 6,
      rowsWithContradictions: 5,
      uncoveredChecks: 3,
    }),
  );
}

async function readMatrixArtifactOutputs(input: {
  markdownPath: string;
  jsonPath: string;
}): Promise<MatrixArtifactOutputs> {
  const [markdown, rawJson, expectedMarkdown, expectedJson] = await Promise.all([
    fs.readFile(input.markdownPath, "utf-8"),
    fs.readFile(input.jsonPath, "utf-8"),
    readExpectedMatrixMarkdown(),
    readExpectedMatrixJson(),
  ]);

  return { markdown, rawJson, expectedMarkdown, expectedJson };
}

function expectMatrixArtifactOutputs(outputs: MatrixArtifactOutputs): void {
  expect(outputs.markdown).toBe(
    expectedCliMatrixMarkdown(outputs.expectedMarkdown),
  );
  expect(outputs.rawJson).toBe(
    `${expectedCliMatrixJson(outputs.expectedJson)}\n`,
  );
  expectValidMatrixJson(outputs.rawJson);
}

describe("batch-review-compare CLI", () => {
  it("emits the expected raw JSON contradiction-and-coverage matrix from summary fixtures", async () => {
    const [result, expectedJson] = await Promise.all([
      runMatrixCli(["--matrix", "--json"]),
      readExpectedMatrixJson(),
    ]);

    expect(result.stdout).toBe(expectedCliMatrixJson(expectedJson));
    expectValidMatrixJson(result.stdout);
  });

  it("emits the expected raw Markdown contradiction-and-coverage matrix from summary fixtures", async () => {
    const [result, expectedMarkdown] = await Promise.all([
      runMatrixCli(["--matrix"]),
      readExpectedMatrixMarkdown(),
    ]);

    expect(result.stdout).toBe(
      expectedCliMatrixMarkdown(expectedMarkdown).trimEnd(),
    );
  });

  it("writes paired matrix markdown and raw JSON artifacts without requiring shell redirection", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "aiql-matrix-artifacts-"),
    );
    const markdownPath = path.join(tempDir, "matrix.md");
    const jsonPath = path.join(tempDir, "matrix.json");

    const result = await runMatrixCli([
      "--matrix-output",
      markdownPath,
      "--matrix-json-output",
      jsonPath,
    ]);

    const outputs = await readMatrixArtifactOutputs({ markdownPath, jsonPath });

    expect(result.stdout).toContain("Batch review summary comparison completed.");
    expectMatrixArtifactOutputs(outputs);
  });
});
