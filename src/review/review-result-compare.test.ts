import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  compareStructuredReviewResults,
} from "./review-result-comparison.js";
import {
  formatReviewResultComparisonReport,
  runReviewResultComparison,
} from "./review-result-compare.js";
import {
  validateStructuredReviewResult,
} from "../contracts/json-contracts.js";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";

function createResult(
  findings: StructuredReviewResult["findings"],
  overallSeverity: StructuredReviewResult["overallSeverity"] = "unknown",
): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "UI/UX",
    model: "qwen3.5:32b",
    summary: "Summary",
    overallSeverity,
    findings,
    provenance: [{ label: "Content source", value: "Inline content" }],
    markdown: "# Summary\nSummary",
  };
}

describe("review result compare", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-quality-loops-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("loads two structured review results and compares them from relative paths", async () => {
    const beforePath = path.join(tempDir, "before.json");
    const afterPath = path.join(tempDir, "after.json");

    await fs.writeFile(
      beforePath,
      JSON.stringify(
        createResult(
          [
            {
              title: "Checkout CTA",
              summary: "Contrast falls below guidance.",
              severity: "critical",
            },
          ],
          "critical",
        ),
      ),
      "utf-8",
    );
    await fs.writeFile(
      afterPath,
      JSON.stringify(
        createResult(
          [
            {
              title: "Checkout CTA",
              summary: "Contrast improved but still misses guidance.",
              severity: "high",
            },
            {
              title: "Focus states",
              summary: "Keyboard focus is still too subtle in the hero.",
              severity: "medium",
            },
          ],
          "high",
        ),
      ),
      "utf-8",
    );

    const report = await runReviewResultComparison({
      beforePath: "./before.json",
      afterPath: "./after.json",
      cwd: tempDir,
    });

    expect(report.inputs.before.pathLabel).toBe("Local file path (.json file)");
    expect(report.inputs.after.pathLabel).toBe("Local file path (.json file)");
    expect(report.comparison.overallSeverityChange).toEqual({
      before: "critical",
      after: "high",
      direction: "improved",
    });
    expect(report.comparison.counts).toEqual({
      beforeFindings: 1,
      afterFindings: 2,
      added: 1,
      removed: 0,
      changed: 1,
      unchanged: 0,
      severityMovement: {
        improved: 1,
        regressed: 0,
        unchanged: 0,
      },
    });
  });

  it("formats a deterministic human-readable summary", () => {
    const report = {
      inputs: {
        before: { pathLabel: "Local file path (.json file)" },
        after: { pathLabel: "Local file path (.json file)" },
      },
      comparison: {
        overallSeverityChange: {
          before: "critical",
          after: "high",
          direction: "improved",
        },
        counts: {
          beforeFindings: 3,
          afterFindings: 3,
          added: 1,
          removed: 1,
          changed: 1,
          unchanged: 1,
          severityMovement: {
            improved: 1,
            regressed: 0,
            unchanged: 1,
          },
        },
        added: [
          {
            key: "focus states",
            title: "Focus states",
            summary: "Keyboard focus is still too subtle in the hero.",
            severity: "medium",
            evidence: [],
          },
        ],
        removed: [
          {
            key: "legacy footer",
            title: "Legacy footer",
            summary: "Footer links still reference deprecated labels.",
            severity: "medium",
            evidence: [],
          },
        ],
        changed: [
          {
            key: "checkout cta",
            title: "Checkout CTA",
            before: {
              key: "checkout cta",
              title: "Checkout CTA",
              summary: "Contrast falls below guidance.",
              severity: "critical",
              recommendation: "Raise contrast to 4.5:1.",
              evidence: [],
            },
            after: {
              key: "checkout cta",
              title: "Checkout CTA",
              summary: "Contrast improved but still misses guidance.",
              severity: "high",
              recommendation: "Keep raising contrast to 4.5:1.",
              evidence: [],
            },
            changedFields: ["summary", "severity", "recommendation"],
            severityChange: {
              before: "critical",
              after: "high",
              direction: "improved",
            },
          },
        ],
        unchanged: [
          {
            key: "card spacing",
            title: "Card spacing",
            before: {
              key: "card spacing",
              title: "Card spacing",
              summary: "Spacing between cards looks uneven.",
              severity: "low",
              evidence: [],
            },
            after: {
              key: "card spacing",
              title: "Card spacing",
              summary: "Spacing between cards looks uneven.",
              severity: "low",
              evidence: [],
            },
            changedFields: [],
            severityChange: {
              before: "low",
              after: "low",
              direction: "unchanged",
            },
          },
        ],
      },
    } satisfies Awaited<ReturnType<typeof runReviewResultComparison>>;

    expect(formatReviewResultComparisonReport(report)).toBe([
      "Structured review comparison completed.",
      "Before: Local file path (.json file).",
      "After: Local file path (.json file).",
      "Overall severity: critical -> high (improved).",
      "Findings: before=3, after=3, added=1, removed=1, changed=1, unchanged=1.",
      "Severity movement among matched findings: improved=1, regressed=0, unchanged=1.",
      "Added findings:",
      "- [medium] Focus states",
      "Removed findings:",
      "- [medium] Legacy footer",
      "Changed findings:",
      "- [high] Checkout CTA (was critical, improved; changed: summary, severity, recommendation)",
    ].join("\n"));
  });

  it("formats the compact review-output evidence diff fixture as an evidence-only change", async () => {
    const beforeFixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-review-output-evidence-diff-before.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;
    const afterFixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-review-output-evidence-diff-after.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;
    const expectedReport = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-review-output-evidence-diff.expected.md",
      ),
      "utf-8",
    );

    const beforeValidation = validateStructuredReviewResult(beforeFixture);
    const afterValidation = validateStructuredReviewResult(afterFixture);
    expect(beforeValidation.ok).toBe(true);
    expect(afterValidation.ok).toBe(true);
    if (!beforeValidation.ok || !afterValidation.ok) {
      throw new Error(
        "Synthetic review-output evidence diff fixtures must validate",
      );
    }

    const report = {
      inputs: {
        before: { pathLabel: "Local file path (.json file)" },
        after: { pathLabel: "Local file path (.json file)" },
      },
      comparison: compareStructuredReviewResults({
        before: beforeValidation.value,
        after: afterValidation.value,
      }),
    } satisfies Awaited<ReturnType<typeof runReviewResultComparison>>;

    expect(formatReviewResultComparisonReport(report)).toBe(expectedReport.trimEnd());
  });
});
