import { describe, expect, it } from "vitest";
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
});
