import { describe, expect, it } from "vitest";
import {
  buildStructuredReviewResult,
  extractStructuredReviewFindings,
  extractStructuredReviewSummary,
  inferReviewSeverity,
  stripReviewReasoningBlocks,
} from "./review-result.js";

const LIVE_SOURCE_PROVENANCE = [
  {
    label: "Content source",
    value: "Inline content",
    freshness: {
      signal: "live_refresh" as const,
      asOf: "2026-04-26T17:54:10.790Z",
    },
    authority: {
      signal: "source_of_truth" as const,
    },
  },
];

function expectLiveSourceProvenance(result: {
  provenance: unknown;
}): void {
  expect(result.provenance).toEqual(LIVE_SOURCE_PROVENANCE);
}

describe("structured review result", () => {
  it("extracts a summary and findings from sectioned markdown", () => {
    const markdown = `
# Summary
The interface is clear overall, but two issues materially reduce trust.

## Critical Issues
- Checkout CTA: Critical issue because the primary action falls below contrast guidance. Recommendation: raise contrast to 4.5:1. Evidence: button label, footer CTA
- Broken hierarchy: High severity because pricing details appear before the plan title.

## Minor polish
Spacing between cards feels uneven.
    `.trim();

    expect(extractStructuredReviewSummary(markdown)).toBe(
      "The interface is clear overall, but two issues materially reduce trust.",
    );
    expect(extractStructuredReviewFindings(markdown)).toEqual([
      expect.objectContaining({
        title: "Checkout CTA",
        severity: "critical",
        recommendation: "raise contrast to 4.5:1. Evidence: button label, footer CTA",
        evidence: ["button label", "footer CTA"],
      }),
      expect.objectContaining({
        title: "Broken hierarchy",
        severity: "high",
      }),
      expect.objectContaining({
        title: "Minor polish",
        severity: "low",
        summary: "Spacing between cards feels uneven.",
      }),
    ]);
  });

  it("falls back to top-level bullets when the markdown has no headings", () => {
    const markdown = [
      "- Missing labels: High severity because the form fields do not expose accessible names.",
      "- Mobile overflow: Medium severity on narrow screens.",
    ].join("\n");

    expect(extractStructuredReviewFindings(markdown)).toEqual([
      expect.objectContaining({
        title: "Missing labels",
        severity: "high",
      }),
      expect.objectContaining({
        title: "Mobile overflow",
        severity: "medium",
      }),
    ]);
  });

  it("builds the reusable result contract with severity rollup and provenance", () => {
    const result = buildStructuredReviewResult({
      workflow: "expert",
      expert: "SKEPTICAL UI/UX CRITIC",
      model: "qwen3.5:27b",
      markdown: [
        "# Overview",
        "The draft is promising but one blocker remains.",
        "",
        "## Findings",
        "- Release checklist: Critical issue because the fallback path is undocumented.",
      ].join("\n"),
      provenance: LIVE_SOURCE_PROVENANCE,
    });

    expect(result).toEqual(
      expect.objectContaining({
        schemaVersion: "1",
        workflow: "expert",
        expert: "SKEPTICAL UI/UX CRITIC",
        model: "qwen3.5:27b",
        summary: "The draft is promising but one blocker remains.",
        overallSeverity: "critical",
        findings: [
          expect.objectContaining({
            title: "Release checklist",
            severity: "critical",
          }),
        ],
        markdown: [
          "# Overview",
          "The draft is promising but one blocker remains.",
          "",
          "## Findings",
          "- Release checklist: Critical issue because the fallback path is undocumented.",
        ].join("\n"),
      }),
    );
    expectLiveSourceProvenance(result);
  });

  it("keeps severity unknown when the markdown does not signal priority", () => {
    expect(inferReviewSeverity("Needs cleanup before merge.")).toBe("unknown");
  });

  it("strips model reasoning blocks before parsing or persisting review markdown", () => {
    const markdown = [
      "<thought>",
      "private chain of thought",
      "</thought>",
      "# Summary",
      "Actionable review summary.",
    ].join("\n");

    expect(stripReviewReasoningBlocks(markdown)).toBe(
      "# Summary\nActionable review summary.",
    );
    expect(
      buildStructuredReviewResult({
        workflow: "expert",
        expert: "Reviewer",
        model: "model",
        markdown,
        provenance: [],
      }).markdown,
    ).toBe("# Summary\nActionable review summary.");
  });
});
