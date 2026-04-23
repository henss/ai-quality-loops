import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { validateStructuredReviewResult } from "../contracts/json-contracts.js";
import {
  evaluateReviewResultSponsorPacketHandoff,
  validateReviewResultSponsorPacketHandoff,
} from "./review-result-sponsor-packet-quality-gate.js";

function createStructuredResult(
  findings: StructuredReviewResult["findings"],
  overrides: Partial<StructuredReviewResult> = {},
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
    ...overrides,
  };
}

describe("review result sponsor-packet handoff quality gate", () => {
  it("accepts the public synthetic PR review fixture as a sponsor-packet handoff source", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "examples/synthetic-pr-review-result.fixture.json"),
        "utf-8",
      ),
    ) as unknown;
    const validation = validateStructuredReviewResult(fixture);
    if (!validation.ok) {
      throw validation.error;
    }

    const report = evaluateReviewResultSponsorPacketHandoff(validation.value);
    const gate = validateReviewResultSponsorPacketHandoff(validation.value);

    expect(report.ok).toBe(true);
    expect(report.candidateFindingCount).toBe(2);
    expect(report.highestCandidateSeverity).toBe("high");
    expect(report.issues).toEqual([]);
    expect(gate.ok).toBe(true);
  });

  it("fails when the structured review result omits an explicit decision", () => {
    const report = evaluateReviewResultSponsorPacketHandoff(
      createStructuredResult([
        {
          title: "Validation evidence is missing",
          summary: "The packet still lacks a validation note.",
          severity: "high",
          recommendation: "Attach a sanitized validation note.",
          evidence: ["Validation slot: missing"],
        },
      ]),
    );

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "missing_structured_decision",
        severity: "error",
      }),
    ]);

    const validation = validateReviewResultSponsorPacketHandoff(
      createStructuredResult([
        {
          title: "Validation evidence is missing",
          summary: "The packet still lacks a validation note.",
          severity: "high",
          recommendation: "Attach a sanitized validation note.",
          evidence: ["Validation slot: missing"],
        },
      ]),
    );

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      throw new Error("Expected the sponsor-packet handoff gate to fail.");
    }
    expect(validation.error.message).toContain("explicit decision");
  });

  it("fails when backlog-candidate findings are missing recommendations or evidence", () => {
    const report = evaluateReviewResultSponsorPacketHandoff(
      createStructuredResult(
        [
          {
            key: "missing-recommendation",
            title: "Missing recommendation",
            summary: "The finding does not say what the caller should do next.",
            severity: "high",
            evidence: ["Synthetic evidence label"],
          },
          {
            key: "missing-evidence",
            title: "Missing evidence",
            summary: "The finding has no supporting evidence label.",
            severity: "medium",
            recommendation: "Attach the evidence label before triage.",
          },
        ],
        {
          decision: {
            schema: "peer_review_decision_v1",
            verdict: "changes_requested",
            confidence: "medium",
            blocking: true,
            max_severity: "high",
            summary: "The sponsor packet is not ready yet.",
            blocking_findings: [],
            non_blocking_findings: [],
            required_before_merge: ["Complete the missing handoff fields."],
            follow_up: [],
            next_step_actions: ["revise_artifact"],
          },
        },
      ),
    );

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "candidate_missing_recommendation",
        findingIds: ["missing-recommendation"],
      }),
      expect.objectContaining({
        code: "candidate_missing_evidence",
        findingIds: ["missing-evidence"],
      }),
    ]);
  });

  it("fails when the review still requests more evidence before handoff", () => {
    const report = evaluateReviewResultSponsorPacketHandoff(
      createStructuredResult(
        [
          {
            title: "Validation evidence is missing",
            summary: "The packet still lacks a validation note.",
            severity: "high",
            recommendation: "Attach a sanitized validation note.",
            evidence: ["Validation slot: missing"],
          },
        ],
        {
          overallSeverity: "high",
          decision: {
            schema: "peer_review_decision_v1",
            verdict: "blocked",
            confidence: "medium",
            blocking: false,
            max_severity: "high",
            summary: "The review needs more evidence before sponsor handoff.",
            blocking_findings: [],
            non_blocking_findings: [],
            required_before_merge: [],
            follow_up: [],
            next_step_actions: ["collect_more_evidence"],
          },
        },
      ),
    );

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "incomplete_review_signal",
        signalIds: ["collect_more_evidence"],
      }),
    ]);
  });

  it("can downgrade the missing-decision rule to a warning when the caller opts in", () => {
    const report = evaluateReviewResultSponsorPacketHandoff(
      createStructuredResult([
        {
          title: "Validation evidence is missing",
          summary: "The packet still lacks a validation note.",
          severity: "high",
          recommendation: "Attach a sanitized validation note.",
          evidence: ["Validation slot: missing"],
        },
      ]),
      {
        requireStructuredDecision: false,
      },
    );

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "missing_structured_decision",
        severity: "warning",
      }),
    ]);
  });
});
