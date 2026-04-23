import { describe, expect, it } from "vitest";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { classifyReviewEscalationSignals } from "./escalation-signal-classifier.js";

function createResult(
  overrides: Partial<StructuredReviewResult> = {},
): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "General QA",
    model: "llama3.1:8b",
    summary: "Synthetic summary",
    overallSeverity: "unknown",
    findings: [],
    provenance: [{ label: "Content source", value: "Synthetic packet" }],
    markdown: "# Summary\nSynthetic summary",
    ...overrides,
  };
}

describe("review escalation signal classifier", () => {
  it("classifies critical and blocking review outputs into reusable signals", () => {
    const result = createResult({
      overallSeverity: "critical",
      findings: [
        {
          key: "missing-disclaimer",
          title: "Missing disclaimer",
          summary: "Critical severity because the artifact omits a required caveat.",
          severity: "critical",
        },
        {
          key: "evidence-gap",
          title: "Evidence gap",
          summary: "Medium severity because the evidence table is incomplete.",
          severity: "medium",
        },
      ],
      decision: {
        schema: "peer_review_decision_v1",
        verdict: "blocked",
        confidence: "high",
        blocking: true,
        max_severity: "critical",
        summary: "The packet is blocked until the missing caveat is restored.",
        blocking_findings: [
          {
            key: "missing-disclaimer",
            title: "Missing disclaimer",
            summary: "Critical severity because the artifact omits a required caveat.",
            severity: "critical",
          },
        ],
        non_blocking_findings: [
          {
            key: "evidence-gap",
            title: "Evidence gap",
            summary: "Medium severity because the evidence table is incomplete.",
            severity: "medium",
          },
        ],
        required_before_merge: ["Restore the missing disclaimer."],
        follow_up: ["Audit the evidence table wording."],
        next_step_actions: [
          "collect_more_evidence",
          "request_caller_review",
          "track_follow_up",
        ],
      },
    });

    const report = classifyReviewEscalationSignals(result);

    expect(report.highestSignalSeverity).toBe("critical");
    expect(report.signals.map((signal) => signal.id)).toEqual([
      "critical_severity",
      "blocking_decision",
      "blocked_verdict",
      "collect_more_evidence",
      "request_caller_review",
      "track_follow_up",
    ]);
    expect(report.signals[0]).toEqual(
      expect.objectContaining({
        id: "critical_severity",
        category: "severity",
        findingKeys: ["missing-disclaimer"],
      }),
    );
    expect(report.signals[3]).toEqual(
      expect.objectContaining({
        id: "collect_more_evidence",
        nextStepActions: ["collect_more_evidence"],
        findingKeys: ["missing-disclaimer", "evidence-gap"],
      }),
    );
  });

  it("classifies high-severity findings without a structured decision", () => {
    const report = classifyReviewEscalationSignals(
      createResult({
        overallSeverity: "high",
        findings: [
          {
            title: "Primary CTA contrast",
            summary: "High severity because the primary CTA remains below contrast guidance.",
            severity: "high",
          },
        ],
      }),
    );

    expect(report).toEqual({
      highestSignalSeverity: "high",
      signals: [
        expect.objectContaining({
          id: "high_severity",
          category: "severity",
          severity: "high",
          findingKeys: ["Primary CTA contrast"],
        }),
      ],
    });
  });

  it("treats process failures as escalation signals even when severity was unknown", () => {
    const result = createResult({
      decision: {
        schema: "peer_review_decision_v1",
        verdict: "process_failed",
        confidence: "medium",
        blocking: false,
        max_severity: "unknown",
        summary: "The local review run timed out before producing a stable answer.",
        blocking_findings: [],
        non_blocking_findings: [],
        required_before_merge: [],
        follow_up: [],
        next_step_actions: ["rerun_review"],
      },
    });

    const report = classifyReviewEscalationSignals(result);

    expect(report.highestSignalSeverity).toBe("medium");
    expect(report.signals.map((signal) => signal.id)).toEqual([
      "process_failed_verdict",
      "rerun_review",
    ]);
    expect(report.signals).toEqual([
      expect.objectContaining({
        id: "process_failed_verdict",
        severity: "medium",
      }),
      expect.objectContaining({
        id: "rerun_review",
        nextStepActions: ["rerun_review"],
      }),
    ]);
  });

  it("classifies accepted follow-up work without implying caller routing", () => {
    const result = createResult({
      overallSeverity: "low",
      decision: {
        schema: "peer_review_decision_v1",
        verdict: "accept_with_follow_up",
        confidence: "high",
        blocking: false,
        max_severity: "low",
        summary: "The artifact can proceed with a small wording cleanup.",
        blocking_findings: [],
        non_blocking_findings: [
          {
            key: "wording-cleanup",
            title: "Wording cleanup",
            summary: "Low severity because one caveat sentence can be clearer.",
            severity: "low",
          },
        ],
        required_before_merge: [],
        follow_up: ["Clarify the one remaining caveat sentence."],
        next_step_actions: ["track_follow_up"],
      },
    });

    const report = classifyReviewEscalationSignals(result);

    expect(report).toEqual({
      highestSignalSeverity: "low",
      signals: [
        expect.objectContaining({
          id: "track_follow_up",
          category: "workflow",
          severity: "low",
          findingKeys: ["wording-cleanup"],
          nextStepActions: ["track_follow_up"],
        }),
      ],
    });
  });
});
