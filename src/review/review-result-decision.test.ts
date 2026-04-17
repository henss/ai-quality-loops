import { describe, expect, it } from "vitest";
import { defineReviewSurfaceRedactions } from "../shared/review-surface.js";
import { buildStructuredReviewResult } from "./review-result.js";

describe("structured review decision extraction", () => {
  it("uses review_decision as the structured severity authority instead of prose keywords", () => {
    const result = buildStructuredReviewResult({
      workflow: "expert",
      expert: "TASK ACCEPTANCE REVIEWER",
      model: "qwen3.5:27b",
      provenance: [{ label: "Content source", value: "Local file path (.md file)" }],
      markdown: [
        "# Peer Review",
        "",
        "**Status**: **Complete**",
        "**Verdict**: The agent successfully implemented the packet.",
        "",
        "## Critical Feedback",
        "1. Critical wording appears here, but this is non-blocking hardening.",
        "",
        "**Action**: **Accept**.",
        "",
        "```json",
        JSON.stringify(
          {
            review_decision: {
              schema: "peer_review_decision_v1",
              verdict: "accept_with_follow_up",
              confidence: "medium",
              blocking: false,
              max_severity: "medium",
              summary: "Accept with non-blocking follow-up hardening.",
              blocking_findings: [],
              non_blocking_findings: [
                {
                  title: "Add explicit negative assertion",
                  summary: "The test should assert raw payloads are absent.",
                  severity: "medium",
                },
              ],
              required_before_merge: [],
              follow_up: ["Verify the negative assertion in a later slice."],
            },
          },
          null,
          2,
        ),
        "```",
      ].join("\n"),
    });

    expect(result.overallSeverity).toBe("medium");
    expect(result.findings).toHaveLength(1);
    expect(result.decision).toMatchObject({
      verdict: "accept_with_follow_up",
      blocking: false,
      max_severity: "medium",
    });
  });

  it("sanitizes reviewer-contract strings before publishing the structured result", () => {
    const markdown = [
      "```json",
      JSON.stringify(
        {
          review_decision: {
            schema: "peer_review_decision_v1",
            verdict: "changes_requested",
            confidence: "high",
            blocking: true,
            max_severity: "high",
            summary:
              "Review tenant-alpha at https://example.com/private/page?token=secret#notes before merge.",
            blocking_findings: [
              {
                title: "Private fixture D:\\workspace\\tenant-alpha\\fixtures\\result.json",
                summary:
                  "The reviewer echoed tenant-alpha and reviewer@example.com in the structured payload.",
                severity: "high",
                recommendation:
                  "Move tenant-alpha details out of the shared result and contact reviewer@example.com privately.",
                evidence: [
                  "D:\\workspace\\tenant-alpha\\fixtures\\result.json",
                  "https://example.com/private/page?token=secret#notes",
                ],
              },
            ],
            non_blocking_findings: [],
            required_before_merge: ["Remove tenant-alpha routing text."],
            follow_up: ["Audit reviewer@example.com mentions later."],
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n");

    const result = buildStructuredReviewResult({
      workflow: "expert",
      expert: "TASK ACCEPTANCE REVIEWER",
      model: "qwen3.5:27b",
      provenance: [
        {
          label: "Content source",
          value: "D:\\workspace\\tenant-alpha\\source.md",
        },
      ],
      markdown,
      extraRedactions: defineReviewSurfaceRedactions([
        {
          pattern: /tenant-alpha/g,
          replacement: "[Project identifier redacted]",
        },
      ]),
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("tenant-alpha");
    expect(serialized).not.toContain("reviewer@example.com");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("D:\\workspace");
    expect(result.summary).toContain("[Project identifier redacted]");
    expect(result.summary).toContain("Remote URL");
    expect(result.findings[0]?.evidence).toEqual([
      "Local file path (.json file)",
      "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    ]);
    expect(result.provenance[0]?.value).toBe("Local file path (.md file)");
  });
});
