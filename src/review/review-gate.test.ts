import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  evaluateReviewGate,
  formatReviewGateReport,
  loadBatchReviewArtifactSummaries,
  loadStructuredReviewResults,
  runReviewGate,
} from "./review-gate.js";

describe("review gate", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-review-gate-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("fails when structured findings exceed explicit severity budgets", async () => {
    const resultPath = path.join(tempDir, "homepage-review.json");
    await fs.writeFile(
      resultPath,
      JSON.stringify(
        {
          schemaVersion: "1",
          workflow: "vision",
          expert: "UI/UX",
          model: "qwen3-vl:30b",
          summary: "One major issue remains.",
          overallSeverity: "high",
          findings: [
            {
              title: "CTA contrast",
              summary: "The hero CTA does not meet contrast guidance.",
              severity: "high",
            },
            {
              title: "Missing focus state",
              summary: "The keyboard focus ring is hard to perceive.",
              severity: "medium",
            },
          ],
          provenance: [
            { label: "Content source", value: "Remote URL (example.com)" },
          ],
          markdown: "# Summary\nOne major issue remains.",
        },
        null,
        2,
      ),
    );

    const report = await runReviewGate({
      resultPaths: [resultPath],
      thresholds: {
        failOnSeverity: "critical",
        maxFindings: {
          high: 0,
          medium: 2,
        },
      },
    });

    expect(report.ok).toBe(false);
    expect(report.counts.findingCounts.high).toBe(1);
    expect(report.counts.highestObservedSeverity).toBe("high");
    expect(report.violations).toEqual([
      expect.objectContaining({
        kind: "finding-budget",
        severity: "high",
        actual: 1,
        allowed: 0,
      }),
    ]);
    expect(formatReviewGateReport(report)).toContain("Review gate failed.");
    expect(formatReviewGateReport(report)).toContain("max-high budget (0)");
  });

  it("fails on overall severity even when the finding list is empty", () => {
    const report = evaluateReviewGate({
      structuredReviewResults: [
        {
          path: "D:\\workspace\\private\\result.json",
          pathLabel: "Local file path (.json file)",
          result: {
            schemaVersion: "1",
            workflow: "expert",
            expert: "Efficiency",
            model: "qwen3.5:32b",
            summary: "A blocker remains.",
            overallSeverity: "critical",
            findings: [],
            provenance: [
              { label: "Content source", value: "Local file path (.md file)" },
            ],
            markdown: "# Summary\nA blocker remains.",
          },
        },
      ],
      thresholds: {
        failOnSeverity: "critical",
      },
    });

    expect(report.ok).toBe(false);
    expect(report.violations).toEqual([
      expect.objectContaining({
        kind: "severity-threshold",
        actual: "critical",
      }),
    ]);
  });

  it("applies failed-review budgets to batch summary inputs", async () => {
    const summaryPath = path.join(tempDir, "batch-summary.json");
    await fs.writeFile(
      summaryPath,
      JSON.stringify(
        {
          manifestPath: "Local file path (.json file)",
          total: 3,
          succeeded: 1,
          failed: 2,
          results: [
            {
              index: 0,
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "failure",
            },
            {
              index: 1,
              mode: "expert",
              targetSummary: "Local file path (.md file)",
              status: "success",
            },
            {
              index: 2,
              mode: "expert",
              targetSummary: "Local file path (.md file)",
              status: "failure",
            },
          ],
        },
        null,
        2,
      ),
    );

    const loadedSummaries = await loadBatchReviewArtifactSummaries([summaryPath]);
    const report = evaluateReviewGate({
      batchSummaries: loadedSummaries,
      thresholds: {
        maxFailedReviews: 1,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.counts.failedBatchReviews).toBe(2);
    expect(report.violations).toEqual([
      expect.objectContaining({
        kind: "failed-review-budget",
        actual: 2,
        allowed: 1,
      }),
    ]);
  });

  it("loads structured review results from disk with sanitized input labels", async () => {
    const resultPath = path.join(tempDir, "review.json");
    await fs.writeFile(
      resultPath,
      JSON.stringify(
        {
          schemaVersion: "1",
          workflow: "expert",
          expert: "Efficiency",
          model: "qwen3.5:32b",
          summary: "No actionable findings.",
          overallSeverity: "low",
          findings: [
            {
              title: "Minor wording",
              summary: "One sentence could be tighter.",
              severity: "low",
            },
          ],
          provenance: [
            { label: "Content source", value: "Local file path (.md file)" },
          ],
          markdown: "# Summary\nNo actionable findings.",
        },
        null,
        2,
      ),
    );

    const loaded = await loadStructuredReviewResults([resultPath]);
    expect(loaded).toEqual([
      expect.objectContaining({
        path: resultPath,
        pathLabel: "Local file path (.json file)",
      }),
    ]);
  });
});

