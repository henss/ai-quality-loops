import { describe, expect, it } from "vitest";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import {
  RECURRING_REVIEW_FAILURE_EVAL_CASES,
  evaluateRecurringReviewFailureHarness,
  formatRecurringReviewFailureHarnessReport,
} from "./recurring-review-failure-eval.js";

function createStructuredResult(input: {
  summary: string;
  overallSeverity?: StructuredReviewResult["overallSeverity"];
  findings: StructuredReviewResult["findings"];
  nextStepActions?: NonNullable<StructuredReviewResult["decision"]>["next_step_actions"];
}): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "Evidence Reviewer",
    model: "synthetic-recurring-review-failure-eval",
    summary: input.summary,
    overallSeverity: input.overallSeverity ?? "medium",
    findings: input.findings,
    decision: {
      schema: "peer_review_decision_v1",
      verdict: "accept_with_follow_up",
      confidence: "medium",
      blocking: false,
      max_severity: input.overallSeverity ?? "medium",
      summary: input.summary,
      blocking_findings: [],
      non_blocking_findings: input.findings,
      required_before_merge: [],
      follow_up: ["Keep remediation caller-owned until the packet is repaired."],
      next_step_actions: input.nextStepActions ?? ["track_follow_up"],
    },
    provenance: [
      {
        label: "Content source",
        value: "Synthetic recurring review-failure eval packet",
      },
    ],
    markdown: `# Summary\n${input.summary}`,
  };
}

function createPassingObservedResults() {
  return [
    {
      caseId: "missing-evidence-handles",
      result: createStructuredResult({
        summary:
          "The packet leaves one evidence handle unresolved, so traceability is incomplete.",
        findings: [
          {
            key: "missing-evidence-handle",
            title: "Evidence handle is missing",
            summary:
              "One source handle is opaque and unresolved, so the packet should not be treated as traceable.",
            severity: "medium",
            recommendation:
              "Collect the missing evidence handle before treating the packet as review-ready.",
          },
        ],
        nextStepActions: ["collect_more_evidence"],
      }),
    },
    {
      caseId: "stale-deterministic-inputs",
      result: createStructuredResult({
        summary:
          "The deterministic input snapshot is stale and risks drift against the current packet.",
        findings: [
          {
            key: "stale-deterministic-input",
            title: "Deterministic input is stale",
            summary:
              "The baseline snapshot is outdated, so the reviewer needs refreshed evidence before trusting it.",
            severity: "medium",
            recommendation:
              "Collect refreshed deterministic input and track follow-up on the drift source.",
          },
        ],
        nextStepActions: ["collect_more_evidence", "track_follow_up"],
      }),
    },
    {
      caseId: "repeated-command-noise",
      result: createStructuredResult({
        summary:
          "Repeated command noise obscures the verification signal and should be reduced.",
        findings: [
          {
            key: "command-noise-obscures-signal",
            title: "Command noise obscures signal",
            summary:
              "The packet repeats command output until the actual verification evidence is hard to locate.",
            severity: "medium",
            recommendation:
              "Revise the artifact to keep concise evidence and strip repeated command log spam.",
          },
        ],
        nextStepActions: ["revise_artifact"],
      }),
    },
    {
      caseId: "verification-wrapper-mismatch",
      result: createStructuredResult({
        summary:
          "The verification wrapper cites a different command than the output shown, so the check is misaligned.",
        findings: [
          {
            key: "verification-wrapper-mismatch",
            title: "Verification wrapper mismatch",
            summary:
              "The wrapper summary and the cited command disagree, so the run should be rerun with caller review.",
            severity: "high",
            recommendation:
              "Rerun the review and request caller review before trusting the verification evidence.",
          },
        ],
        overallSeverity: "high",
        nextStepActions: ["rerun_review", "request_caller_review"],
      }),
    },
    {
      caseId: "launch-evidence-regression-omission",
      result: createStructuredResult({
        summary:
          "The launch outcome evidence summary omits one added review entry and one severity movement, so the stability claim is incomplete.",
        findings: [
          {
            key: "launch-evidence-regression-omission",
            title: "Launch evidence omits comparison regression signals",
            summary:
              "The evidence summary skips added, removed, and regressed review entries while still describing the launch surface as stable.",
            severity: "medium",
            recommendation:
              "Revise the artifact and collect the omitted comparison evidence before reusing the launch note.",
          },
        ],
        nextStepActions: ["revise_artifact", "collect_more_evidence"],
      }),
    },
    {
      caseId: "launch-evidence-gate-overclaim",
      result: createStructuredResult({
        summary:
          "The gate result was not provided, but the launch note still says the surface is defended and ready.",
        findings: [
          {
            key: "launch-evidence-gate-overclaim",
            title: "Launch evidence overclaims missing gate coverage",
            summary:
              "The gate result is absent, so the launch readiness claim is an overclaim that needs caller review and more evidence.",
            severity: "high",
            recommendation:
              "Request caller review and collect the missing gate evidence before repeating the defended-readiness claim.",
          },
        ],
        overallSeverity: "high",
        nextStepActions: ["request_caller_review", "collect_more_evidence"],
      }),
    },
    {
      caseId: "bundle-truncation-hides-signals",
      result: createStructuredResult({
        summary:
          "Bundle truncation hides a material review signal, so the wrapper claim that all findings were included is missing evidence.",
        findings: [
          {
            key: "bundle-truncation-hides-signals",
            title: "Bundle truncation hides material signals",
            summary:
              "The truncated review bundle omitted a material finding while the wrapper treated the shortened packet as complete.",
            severity: "medium",
            recommendation:
              "Collect the missing bundle segment and revise the artifact before relying on the review signal summary.",
          },
        ],
        nextStepActions: ["collect_more_evidence", "revise_artifact"],
      }),
    },
    {
      caseId: "source-audit-evidence-path-gap",
      result: createStructuredResult({
        summary:
          "The source audit references evidence paths that are missing or unresolved, so caller review is needed before reuse.",
        findings: [
          {
            key: "source-audit-evidence-path-gap",
            title: "Source audit evidence path is unresolved",
            summary:
              "The source audit says the evidence path is attached, but one source path is not provided and another remains unresolved.",
            severity: "medium",
            recommendation:
              "Collect the missing evidence path and request caller review before treating the audit as traceable.",
          },
        ],
        nextStepActions: ["collect_more_evidence", "request_caller_review"],
      }),
    },
    {
      caseId: "unclassified-runtime-stderr",
      result: createStructuredResult({
        summary:
          "The packet records runtime stderr but leaves it unclassified, so caller review and a rerun are needed.",
        findings: [
          {
            key: "unclassified-runtime-stderr",
            title: "Runtime stderr is unclassified",
            summary:
              "Runtime stderr is unresolved and not interpreted as expected, harmless, or blocking.",
            severity: "medium",
            recommendation:
              "Rerun the review and request caller review before relying on the packet.",
          },
        ],
        nextStepActions: ["rerun_review", "request_caller_review"],
      }),
    },
  ] satisfies Array<{
    caseId: string;
    result: StructuredReviewResult;
  }>;
}

