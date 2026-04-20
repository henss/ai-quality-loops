import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execa } from "execa";

describe("review-gate CLI", () => {
  let tempDir: string;
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const reviewGateCli = path.join(repoRoot, "src/cli/review-gate.ts");

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-review-gate-cli-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("applies batch summary prompt-eval budgets from CLI flags", async () => {
    const summaryPath = path.join(tempDir, "batch-summary.json");
    await fs.writeFile(
      summaryPath,
      JSON.stringify({
        manifestPath: "Local file path (.json file)",
        total: 2,
        succeeded: 2,
        failed: 0,
        results: [
          {
            index: 0,
            resultKey: "first-review",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            status: "success",
            ollamaTelemetry: { promptEvalCount: 125 },
          },
          {
            index: 1,
            resultKey: "second-review",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            status: "success",
            ollamaTelemetry: { promptEvalCount: 100 },
          },
        ],
      }),
      "utf-8",
    );

    const result = await execa(
      "pnpm",
      [
        "exec",
        "tsx",
        reviewGateCli,
        "--batch-summary",
        summaryPath,
        "--max-prompt-eval-count",
        "200",
        "--json",
      ],
      { cwd: repoRoot, reject: false },
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout) as {
      violations: Array<{ kind: string; actual: number; allowed: number }>;
    };
    expect(report.violations).toEqual([
      expect.objectContaining({
        kind: "prompt-eval-budget",
        actual: 225,
        allowed: 200,
      }),
    ]);
  });

  it("applies added prompt-eval regression budgets from CLI flags", async () => {
    const comparisonPath = path.join(tempDir, "batch-comparison.json");
    await fs.writeFile(
      comparisonPath,
      JSON.stringify({
        inputs: {
          before: { pathLabel: "Local file path (.json file)" },
          after: { pathLabel: "Local file path (.json file)" },
        },
        comparison: {
          counts: {
            beforeEntries: 1,
            afterEntries: 2,
            added: 1,
            removed: 0,
            matched: 1,
            statusChanged: 0,
            severityMovement: {
              improved: 0,
              regressed: 0,
              unchanged: 1,
              unavailable: 0,
            },
            totalFindingsDelta: 0,
            findingCountDelta: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              unknown: 0,
            },
            promptEvalCountDelta: 175,
            addedPromptEvalCount: 175,
            promptEvalCountUnavailable: 0,
          },
          added: [],
          removed: [],
          changed: [],
          unchanged: [],
        },
      }),
      "utf-8",
    );

    const result = await execa(
      "pnpm",
      [
        "exec",
        "tsx",
        reviewGateCli,
        "--batch-comparison",
        comparisonPath,
        "--max-added-prompt-eval-count",
        "100",
        "--json",
      ],
      { cwd: repoRoot, reject: false },
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout) as {
      violations: Array<{ kind: string; actual: number; allowed: number }>;
    };
    expect(report.violations).toEqual([
      expect.objectContaining({
        kind: "batch-comparison-added-prompt-eval-budget",
        actual: 175,
        allowed: 100,
      }),
    ]);
  });
});
