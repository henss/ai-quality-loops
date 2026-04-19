import { describe, expect, it } from "vitest";
import {
  compareStructuredReviewResults,
  normalizeStructuredReviewFindingKey,
} from "./review-result-comparison.js";
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

interface CallerOwnedReviewFinding {
  topic: string;
  callerImpactCode: "stop" | "watch" | "note";
  callerEvidenceRefs: string[];
  callerRemediation: string;
}

const CALLER_SEVERITY_MAP = {
  stop: "high",
  watch: "medium",
  note: "low",
} as const satisfies Record<
  CallerOwnedReviewFinding["callerImpactCode"],
  StructuredReviewResult["overallSeverity"]
>;

function createCallerMappedResult(
  findings: CallerOwnedReviewFinding[],
): StructuredReviewResult {
  const structuredFindings = findings.map((finding) => ({
    title: finding.topic,
    summary: `${finding.topic} needs ${CALLER_SEVERITY_MAP[finding.callerImpactCode]} attention.`,
    severity: CALLER_SEVERITY_MAP[finding.callerImpactCode],
    recommendation: finding.callerRemediation,
    evidence: finding.callerEvidenceRefs,
  }));

  return createResult(structuredFindings, "high");
}

describe("structured review result comparison", () => {
  it("normalizes findings into a stable reusable grouping key", () => {
    expect(
      normalizeStructuredReviewFindingKey({
        key: "Checkout CTA / Contrast",
        title: "Primary action contrast remains low",
        summary: "The checkout call to action still misses contrast guidance.",
      }),
    ).toBe("checkout cta contrast");

    expect(
      normalizeStructuredReviewFindingKey({
        title: "Checkout CTA",
        summary: "Critical issue because contrast is too low.",
      }),
    ).toBe("checkout cta");

    expect(
      normalizeStructuredReviewFindingKey({
        title: "   ",
        summary: "Mobile overflow on narrow screens.",
      }),
    ).toBe("mobile overflow on narrow screens");
  });

  it("matches repeated findings by explicit stable key when wording changes", () => {
    const report = compareStructuredReviewResults({
      before: createResult([
        {
          key: "checkout-cta-contrast",
          title: "Checkout CTA",
          summary: "Contrast falls below guidance.",
          severity: "critical",
        },
      ]),
      after: createResult([
        {
          key: "checkout cta contrast",
          title: "Primary action contrast",
          summary: "The checkout action still misses contrast guidance.",
          severity: "high",
        },
      ]),
    });

    expect(report.counts).toEqual({
      beforeFindings: 1,
      afterFindings: 1,
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 0,
      severityMovement: {
        improved: 1,
        regressed: 0,
        unchanged: 0,
      },
    });
    expect(report.changed).toEqual([
      expect.objectContaining({
        key: "checkout cta contrast",
        changedFields: ["title", "summary", "severity"],
        severityChange: {
          before: "critical",
          after: "high",
          direction: "improved",
        },
      }),
    ]);
  });

  it("compares added, removed, changed, and unchanged findings across runs", () => {
    const report = compareStructuredReviewResults({
      before: createResult(
        [
          {
            title: "Checkout CTA",
            summary: "Contrast falls below guidance.",
            severity: "critical",
            recommendation: "Raise contrast to 4.5:1.",
          },
          {
            title: "Card spacing",
            summary: "Spacing between cards looks uneven.",
            severity: "low",
          },
          {
            title: "Legacy footer",
            summary: "Footer links still reference deprecated labels.",
            severity: "medium",
          },
        ],
        "critical",
      ),
      after: createResult(
        [
          {
            title: "Checkout CTA",
            summary: "Contrast improved but still misses guidance.",
            severity: "high",
            recommendation: "Keep raising contrast to 4.5:1.",
          },
          {
            title: "Card spacing",
            summary: "Spacing between cards looks uneven.",
            severity: "low",
          },
          {
            title: "Focus states",
            summary: "Keyboard focus is still too subtle in the hero.",
            severity: "medium",
          },
        ],
        "high",
      ),
    });

    expect(report.overallSeverityChange).toEqual({
      before: "critical",
      after: "high",
      direction: "improved",
    });
    expect(report.counts).toEqual({
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
    });
    expect(report.changed).toEqual([
      expect.objectContaining({
        key: "checkout cta",
        changedFields: ["summary", "severity", "recommendation"],
        severityChange: {
          before: "critical",
          after: "high",
          direction: "improved",
        },
      }),
    ]);
    expect(report.unchanged).toEqual([
      expect.objectContaining({
        key: "card spacing",
        changedFields: [],
      }),
    ]);
    expect(report.added).toEqual([
      expect.objectContaining({
        key: "focus states",
        severity: "medium",
      }),
    ]);
    expect(report.removed).toEqual([
      expect.objectContaining({
        key: "legacy footer",
        severity: "medium",
      }),
    ]);
  });

  it("matches duplicate title groups deterministically by normalized summary", () => {
    const report = compareStructuredReviewResults({
      before: createResult([
        {
          title: "Accessibility",
          summary: "Form labels are missing on mobile.",
          severity: "high",
        },
        {
          title: "Accessibility",
          summary: "Focus states are too subtle in the modal.",
          severity: "medium",
        },
      ]),
      after: createResult([
        {
          title: "Accessibility",
          summary: "Focus states are too subtle in the modal.",
          severity: "low",
        },
        {
          title: "Accessibility",
          summary: "Form labels are missing on mobile.",
          severity: "high",
        },
      ]),
    });

    expect(report.counts.added).toBe(0);
    expect(report.counts.removed).toBe(0);
    expect(report.counts.changed).toBe(1);
    expect(report.counts.unchanged).toBe(1);
    expect(report.changed[0]).toEqual(
      expect.objectContaining({
        key: "accessibility",
        before: expect.objectContaining({
          summary: "Focus states are too subtle in the modal.",
          severity: "medium",
        }),
        after: expect.objectContaining({
          summary: "Focus states are too subtle in the modal.",
          severity: "low",
        }),
        severityChange: {
          before: "medium",
          after: "low",
          direction: "improved",
        },
      }),
    );
  });

  it("compares caller-mapped structured results without knowing private field names", () => {
    const report = compareStructuredReviewResults({
      before: createCallerMappedResult([
        {
          topic: "Release checklist",
          callerImpactCode: "stop",
          callerEvidenceRefs: ["artifact-alpha"],
          callerRemediation: "Add the missing confirmation step.",
        },
        {
          topic: "Status note",
          callerImpactCode: "note",
          callerEvidenceRefs: ["artifact-beta"],
          callerRemediation: "Keep the note as-is.",
        },
      ]),
      after: createCallerMappedResult([
        {
          topic: "Release checklist",
          callerImpactCode: "watch",
          callerEvidenceRefs: ["artifact-alpha"],
          callerRemediation: "Confirm the last remaining owner.",
        },
        {
          topic: "Status note",
          callerImpactCode: "note",
          callerEvidenceRefs: ["artifact-beta"],
          callerRemediation: "Keep the note as-is.",
        },
      ]),
    });

    expect(report.counts).toEqual({
      beforeFindings: 2,
      afterFindings: 2,
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 1,
      severityMovement: {
        improved: 1,
        regressed: 0,
        unchanged: 1,
      },
    });
    expect(report.changed).toEqual([
      expect.objectContaining({
        key: "release checklist",
        changedFields: ["summary", "severity", "recommendation"],
        severityChange: {
          before: "high",
          after: "medium",
          direction: "improved",
        },
      }),
    ]);
    expect(JSON.stringify(report)).not.toContain("callerImpactCode");
    expect(JSON.stringify(report)).not.toContain("callerRemediation");
  });
});
