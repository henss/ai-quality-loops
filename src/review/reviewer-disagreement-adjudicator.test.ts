import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { compareStructuredReviewResults } from "./review-result-comparison.js";
import {
  adjudicateReviewerDisagreement,
  formatReviewerDisagreementAdjudication,
  runReviewerDisagreementAdjudication,
} from "./reviewer-disagreement-adjudicator.js";

async function readExampleJson<T>(filename: string): Promise<T> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}

async function readExampleMarkdown(filename: string): Promise<string> {
  const filePath = new URL(`../../examples/${filename}`, import.meta.url);
  return fs.readFile(filePath, "utf-8");
}

function createResult(
  findings: StructuredReviewResult["findings"],
  overallSeverity: StructuredReviewResult["overallSeverity"] = "unknown",
): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "Reviewer",
    model: "qwen3.5:32b",
    summary: "Summary",
    overallSeverity,
    findings,
    provenance: [{ label: "Content source", value: "Inline content" }],
    markdown: "# Summary\nSummary",
  };
}

describe("reviewer disagreement adjudicator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-quality-loops-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("classifies disagreement patterns from two structured review results", () => {
    const adjudication = adjudicateReviewerDisagreement({
      left: createResult(
        [
          {
            key: "claim-support",
            title: "Claim support",
            summary: "The packet overstates what the cited evidence proves.",
            severity: "high",
            recommendation: "Add a caveat before reusing the claim.",
            evidence: ["Evidence A"],
          },
          {
            key: "approval-boundary",
            title: "Approval boundary",
            summary: "The summary avoids approval language.",
            severity: "low",
          },
          {
            key: "source-traceability",
            title: "Source traceability",
            summary: "Evidence labels stay generic and traceable.",
            severity: "medium",
            evidence: ["Evidence B"],
          },
        ],
        "high",
      ),
      right: createResult(
        [
          {
            key: "claim-support",
            title: "Claim support",
            summary: "The packet still needs a caveat before it can reuse the evidence.",
            severity: "medium",
            recommendation: "Add the caveat and cite the exact evidence label.",
            evidence: ["Evidence A", "Evidence C"],
          },
          {
            key: "sponsor-language",
            title: "Sponsor language",
            summary: "The summary sounds too close to approval guidance.",
            severity: "medium",
            recommendation: "Restate that approval remains caller-owned.",
          },
          {
            key: "source-traceability",
            title: "Source traceability",
            summary: "Evidence labels stay generic and traceable.",
            severity: "medium",
            evidence: ["Evidence B"],
          },
        ],
        "medium",
      ),
    });

    expect(adjudication.overallSeverityAlignment).toBe("mixed");
    expect(adjudication.stableAgreementCount).toBe(1);
    expect(adjudication.counts.disagreements).toBe(3);
    expect(adjudication.counts.byClass).toEqual({
      finding_presence_mismatch: 2,
      severity_calibration_mismatch: 1,
      evidence_coverage_mismatch: 1,
      recommendation_scope_mismatch: 1,
      rationale_wording_mismatch: 1,
    });
    expect(adjudication.counts.byLikelyRootCause).toEqual({
      issue_detection_gap: 2,
      severity_calibration_gap: 1,
      evidence_traceability_gap: 1,
      recommendation_scope_gap: 1,
      wording_normalization_gap: 1,
    });
    expect(adjudication.disagreements.map((item) => item.title)).toEqual([
      "Approval boundary",
      "Sponsor language",
      "Claim support",
    ]);
    expect(adjudication.disagreements[2]?.sponsorTieBreakSummary).toContain(
      "Use the left reviewer as the sponsor-facing default severity",
    );
  });

  it("loads two artifacts from disk and sanitizes their path labels", async () => {
    const leftPath = path.join(tempDir, "left.json");
    const rightPath = path.join(tempDir, "right.json");

    await fs.writeFile(
      leftPath,
      JSON.stringify(
        createResult([
          {
            key: "claim-support",
            title: "Claim support",
            summary: "Needs a caveat.",
            severity: "high",
          },
        ]),
      ),
      "utf-8",
    );
    await fs.writeFile(
      rightPath,
      JSON.stringify(
        createResult([
          {
            key: "claim-support",
            title: "Claim support",
            summary: "Needs a caveat.",
            severity: "high",
          },
        ]),
      ),
      "utf-8",
    );

    const report = await runReviewerDisagreementAdjudication({
      leftPath: "./left.json",
      rightPath: "./right.json",
      cwd: tempDir,
    });

    expect(report.inputs.left.pathLabel).toBe("Local file path (.json file)");
    expect(report.inputs.right.pathLabel).toBe("Local file path (.json file)");
    expect(report.adjudication.counts.disagreements).toBe(0);
    expect(report.adjudication.stableAgreementCount).toBe(1);
  });

  it("formats the synthetic adjudication example", async () => {
    const [left, right, expected] = await Promise.all([
      readExampleJson<StructuredReviewResult>(
        "synthetic-reviewer-disagreement-left.fixture.json",
      ),
      readExampleJson<StructuredReviewResult>(
        "synthetic-reviewer-disagreement-right.fixture.json",
      ),
      readExampleMarkdown("synthetic-reviewer-disagreement-adjudication.md"),
    ]);

    const report = {
      inputs: {
        left: { pathLabel: "Synthetic reviewer disagreement left artifact" },
        right: { pathLabel: "Synthetic reviewer disagreement right artifact" },
      },
      comparison: compareStructuredReviewResults({ before: left, after: right }),
      adjudication: adjudicateReviewerDisagreement({ left, right }),
    };

    expect(
      formatReviewerDisagreementAdjudication(report, {
        title: "Synthetic Reviewer Disagreement Adjudication",
        leftLabel: "Reviewer A",
        rightLabel: "Reviewer B",
        includeStableAgreementSample: true,
        maxDisagreementNotes: 6,
        maxStableAgreementNotes: 2,
      }),
    ).toBe(expected);
  });
});
