import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runReviewerCalibrationBenchmark } from "./reviewer-calibration-benchmark-runner.js";

describe("runReviewerCalibrationBenchmark", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-calibration-runner-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("loads separate fixtures and scores missing observed results", async () => {
    await fs.writeFile(
      path.join(tempDir, "cases.json"),
      JSON.stringify({
        cases: [
          {
            caseId: "withheld-case",
            title: "Withheld case",
            packetSummary: "A synthetic packet is missing verification evidence.",
            reviewerPrompt: ["Review only the prompt-facing packet summary."],
          },
        ],
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempDir, "gold.json"),
      JSON.stringify({
        goldJudgments: [
          {
            caseId: "withheld-case",
            failureMode: "missed withheld calibration signal",
            expectedVerdict: "changes_requested",
            expectedFindingKeys: ["missing-verification-evidence"],
            expectedSignalGroups: [["verification evidence"]],
            expectedNextStepActions: ["collect_more_evidence"],
            minimumSeverity: "medium",
          },
        ],
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(tempDir, "observed.json"),
      JSON.stringify({
        observedRuns: [
          {
            configurationId: "empty-local-reviewer",
            results: [],
          },
        ],
      }),
      "utf-8",
    );

    const report = await runReviewerCalibrationBenchmark({
      casesPath: "cases.json",
      goldJudgmentsPath: "gold.json",
      observedRunsPath: "observed.json",
      cwd: tempDir,
    });

    expect(report).toMatchObject({
      status: "failed",
      caseCount: 1,
      runScores: [
        {
          configurationId: "empty-local-reviewer",
          status: "failed",
          score: 0,
          maxScore: 5,
          highlightedFailureMode: "missed withheld calibration signal",
          caseScores: [
            {
              caseId: "withheld-case",
              issues: ["missing structured review result"],
            },
          ],
        },
      ],
    });
  });
});
