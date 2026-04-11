import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  compareBatchReviewArtifactSummaries,
  formatBatchReviewSummaryComparisonReport,
  runBatchReviewSummaryComparison,
} from "./batch-review-summary-compare.js";
import type { BatchReviewArtifactSummary } from "../contracts/json-contracts.js";

function createSummary(
  results: BatchReviewArtifactSummary["results"],
): BatchReviewArtifactSummary {
  return {
    manifestPath: "Local file path (.json file)",
    total: results.length,
    succeeded: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failure").length,
    results,
  };
}

describe("batch review summary compare", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "aiql-batch-summary-compare-"),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("compares entry and severity movement by resultKey", () => {
    const before = createSummary([
      {
        index: 0,
        name: "Homepage",
        resultKey: "homepage-vision",
        mode: "vision",
        targetSummary: "Remote URL (example.com)",
        status: "success",
        structuredResult: {
          overallSeverity: "high",
          totalFindings: 2,
          findingCounts: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 1,
            unknown: 0,
          },
        },
      },
      {
        index: 1,
        name: "Readme",
        resultKey: "readme-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "failure",
        errorSummary: "Error: Failed to open Local file path (.md file)",
      },
      {
        index: 2,
        name: "Changelog",
        resultKey: "changelog-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "success",
        structuredResult: {
          overallSeverity: "medium",
          totalFindings: 1,
          findingCounts: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 0,
            unknown: 0,
          },
        },
      },
    ]);
    const after = createSummary([
      {
        index: 0,
        name: "Homepage",
        resultKey: "homepage-vision",
        mode: "vision",
        targetSummary: "Remote URL (example.com)",
        status: "success",
        structuredResult: {
          overallSeverity: "medium",
          totalFindings: 1,
          findingCounts: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 0,
            unknown: 0,
          },
        },
      },
      {
        index: 1,
        name: "Readme",
        resultKey: "readme-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "success",
      },
      {
        index: 2,
        name: "Pricing",
        resultKey: "pricing-vision",
        mode: "vision",
        targetSummary: "Remote URL (example.com)",
        status: "success",
        structuredResult: {
          overallSeverity: "critical",
          totalFindings: 1,
          findingCounts: {
            critical: 1,
            high: 0,
            medium: 0,
            low: 0,
            unknown: 0,
          },
        },
      },
    ]);

    const comparison = compareBatchReviewArtifactSummaries({ before, after });

    expect(comparison.counts).toEqual({
      beforeEntries: 3,
      afterEntries: 3,
      added: 1,
      removed: 1,
      matched: 2,
      statusChanged: 1,
      severityMovement: {
        improved: 1,
        regressed: 0,
        unchanged: 0,
        unavailable: 1,
      },
      totalFindingsDelta: -1,
      findingCountDelta: {
        critical: 0,
        high: -1,
        medium: 1,
        low: -1,
        unknown: 0,
      },
    });
    expect(comparison.added.map((entry) => entry.resultKey)).toEqual([
      "pricing-vision",
    ]);
    expect(comparison.removed.map((entry) => entry.resultKey)).toEqual([
      "changelog-expert",
    ]);
    expect(comparison.changed.map((entry) => entry.resultKey)).toEqual([
      "homepage-vision",
      "readme-expert",
    ]);
  });

  it("loads summaries from disk and formats a deterministic report", async () => {
    const beforePath = path.join(tempDir, "before.json");
    const afterPath = path.join(tempDir, "after.json");
    await fs.writeFile(
      beforePath,
      JSON.stringify(
        createSummary([
          {
            index: 0,
            name: "Homepage",
            resultKey: "homepage-vision",
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: {
              overallSeverity: "high",
              totalFindings: 2,
              findingCounts: {
                critical: 0,
                high: 1,
                medium: 0,
                low: 1,
                unknown: 0,
              },
            },
          },
        ]),
      ),
      "utf-8",
    );
    await fs.writeFile(
      afterPath,
      JSON.stringify(
        createSummary([
          {
            index: 0,
            name: "Homepage",
            resultKey: "homepage-vision",
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: {
              overallSeverity: "medium",
              totalFindings: 1,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 1,
                low: 0,
                unknown: 0,
              },
            },
          },
        ]),
      ),
      "utf-8",
    );

    const report = await runBatchReviewSummaryComparison({
      beforePath: "./before.json",
      afterPath: "./after.json",
      cwd: tempDir,
    });

    expect(report.inputs.before.pathLabel).toBe("Local file path (.json file)");
    expect(formatBatchReviewSummaryComparisonReport(report)).toBe([
      "Batch review summary comparison completed.",
      "Before: Local file path (.json file).",
      "After: Local file path (.json file).",
      "Entries: before=1, after=1, matched=1, added=0, removed=0, statusChanged=0.",
      "Severity movement among matched entries: improved=1, regressed=0, unchanged=0, unavailable=0.",
      "Finding count delta: total=-1; critical=0, high=-1, medium=1, low=-1, unknown=0.",
      "Changed matched entries:",
      "- homepage-vision: status unchanged; severity high->medium (improved); findings delta=-1",
    ].join("\n"));
  });

  it("rejects duplicate result keys in either summary", () => {
    const before = createSummary([
      {
        index: 0,
        resultKey: "readme-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "success",
      },
      {
        index: 1,
        resultKey: "readme-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "success",
      },
    ]);
    const after = createSummary([]);

    expect(() =>
      compareBatchReviewArtifactSummaries({ before, after }),
    ).toThrow('duplicate resultKey "readme-expert"');
  });
});
