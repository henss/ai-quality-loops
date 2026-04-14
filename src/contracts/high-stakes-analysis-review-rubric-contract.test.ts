import { describe, expect, it } from "vitest";
import {
  HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
  parseHighStakesAnalysisReviewRubricContract,
  validateHighStakesAnalysisReviewRubricContract,
  type HighStakesAnalysisReviewDimensionId,
} from "./high-stakes-analysis-review-rubric-contract.js";

const REQUIRED_DIMENSION_IDS: HighStakesAnalysisReviewDimensionId[] = [
  "authority-boundary",
  "evidence-chain",
  "uncertainty-handling",
  "scenario-coverage",
  "recommendation-traceability",
  "adversarial-review",
  "output-discipline",
];

describe("high-stakes analysis review rubric contract", () => {
  it("publishes the required generic high-stakes review dimensions", () => {
    const parsed = parseHighStakesAnalysisReviewRubricContract(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
    );

    expect(parsed.dimensions.map((dimension) => dimension.id)).toEqual(
      REQUIRED_DIMENSION_IDS,
    );
    expect(parsed.syntheticFixtures.length).toBeGreaterThan(0);
  });

  it("keeps private domain policy in the caller-owned boundary", () => {
    const serialized = JSON.stringify(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
    ).toLowerCase();

    for (const privatePolicyTerm of [
      "broker",
      "tax",
      "portfolio",
      "trading",
      "smartseer",
    ]) {
      expect(serialized).not.toContain(privatePolicyTerm);
    }

    expect(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT.boundary.callerOwnedInputs,
    ).toContain("domain facts");
    expect(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT.boundary.prohibitedSharedContent,
    ).toContain("money movement or execution instructions");
  });

  it("rejects contracts that omit a required review dimension", () => {
    const validation = validateHighStakesAnalysisReviewRubricContract({
      ...HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
      dimensions: HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT.dimensions.filter(
        (dimension) => dimension.id !== "adversarial-review",
      ),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.message).toContain("adversarial-review");
    }
  });

  it("rejects synthetic fixtures that reference an unknown dimension", () => {
    const validation = validateHighStakesAnalysisReviewRubricContract({
      ...HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
      syntheticFixtures: [
        {
          id: "synthetic-invalid-focus",
          promptSummary: "A sanitized fixture references an unknown focus.",
          expectedReviewFocus: ["unknown-dimension"],
        },
      ],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.message).toContain("known high-stakes");
    }
  });
});
