import { describe, expect, it } from "vitest";
import {
  CLAIM_EVIDENCE_SCORING_CONTRACT,
  parseClaimEvidenceScoringContract,
  validateClaimEvidenceScoringContract,
  type ClaimEvidenceScoringDimensionId,
} from "./claim-evidence-scoring-contract.js";

const REQUIRED_DIMENSION_IDS: ClaimEvidenceScoringDimensionId[] = [
  "claim-proportionality",
  "evidence-specificity",
  "caveat-preservation",
  "purchase-signal-discipline",
  "authority-boundary",
];

describe("claim-evidence scoring contract", () => {
  it("publishes the required buyer-claim scoring dimensions and score levels", () => {
    const parsed = parseClaimEvidenceScoringContract(
      CLAIM_EVIDENCE_SCORING_CONTRACT,
    );

    expect(parsed.dimensions.map((dimension) => dimension.id)).toEqual(
      REQUIRED_DIMENSION_IDS,
    );
    expect(parsed.scoreLevels.map((level) => level.score)).toEqual([0, 1, 2, 3]);
    expect(parsed.syntheticFixtures.length).toBe(3);
  });

  it("keeps private commercialization decisions in the caller-owned boundary", () => {
    const serialized = JSON.stringify(CLAIM_EVIDENCE_SCORING_CONTRACT).toLowerCase();

    for (const privateBoundaryTerm of [
      "stefan",
      "linear",
      "smartseer",
      "ops-",
      "d:\\",
      "/users/",
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }

    expect(CLAIM_EVIDENCE_SCORING_CONTRACT.boundary.callerOwnedInputs).toEqual(
      expect.arrayContaining([
        "account lists",
        "outreach plans",
        "pricing or spend policy",
      ]),
    );
    expect(
      CLAIM_EVIDENCE_SCORING_CONTRACT.boundary.prohibitedSharedContent,
    ).toContain("deal terms or budgets");
  });

  it("ships the expected rewrite-narrower fixture for wedge overreach", () => {
    const parsed = parseClaimEvidenceScoringContract(
      CLAIM_EVIDENCE_SCORING_CONTRACT,
    );
    const fixture = parsed.syntheticFixtures.find(
      (candidate) => candidate.id === "focused-wedge-overreach",
    );

    expect(fixture).toEqual({
      id: "focused-wedge-overreach",
      claim: "The category could support a focused wedge.",
      evidence: [
        {
          id: "evidence-c",
          kind: "repeated-job-note",
          summary:
            "Two synthetic notes describe a repeated narrow job-to-be-done with similar friction.",
          caveat:
            "No market sizing, procurement path, or competitive proof is included.",
        },
      ],
      evidenceRefs: ["evidence-c"],
      expectedScores: {
        "claim-proportionality": 1,
        "evidence-specificity": 2,
        "caveat-preservation": 2,
        "purchase-signal-discipline": 1,
        "authority-boundary": 3,
      },
      expectedDisposition: "rewrite-narrower",
      rationale:
        "The evidence supports a narrow repeated pain pattern, not a category-level wedge claim.",
    });
  });

  it("rejects fixtures that reference unknown evidence items", () => {
    const validation = validateClaimEvidenceScoringContract({
      ...CLAIM_EVIDENCE_SCORING_CONTRACT,
      syntheticFixtures: [
        {
          ...CLAIM_EVIDENCE_SCORING_CONTRACT.syntheticFixtures[0],
          evidenceRefs: ["missing-evidence"],
        },
      ],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.message).toContain("unknown evidence");
    }
  });

  it("rejects fixtures that omit a required dimension score", () => {
    const fixture = CLAIM_EVIDENCE_SCORING_CONTRACT.syntheticFixtures[0];
    const { ["authority-boundary"]: _unused, ...incompleteScores } =
      fixture.expectedScores;

    const validation = validateClaimEvidenceScoringContract({
      ...CLAIM_EVIDENCE_SCORING_CONTRACT,
      syntheticFixtures: [
        {
          ...fixture,
          expectedScores: incompleteScores,
        },
      ],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.message).toContain("authority-boundary");
    }
  });
});