describe("evaluateRecurringReviewFailureHarness", () => {
  it("passes when each structured result covers the expected failure signals", () => {
    const report = evaluateRecurringReviewFailureHarness({
      cases: RECURRING_REVIEW_FAILURE_EVAL_CASES,
      observedResults: createPassingObservedResults(),
    });

    expect(report.status).toBe("passed");
    expect(report.failed).toBe(0);
    expect(report.results.every((result) => result.status === "passed")).toBe(true);
    expect(formatRecurringReviewFailureHarnessReport(report)).toContain(
      "Recurring review-failure eval: 9 passed, 0 failed, 9 total.",
    );
  });

  it("fails when a case is missing expected signals or next-step actions", () => {
    const report = evaluateRecurringReviewFailureHarness({
      cases: RECURRING_REVIEW_FAILURE_EVAL_CASES,
      observedResults: [
        {
          caseId: "missing-evidence-handles",
          result: createStructuredResult({
            summary: "The packet needs one follow-up note.",
            findings: [
              {
                key: "weak-follow-up",
                title: "Follow-up note is weak",
                summary: "The packet is vague.",
                severity: "low",
              },
            ],
            overallSeverity: "low",
            nextStepActions: ["track_follow_up"],
          }),
        },
      ],
    });

    expect(report.status).toBe("failed");
    expect(report.failed).toBe(9);
    expect(report.results[0]).toMatchObject({
      caseId: "missing-evidence-handles",
      status: "failed",
      missingFindingKeys: ["missing-evidence-handle"],
      missingNextStepActions: ["collect_more_evidence"],
    });
    expect(report.results[0]?.issues).toContain(
      "overall severity low is lower than required medium",
    );
    expect(report.results[1]?.issues).toContain(
      "no structured review result was provided for this eval case",
    );
  });
});
