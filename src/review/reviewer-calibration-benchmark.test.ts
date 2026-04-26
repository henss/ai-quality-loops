import { describe, expect, it } from "vitest";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import {
  REVIEWER_CALIBRATION_BENCHMARK_CASES,
  REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
  evaluateReviewerCalibrationBenchmark,
  formatReviewerCalibrationBenchmarkReport,
} from "./reviewer-calibration-benchmark.js";

function createStructuredResult(input: {
  caseId: string;
  summary: string;
  verdict: NonNullable<StructuredReviewResult["decision"]>["verdict"];
  overallSeverity?: StructuredReviewResult["overallSeverity"];
  findingKey: string;
  findingSummary: string;
  nextStepActions: NonNullable<StructuredReviewResult["decision"]>["next_step_actions"];
}): StructuredReviewResult {
  const finding = {
    key: input.findingKey,
    title: input.findingKey
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    summary: input.findingSummary,
    severity: input.overallSeverity ?? "medium",
    recommendation: "Repair the packet before treating the review outcome as defended.",
    evidence: ["Synthetic calibration evidence"],
  };

  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "Calibration Reviewer",
    model: "synthetic-calibration-reviewer",
    summary: input.summary,
    overallSeverity: input.overallSeverity ?? "medium",
    findings: [finding],
    decision: {
      schema: "peer_review_decision_v1",
      verdict: input.verdict,
      confidence: "medium",
      blocking: input.verdict === "blocked",
      max_severity: input.overallSeverity ?? "medium",
      summary: input.summary,
      blocking_findings: input.verdict === "blocked" ? [finding] : [],
      non_blocking_findings: input.verdict === "blocked" ? [] : [finding],
      required_before_merge:
        input.verdict === "changes_requested"
          ? ["Revise the artifact before relying on the result."]
          : [],
      follow_up:
        input.verdict === "accept_with_follow_up"
          ? ["Track the caller-owned evidence repair."]
          : [],
      next_step_actions: input.nextStepActions,
    },
    provenance: [
      {
        label: "Content source",
        value: `Synthetic reviewer calibration case ${input.caseId}`,
      },
    ],
    markdown: `# Summary\n${input.summary}\n\n${input.findingSummary}`,
  };
}

function createPassingResults() {
  return [
    createStructuredResult({
      caseId: "missing-evidence-handle",
      summary:
        "The packet has a missing evidence handle and source handle, so traceability needs more evidence.",
      verdict: "accept_with_follow_up",
      findingKey: "missing-evidence-handle",
      findingSummary:
        "A missing source handle prevents verification of the evidence handle.",
      nextStepActions: ["collect_more_evidence"],
    }),
    createStructuredResult({
      caseId: "stale-input-snapshot",
      summary:
        "The baseline snapshot is stale and outdated, so the deterministic input needs refresh.",
      verdict: "accept_with_follow_up",
      findingKey: "stale-input-snapshot",
      findingSummary:
        "The stale input snapshot can drift from the current baseline.",
      nextStepActions: ["collect_more_evidence", "track_follow_up"],
    }),
    createStructuredResult({
      caseId: "noisy-verification-log",
      summary:
        "Repeated command noise hides the verification signal and requires artifact revision.",
      verdict: "changes_requested",
      findingKey: "verification-log-noise",
      findingSummary:
        "Command noise from repeated command output obscures the verification signal.",
      nextStepActions: ["revise_artifact"],
    }),
    createStructuredResult({
      caseId: "wrapper-command-mismatch",
      summary:
        "The verification wrapper has a mismatch with a different command, so the review should be rerun.",
      verdict: "blocked",
      overallSeverity: "high",
      findingKey: "wrapper-command-mismatch",
      findingSummary:
        "The wrapper and command evidence disagree, creating a verification wrapper mismatch.",
      nextStepActions: ["rerun_review", "request_caller_review"],
    }),
    createStructuredResult({
      caseId: "summary-omits-regression",
      summary:
        "The summary omits a regressed comparison signal and needs the missing evidence restored.",
      verdict: "changes_requested",
      findingKey: "summary-omits-regression",
      findingSummary:
        "The outcome summary is missing the regression detail and omits material review movement.",
      nextStepActions: ["revise_artifact", "collect_more_evidence"],
    }),
    createStructuredResult({
      caseId: "gate-evidence-overclaim",
      summary:
        "The gate evidence is absent, so the readiness overclaim needs caller review.",
      verdict: "blocked",
      overallSeverity: "high",
      findingKey: "gate-evidence-overclaim",
      findingSummary:
        "The gate result is missing while the packet makes a readiness overclaim.",
      nextStepActions: ["request_caller_review", "collect_more_evidence"],
    }),
  ].map((result, index) => ({
    caseId: REVIEWER_CALIBRATION_BENCHMARK_CASES[index]?.caseId ?? "",
    result,
  }));
}

describe("evaluateReviewerCalibrationBenchmark", () => {
  it("scores a passing reviewer configuration against withheld gold judgments", () => {
    const report = evaluateReviewerCalibrationBenchmark({
      cases: REVIEWER_CALIBRATION_BENCHMARK_CASES,
      goldJudgments: REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
      observedRuns: [
        {
          configurationId: "synthetic-local-reviewer",
          results: createPassingResults(),
        },
      ],
    });

    expect(report.status).toBe("passed");
    expect(report.caseCount).toBe(6);
    expect(report.runScores[0]).toMatchObject({
      configurationId: "synthetic-local-reviewer",
      status: "passed",
      score: 30,
      maxScore: 30,
      scorePercent: 100,
      failedCases: 0,
    });
    expect(formatReviewerCalibrationBenchmarkReport(report)).toBe(
      "Reviewer calibration benchmark: 1 configuration(s), 6 withheld-gold case(s).\n- [passed] synthetic-local-reviewer: 30/30 (100%), 6 passed, 0 failed.",
    );
  });

  it("highlights one concrete failure mode for a weak reviewer configuration", () => {
    const weakResults = createPassingResults();
    weakResults[2] = {
      caseId: "noisy-verification-log",
      result: createStructuredResult({
        caseId: "noisy-verification-log",
        summary: "The command transcript is long but probably fine.",
        verdict: "accept",
        overallSeverity: "low",
        findingKey: "long-transcript",
        findingSummary: "The packet includes a lengthy command transcript.",
        nextStepActions: ["track_follow_up"],
      }),
    };

    const report = evaluateReviewerCalibrationBenchmark({
      cases: REVIEWER_CALIBRATION_BENCHMARK_CASES,
      goldJudgments: REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
      observedRuns: [
        {
          configurationId: "under-sensitive-reviewer",
          results: weakResults,
        },
      ],
    });

    expect(report.status).toBe("failed");
    expect(report.runScores[0]?.highlightedFailureMode).toBe(
      "missed verification signal obscured by command noise",
    );
    expect(report.runScores[0]?.score).toBe(25);
    expect(report.runScores[0]?.caseScores[2]?.issues).toEqual([
      "expected verdict changes_requested, observed accept",
      "expected severity at least medium, observed low",
      "missing finding keys: verification-log-noise",
      "missing signal groups: command noise | repeated command; verification signal",
      "missing next-step actions: revise_artifact",
    ]);
  });
});
