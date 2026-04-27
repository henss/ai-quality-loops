import * as fs from "node:fs/promises";
import * as path from "node:path";

import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("reviewer-calibration-benchmark CLI", () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const calibrationCli = path.join(
    repoRoot,
    "src/cli/reviewer-calibration-benchmark.ts",
  );

  it("emits the baseline withheld-gold scoring report from public fixtures", async () => {
    const expectedText = await fs.readFile(
      path.join(
        repoRoot,
        "examples/synthetic-reviewer-calibration-benchmark.expected.md",
      ),
      "utf-8",
    );

    const result = await execa(
      "pnpm",
      [
        "exec",
        "tsx",
        calibrationCli,
        "--cases",
        "examples/synthetic-reviewer-calibration-benchmark.cases.json",
        "--gold",
        "examples/synthetic-reviewer-calibration-benchmark.gold.json",
        "--observed-runs",
        "examples/synthetic-reviewer-calibration-benchmark.observed-runs.json",
      ],
      { cwd: repoRoot },
    );

    expect(result.stdout).toBe(expectedText.trimEnd());
  });
});
