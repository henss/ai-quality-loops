import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { validateStructuredReviewResult } from "../contracts/json-contracts.js";
import { defineReviewSurfaceRedactions } from "../shared/review-surface.js";
import { formatReviewSponsorMemo } from "./review-result-sponsor-memo.js";

function createStructuredResult(
  findings: StructuredReviewResult["findings"],
): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "Evidence Reviewer",
    model: "synthetic-reviewer-contract-fixture",
    summary: "Synthetic reviewer-contract fixture with generic evidence labels.",
    overallSeverity: "medium",
    findings,
    provenance: [
      {
        label: "Content source",
        value: "Synthetic review packet",
      },
    ],
    markdown: "# Summary\nSynthetic fixture.",
  };
}

async function loadSyntheticSponsorMemoExample(): Promise<{
  expected: string;
  result: StructuredReviewResult;
}> {
  const fixture = JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "examples/synthetic-pr-review-result.fixture.json"),
      "utf-8",
    ),
  ) as unknown;
  const expected = await fs.readFile(
    path.join(process.cwd(), "examples/synthetic-review-sponsor-memo.md"),
    "utf-8",
  );
  const validation = validateStructuredReviewResult(fixture);
  if (!validation.ok) {
    throw validation.error;
  }

  return {
    expected,
    result: validation.value,
  };
}

describe("review result sponsor memo formatter", () => {
  it("formats a sponsor memo from a decision-bearing structured review result", () => {
    const memo = formatReviewSponsorMemo({
      schemaVersion: "1",
      workflow: "expert",
      expert: "Delivery Reviewer",
      model: "synthetic-decision-fixture",
      summary: "Caller review is still needed before sponsorship.",
      overallSeverity: "high",
      findings: [],
      decision: {
        schema: "peer_review_decision_v1",
        verdict: "blocked",
        confidence: "medium",
        blocking: true,
        max_severity: "high",
        summary: "The reviewer found one unresolved blocker and needs caller review before sponsorship.",
        blocking_findings: [
          {
            title: "Validation evidence is missing",
            summary: "The change does not include a sanitized validation summary yet",
            severity: "high",
            recommendation: "Attach the missing validation evidence before the sponsor decides.",
            evidence: ["Validation slot: missing"],
          },
        ],
        non_blocking_findings: [
          {
            title: "Tracker writes stay caller-owned",
            summary: "The shared layer should not create downstream tracker state.",
            severity: "medium",
          },
        ],
        required_before_merge: ["Attach a sanitized validation summary"],
        follow_up: ["Keep tracker writes caller-owned"],
        next_step_actions: ["request_caller_review", "track_follow_up"],
      },
      provenance: [
        {
          label: "Content source",
          value: "Synthetic sponsor packet",
        },
      ],
      markdown: "# Summary\nDecision fixture.",
    });

    expect(memo).toContain("# Sponsor Memo");
    expect(memo).toContain(
      "- Sponsor posture: pause sponsorship and request caller review before proceeding.",
    );
    expect(memo).toContain("- Reviewer confidence: medium.");
    expect(memo).toContain(
      "- Practical decision: The reviewer found one unresolved blocker and needs caller review before sponsorship.",
    );
    expect(memo).toContain(
      "- Validation evidence is missing (high): The change does not include a sanitized validation summary yet. Recommendation: Attach the missing validation evidence before the sponsor decides. Evidence: Validation slot: missing.",
    );
    expect(memo).toContain(
      "- What is the caller plan for: Attach a sanitized validation summary?",
    );
    expect(memo).toContain(
      "The embedding workflow still owns real approval authority, private source interpretation, tracker writes, and downstream action.",
    );
  });

  it("sanitizes memo content and derives sponsor questions without a structured decision", () => {
    const memo = formatReviewSponsorMemo(
      createStructuredResult([
        {
          title: "Private tracker reference",
          summary: "Escalate policy-alpha-42 to reviewer@example.com",
          severity: "high",
        },
        {
          title: "Second issue",
          summary: "A second medium issue needs a fix plan",
          severity: "medium",
          recommendation: "Draft a bounded mitigation step",
        },
      ]),
      {
        extraRedactions: defineReviewSurfaceRedactions([
          {
            pattern: /policy-alpha-42/g,
            replacement: "[Policy identifier redacted]",
          },
        ]),
      },
    );

    expect(memo).toContain(
      "- Sponsor posture: sponsor only with explicit follow-up ownership for the remaining findings.",
    );
    expect(memo).toContain("Email address");
    expect(memo).toContain("[Policy identifier redacted]");
    expect(memo).not.toContain("policy-alpha-42");
    expect(memo).not.toContain("reviewer@example.com");
    expect(memo).toContain("- What resolution plan addresses Private tracker reference?");
    expect(memo).toContain("- Has the caller completed the recommended action for Second issue?");
  });

  it("matches the public synthetic sponsor memo example", async () => {
    const { expected, result } = await loadSyntheticSponsorMemoExample();
    const memo = formatReviewSponsorMemo(result, {
      sourceLabel: "Synthetic PR review adapter pilot",
    });

    expect(memo).toBe(expected);
    expect(memo).toContain(
      "Sponsor posture: pause sponsorship and request caller review before proceeding.",
    );
    expect(memo).not.toContain("Low-severity wording cleanup");
  });
});
