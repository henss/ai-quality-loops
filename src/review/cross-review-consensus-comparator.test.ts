import * as fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import {
  compareCrossReviewConsensus,
  formatCrossReviewConsensusReport,
} from "./cross-review-consensus-comparator.js";

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

function createConsensusFixture() {
  return [
    {
      label: "Reviewer A",
      result: createResult(
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
            summary: "The summary needs a clearer caller-owned approval boundary.",
            severity: "medium",
            recommendation: "State that approval remains caller-owned.",
            evidence: ["Evidence B"],
          },
        ],
        "high",
      ),
    },
    {
      label: "Reviewer B",
      result: createResult(
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
            summary: "The note should keep approval authority caller-owned.",
            severity: "medium",
            recommendation: "State that approval remains caller-owned.",
            evidence: ["Evidence B"],
          },
        ],
        "high",
      ),
    },
    {
      label: "Reviewer C",
      result: createResult(
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
            evidence: ["Evidence D"],
          },
        ],
        "medium",
      ),
    },
  ] as const;
}

describe("cross-review consensus comparator", () => {
  it("aggregates consensus across several structured review results", () => {
    const comparison = compareCrossReviewConsensus({
      reviews: [...createConsensusFixture()],
    });

    expect(comparison.reviewCount).toBe(3);
    expect(comparison.findingCount).toBe(3);
    expect(comparison.overallSeverity).toEqual({
      level: "majority",
      selectedSeverity: "high",
      counts: {
        critical: 0,
        high: 2,
        medium: 1,
        low: 0,
        unknown: 0,
      },
    });
    expect(comparison.counts.findingPresence).toEqual({
      unanimous: 1,
      majority: 1,
      split: 1,
      "single-reviewer": 0,
    });
    expect(comparison.counts.findingSeverity).toEqual({
      unanimous: 1,
      majority: 1,
      split: 0,
      "single-reviewer": 1,
    });
    expect(comparison.counts.wording).toEqual({
      unanimous: 0,
      majority: 1,
      split: 1,
      "single-reviewer": 1,
    });
    expect(comparison.counts.recommendation).toEqual({
      unanimous: 1,
      majority: 1,
      split: 0,
      "single-reviewer": 1,
    });
    expect(comparison.counts.evidence).toEqual({
      unanimous: 1,
      majority: 1,
      split: 0,
      "single-reviewer": 1,
    });
    expect(comparison.findings.map((finding) => finding.title)).toEqual([
      "Claim support",
      "Approval boundary",
      "Sponsor language",
    ]);
    expect(comparison.findings[0]).toEqual(
      expect.objectContaining({
        key: "claim support",
        presentReviewCount: 3,
        missingReviewCount: 0,
        presenceConsensus: "unanimous",
        severityConsensus: expect.objectContaining({
          level: "majority",
          selectedSeverity: "high",
          counts: {
            critical: 0,
            high: 2,
            medium: 1,
            low: 0,
            unknown: 0,
          },
        }),
        wordingConsensus: "majority",
        recommendationConsensus: "majority",
        evidenceConsensus: "majority",
      }),
    );
    expect(comparison.findings[1]).toEqual(
      expect.objectContaining({
        key: "approval boundary",
        presenceConsensus: "majority",
        severityConsensus: expect.objectContaining({
          level: "unanimous",
          selectedSeverity: "medium",
        }),
        wordingConsensus: "split",
        recommendationConsensus: "unanimous",
        evidenceConsensus: "unanimous",
      }),
    );
    expect(comparison.findings[2]).toEqual(
      expect.objectContaining({
        key: "sponsor language",
        presenceConsensus: "split",
        severityConsensus: expect.objectContaining({
          level: "single-reviewer",
          selectedSeverity: "medium",
        }),
      }),
    );
  });

  it("rejects single-review input", () => {
    expect(() =>
      compareCrossReviewConsensus({
        reviews: [
          {
            label: "Reviewer A",
            result: createResult([]),
          },
        ],
      }),
    ).toThrow("Cross-review consensus comparison requires at least two reviews.");
  });

  it("formats the synthetic consensus example", async () => {
    const expected = await readExampleMarkdown(
      "synthetic-cross-review-consensus-report.md",
    );

    const report = {
      inputs: [
        { label: "Reviewer A structured result" },
        { label: "Reviewer B structured result" },
        { label: "Reviewer C structured result" },
      ],
      comparison: compareCrossReviewConsensus({
        reviews: [...createConsensusFixture()],
      }),
    };

    expect(
      formatCrossReviewConsensusReport(report, {
        title: "Synthetic Cross-Review Consensus Report",
      }),
    ).toBe(expected);
  });
});
