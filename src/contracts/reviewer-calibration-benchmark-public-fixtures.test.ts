import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  REVIEWER_CALIBRATION_BENCHMARK_CASES,
  REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
  formatReviewerCalibrationBenchmarkReport,
} from "../review/reviewer-calibration-benchmark.js";
import { runReviewerCalibrationBenchmark } from "../review/reviewer-calibration-benchmark-runner.js";

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

describe("synthetic reviewer calibration benchmark public fixtures", () => {
  it("keeps prompt-only cases separate from withheld gold judgments", async () => {
    const casesText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.cases.json",
      ),
      "utf-8",
    );
    const goldText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.gold.json",
      ),
      "utf-8",
    );
    const casesFixture = JSON.parse(casesText) as { cases?: unknown };
    const goldFixture = JSON.parse(goldText) as { goldJudgments?: unknown };

    expect(casesFixture.cases).toEqual(REVIEWER_CALIBRATION_BENCHMARK_CASES);
    expect(goldFixture.goldJudgments).toEqual(
      REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
    );
    expect(casesText).not.toContain("goldJudgments");
    expect(goldText).not.toContain("packetSummary");

    const serialized = `${casesText}\n${goldText}`.toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });

  it("ships baseline scoring output generated from separate cases, gold, and observed-run fixtures", async () => {
    const expectedText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.expected.md",
      ),
      "utf-8",
    );
    const report = await runReviewerCalibrationBenchmark({
      casesPath: "examples/synthetic-reviewer-calibration-benchmark.cases.json",
      goldJudgmentsPath: "examples/synthetic-reviewer-calibration-benchmark.gold.json",
      observedRunsPath:
        "examples/synthetic-reviewer-calibration-benchmark.observed-runs.json",
    });

    expect(formatReviewerCalibrationBenchmarkReport(report)).toBe(
      expectedText.trimEnd(),
    );
    expect(report.runScores[1]?.caseScores[2]?.issues).toEqual([
      "expected verdict changes_requested, observed accept",
      "expected severity at least medium, observed low",
      "missing finding keys: verification-log-noise",
      "missing signal groups: command noise | repeated command; verification signal",
      "missing next-step actions: revise_artifact",
    ]);
  });
});
