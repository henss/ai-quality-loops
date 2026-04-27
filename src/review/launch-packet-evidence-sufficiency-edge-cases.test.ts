import { describe, expect, it } from "vitest";
import {
  reviewLaunchPacketEvidenceSufficiency,
  type LaunchPacketEvidenceSufficiencyInput,
} from "./launch-packet-evidence-sufficiency-reviewer.js";

const targetedReviewCommand =
  "pnpm exec vitest run src/review/launch-packet-evidence-sufficiency-edge-cases.test.ts";

const cleanPacket = {
  packetId: "synthetic-edge-clean-launch-packet",
  title: "Clean synthetic launch packet",
  evidence: [
    {
      label: "Task packet",
      status: "confirmed",
      handle: "packet.md",
    },
  ],
  verification: {
    claimedCommand: targetedReviewCommand,
    observedCommand: targetedReviewCommand,
    result: "passed",
    targetedRun: true,
    fixturePassFailLog: "complete",
    surfaceBudgetChecked: true,
  },
  adoption: {
    status: "not_applicable",
    rationale: "Edge-case fixture extends an existing local reviewer.",
  },
  outcome: {
    expectedPath: ".runtime/orchestrator-outcomes/synthetic.md",
    generatedPath: true,
    statusChecked: true,
  },
  sourceAudit: {
    status: "complete",
    inspectedSourceHandles: [
      "src/review/launch-packet-evidence-sufficiency-reviewer.ts",
    ],
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

function reviewPacket(overrides: Partial<LaunchPacketEvidenceSufficiencyInput>) {
  return reviewLaunchPacketEvidenceSufficiency({
    ...cleanPacket,
    ...overrides,
  });
}

describe("reviewLaunchPacketEvidenceSufficiency edge cases", () => {
  it("flags missing source-audit disposition", () => {
    const review = reviewPacket({
      packetId: "synthetic-missing-source-audit-disposition",
      sourceAudit: undefined,
    });

    expect(review.verdict).toBe("needs_caller_review");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-source-audit-disposition",
    ]);
    expect(review.nextStepActions).toEqual(["collect_more_evidence"]);
  });

  it("flags truncated decisive source evidence and absent fixture logs", () => {
    const review = reviewPacket({
      packetId: "synthetic-truncated-source-evidence",
      sourceAudit: {
        status: "complete",
        inspectedSourceHandles: [
          "src/review/launch-packet-evidence-sufficiency-reviewer.ts",
        ],
        decisiveEvidenceTruncated: true,
      },
      verification: {
        claimedCommand: targetedReviewCommand,
        observedCommand: targetedReviewCommand,
        result: "passed",
        targetedRun: true,
        fixturePassFailLog: "partial",
        surfaceBudgetChecked: true,
      },
    });

    expect(review.verdict).toBe("insufficient");
    expect(review.findings.map((finding) => finding.key)).toEqual([
      "missing-fixture-pass-fail-log",
      "truncated-decisive-source-evidence",
    ]);
    expect(review.nextStepActions).toEqual([
      "collect_more_evidence",
      "rerun_review",
      "request_caller_review",
    ]);
  });
});
