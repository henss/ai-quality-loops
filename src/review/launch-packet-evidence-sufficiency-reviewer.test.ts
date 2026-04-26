import { describe, expect, it } from "vitest";
import {
  reviewLaunchPacketEvidenceSufficiency,
  type LaunchPacketEvidenceSufficiencyInput,
} from "./launch-packet-evidence-sufficiency-reviewer.js";

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
    claimedCommand:
      "pnpm exec vitest run src/review/launch-packet-evidence-sufficiency-reviewer.test.ts",
    observedCommand:
      "pnpm exec vitest run src/review/launch-packet-evidence-sufficiency-reviewer.test.ts",
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
  boundary: {
    outputClassification: "review",
    privateDetailsIncluded: false,
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
