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
      "finance",
      "financial",
      "investment",
      "market",
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

  it("includes a synthetic caveat-preservation fixture without domain leakage", () => {
    const parsed = parseHighStakesAnalysisReviewRubricContract(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
    );
    const fixture = parsed.syntheticFixtures.find(
      (candidate) => candidate.id === "synthetic-caveat-preservation",
    );

    expect(fixture).toEqual({
      id: "synthetic-caveat-preservation",
      promptSummary:
        "A sanitized high-impact analysis includes explicit caveats about missing evidence and caller-owned approval, but a downstream summary risks flattening them into a confident action recommendation.",
      expectedReviewFocus: [
        "authority-boundary",
        "uncertainty-handling",
        "recommendation-traceability",
        "output-discipline",
      ],
    });
    expect(fixture?.promptSummary.toLowerCase()).not.toMatch(
      /broker|finance|financial|investment|market|tax|portfolio|trading|smartseer/,
    );
  });

  it("lets callers layer private domain injections without widening the shared contract", () => {
    const callerOwnedInjection = {
      policyLabel: "private-domain-high-stakes-review",
      injectedFocus: [
        "authority-boundary",
        "evidence-chain",
        "recommendation-traceability",
      ] satisfies HighStakesAnalysisReviewDimensionId[],
      callerOwnedRules: [
        "Require the caller's private approval policy before any irreversible action.",
        "Require supplied evidence labels for all material account-impacting claims.",
        "Keep execution thresholds and private source routing outside the reusable rubric.",
      ],
    };

    const parsed = parseHighStakesAnalysisReviewRubricContract(
      HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT,
    );
    const sharedDimensionIds = new Set(
      parsed.dimensions.map((dimension) => dimension.id),
    );

    expect(
      callerOwnedInjection.injectedFocus.every((dimensionId) =>
        sharedDimensionIds.has(dimensionId),
      ),
    ).toBe(true);
    expect(
      JSON.stringify(HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT),
    ).not.toContain(callerOwnedInjection.policyLabel);
    for (const callerOwnedRule of callerOwnedInjection.callerOwnedRules) {
      expect(
        JSON.stringify(HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT),
      ).not.toContain(callerOwnedRule);
    }
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
