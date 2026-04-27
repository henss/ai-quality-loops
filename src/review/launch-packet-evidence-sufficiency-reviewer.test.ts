import { describe, expect, it } from "vitest";
import {
  reviewLaunchPacketEvidenceSufficiency,
  type LaunchPacketEvidenceSufficiencyInput,
} from "./launch-packet-evidence-sufficiency-reviewer.js";

const targetedReviewCommand =
  "pnpm exec vitest run src/review/launch-packet-evidence-sufficiency-reviewer.test.ts";

const cleanPacket = {
  packetId: "synthetic-clean-launch-packet",
  title: "Clean synthetic launch packet",
  evidence: [
    {
      label: "Task packet",
      status: "confirmed",
      handle: "packet.md",
    },
    {
      label: "Repo guidance",
      status: "confirmed",
      handle: "AGENTS.md",
    },
  ],
  verification: {
    claimedCommand: targetedReviewCommand,
    observedCommand: targetedReviewCommand,
    result: "passed",
    targetedRun: true,
    repeatedFailedCommandCount: 0,
    surfaceBudgetChecked: true,
    surfaceBudgetCommand:
      "pnpm check:agent-surface:preedit -- src/review/launch-packet-evidence-sufficiency-reviewer.ts src/review/launch-packet-evidence-sufficiency-types.ts src/review/launch-packet-evidence-sufficiency-reviewer.test.ts src/index.ts",
  },
  adoption: {
    status: "rejected",
    scoutCommand:
      'pnpm solution:scout -- --category eval --capability "launch-packet evidence sufficiency reviewer fixtures and rubric" --boundary public --project ai-quality-loops',
    rationale:
      "Scout candidates were broad code-intelligence tools, not a narrow packet-rubric utility.",
  },
  outcome: {
    expectedPath: ".runtime/orchestrator-outcomes/synthetic.md",
    generatedPath: true,
    statusChecked: true,
  },
  sourceAudit: {
    status: "complete",
    inspectedSourceHandles: ["src/review/launch-packet-evidence-sufficiency-reviewer.ts"],
  },
  evidenceBudget: {
    status: "satisfied",
    budgetName: "synthetic packet evidence budget",
  },
  boundary: {
    outputClassification: "review",
    privateDetailsIncluded: false,
  },
} satisfies LaunchPacketEvidenceSufficiencyInput;

const runtimeStderrPacket = {
  ...cleanPacket,
  packetId: "synthetic-runtime-stderr",
  verification: {
    claimedCommand: targetedReviewCommand,
    observedCommand: targetedReviewCommand,
    result: "passed",
    targetedRun: true,
    runtimeStderr: "unresolved",
    surfaceBudgetChecked: true,
  },
} satisfies LaunchPacketEvidenceSufficiencyInput;

describe("reviewLaunchPacketEvidenceSufficiency", () => {
  it("accepts a clean pre-launch packet fixture", () => {
    const review = reviewLaunchPacketEvidenceSufficiency(cleanPacket);

    expect(review).toMatchObject({
      schema: "launch_packet_evidence_sufficiency_review_v1",
      packetId: "synthetic-clean-launch-packet",
      verdict: "sufficient",
      confidence: "high",
      maxSeverity: "unknown",
      findings: [],
      nextStepActions: [],
    });
  });

  it("flags missing handles and hint-only evidence before launch", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-missing-evidence",
      evidence: [
        {
          label: "Packet source path",
          status: "missing",
        },
        {
          label: "Path-like stderr string",
          status: "hint_only",
          handle: "stderr mentioned file.md",
        },
      ],
    });

    expect(review.verdict).toBe("insufficient");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-evidence-handle",
      "hint-treated-as-evidence",
    ]);
    expect(review.nextStepActions).toContain("collect_more_evidence");
  });

  it("flags verification mismatch and repeated command noise", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-verification-mismatch",
      verification: {
        claimedCommand: "pnpm verify:session",
        observedCommand: "pnpm test -- review-gate.test.ts",
        result: "passed",
        targetedRun: true,
        repeatedFailedCommandCount: 4,
        surfaceBudgetChecked: true,
      },
    });

    expect(review.verdict).toBe("insufficient");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "verification-wrapper-mismatch",
      "repeated-command-noise",
    ]);
    expect(review.nextStepActions).toEqual([
      "rerun_review",
      "request_caller_review",
      "revise_artifact",
    ]);
  });

  it("flags unresolved runtime stderr even when verification passed", () => {
    const review = reviewLaunchPacketEvidenceSufficiency(runtimeStderrPacket);

    expect(review.verdict).toBe("needs_caller_review");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "unclassified-runtime-stderr",
    ]);
    expect(review.nextStepActions).toEqual([
      "rerun_review",
      "request_caller_review",
    ]);
  });
});

describe("reviewLaunchPacketEvidenceSufficiency follow-up gates", () => {
  it("flags missing build-vs-buy evidence, targeted test run, and surface budget check", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-follow-up-evidence-gaps",
      adoption: {
        status: "missing",
      },
      verification: {
        claimedCommand: "pnpm verify:session",
        observedCommand: "pnpm verify:session",
        result: "passed",
        targetedRun: false,
        surfaceBudgetChecked: false,
      },
    });

    expect(review.verdict).toBe("needs_caller_review");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-build-vs-buy-evidence",
      "missing-targeted-test-run",
      "missing-surface-budget-check",
    ]);
    expect(review.nextStepActions).toEqual([
      "collect_more_evidence",
      "rerun_review",
    ]);
  });

  it("flags summarized build-vs-buy and source-inspection claims without raw evidence", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-summary-only-source-evidence",
      adoption: {
        status: "rejected",
        rationale:
          "Summary says no reusable dependency was adopted, but it does not name the raw scout evidence.",
      },
      sourceAudit: {
        status: "complete",
        inspectedSourceHandles: [],
      },
    });

    expect(review.verdict).toBe("needs_caller_review");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-build-vs-buy-source-evidence",
      "missing-source-inspection-evidence",
    ]);
    expect(review.nextStepActions).toEqual([
      "collect_more_evidence",
      "request_caller_review",
    ]);
  });

  it("flags source-audit path gaps and evidence-budget gaps", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-source-audit-budget-gaps",
      sourceAudit: {
        status: "unresolved_paths",
        missingPathCount: 1,
        unresolvedPathCount: 1,
        retrievalNoteProvided: false,
      },
      evidenceBudget: {
        status: "missing",
        budgetName: "launch packet evidence budget",
      },
    });

    expect(review.verdict).toBe("needs_caller_review");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "source-audit-evidence-path-gap",
      "evidence-budget-gap",
    ]);
    expect(review.nextStepActions).toEqual([
      "collect_more_evidence",
      "request_caller_review",
    ]);
  });

  it("flags outcome and shared-boundary gaps without taking launch authority", () => {
    const review = reviewLaunchPacketEvidenceSufficiency({
      ...cleanPacket,
      packetId: "synthetic-boundary-gap",
      outcome: {
        expectedPath: ".runtime/orchestrator-outcomes/synthetic.md",
        generatedPath: true,
        statusChecked: false,
      },
      boundary: {
        privateDetailsIncluded: true,
        trackerFreshnessRequired: true,
        trackerFreshnessConfirmed: false,
      },
    });

    expect(review.verdict).toBe("insufficient");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-outcome-status-check",
      "missing-output-classification",
      "private-detail-boundary-leak",
      "unconfirmed-tracker-freshness",
    ]);
    expect(review.nextStepActions).toEqual([
      "track_follow_up",
      "revise_artifact",
      "request_caller_review",
    ]);
  });
});
