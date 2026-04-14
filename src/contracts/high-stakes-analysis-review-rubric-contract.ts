import type { JsonContractValidationResult } from "./json-contracts.js";

export type HighStakesAnalysisReviewDimensionId =
  | "authority-boundary"
  | "evidence-chain"
  | "uncertainty-handling"
  | "scenario-coverage"
  | "recommendation-traceability"
  | "adversarial-review"
  | "output-discipline";

export interface HighStakesAnalysisReviewDimension {
  id: HighStakesAnalysisReviewDimensionId;
  label: string;
  reviewQuestion: string;
  passSignals: string[];
  failSignals: string[];
}

export interface HighStakesAnalysisReviewBoundary {
  genericPurpose: string;
  allowedGenericInputs: string[];
  callerOwnedInputs: string[];
  prohibitedSharedContent: string[];
}

export interface HighStakesAnalysisReviewSyntheticFixture {
  id: string;
  promptSummary: string;
  expectedReviewFocus: HighStakesAnalysisReviewDimensionId[];
}

export interface HighStakesAnalysisReviewRubricContract {
  schemaVersion: "1";
  contract: "high-stakes-analysis-review-rubric";
  boundary: HighStakesAnalysisReviewBoundary;
  dimensions: HighStakesAnalysisReviewDimension[];
  syntheticFixtures: HighStakesAnalysisReviewSyntheticFixture[];
}

const REQUIRED_DIMENSION_IDS: HighStakesAnalysisReviewDimensionId[] = [
  "authority-boundary",
  "evidence-chain",
  "uncertainty-handling",
  "scenario-coverage",
  "recommendation-traceability",
  "adversarial-review",
  "output-discipline",
];

export const HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT: HighStakesAnalysisReviewRubricContract =
  {
    schemaVersion: "1",
    contract: "high-stakes-analysis-review-rubric",
    boundary: {
      genericPurpose:
        "Review high-impact analysis for reasoning quality, evidence hygiene, and bounded recommendations without carrying caller-specific policy.",
      allowedGenericInputs: [
        "synthetic scenario summaries",
        "sanitized evidence excerpts",
        "caller-owned policy labels",
        "generic review budgets",
      ],
      callerOwnedInputs: [
        "domain facts",
        "private source paths",
        "real entity identifiers",
        "action thresholds",
        "deployment, alerting, or execution policy",
      ],
      prohibitedSharedContent: [
        "private domain facts",
        "real customer or account data",
        "money movement or execution instructions",
        "caller-specific source locations",
        "production alert routing",
      ],
    },
    dimensions: [
      {
        id: "authority-boundary",
        label: "Authority Boundary",
        reviewQuestion:
          "Does the analysis stay within an analysis-only role and avoid implying that the reviewer can approve, execute, or route real-world action?",
        passSignals: [
          "Separates observations from decisions",
          "Names caller-owned approval gates when action would be needed",
        ],
        failSignals: [
          "Uses imperative execution language",
          "Treats a recommendation as already approved",
        ],
      },
      {
        id: "evidence-chain",
        label: "Evidence Chain",
        reviewQuestion:
          "Can each material claim be traced to supplied evidence, and are missing or stale inputs called out instead of filled in?",
        passSignals: [
          "Links claims to evidence labels",
          "Flags unsupported assumptions",
        ],
        failSignals: [
          "Introduces unsourced facts",
          "Blurs observed evidence with inferred context",
        ],
      },
      {
        id: "uncertainty-handling",
        label: "Uncertainty Handling",
        reviewQuestion:
          "Does the analysis state uncertainty, confidence, and conditions that would change the conclusion?",
        passSignals: [
          "States confidence in bounded terms",
          "Lists missing facts that would materially affect the result",
        ],
        failSignals: [
          "Presents guesses as facts",
          "Hides unresolved ambiguity behind generic caveats",
        ],
      },
      {
        id: "scenario-coverage",
        label: "Scenario Coverage",
        reviewQuestion:
          "Does the analysis cover plausible adverse, neutral, and favorable scenarios relevant to the generic decision surface?",
        passSignals: [
          "Compares more than one plausible outcome",
          "Calls out scenario-specific assumptions",
        ],
        failSignals: [
          "Optimizes around a single favored path",
          "Omits obvious downside or failure modes",
        ],
      },
      {
        id: "recommendation-traceability",
        label: "Recommendation Traceability",
        reviewQuestion:
          "Can each recommendation be traced back to evidence, assumptions, and the stated authority boundary?",
        passSignals: [
          "Maps recommendations to supporting evidence",
          "Keeps next steps reversible or caller-approved",
        ],
        failSignals: [
          "Recommends action without showing why",
          "Collapses multiple conditions into one unqualified instruction",
        ],
      },
      {
        id: "adversarial-review",
        label: "Adversarial Review",
        reviewQuestion:
          "Does the review actively search for contradictions, hidden coupling, and ways the analysis could be wrong?",
        passSignals: [
          "Tests the conclusion against disconfirming evidence",
          "Identifies the strongest counterargument",
        ],
        failSignals: [
          "Only restates the original rationale",
          "Ignores conflicting evidence or incentives",
        ],
      },
      {
        id: "output-discipline",
        label: "Output Discipline",
        reviewQuestion:
          "Is the output concise, scoped to supplied evidence, and explicit about what remains caller-owned?",
        passSignals: [
          "Uses compact findings with clear severity or priority",
          "Avoids private labels and domain-specific leakage",
        ],
        failSignals: [
          "Overproduces generic advice",
          "Copies private or caller-specific details into the shared layer",
        ],
      },
    ],
    syntheticFixtures: [
      {
        id: "synthetic-missing-evidence",
        promptSummary:
          "A sanitized analysis makes a high-impact recommendation while one key evidence source is absent.",
        expectedReviewFocus: ["evidence-chain", "uncertainty-handling"],
      },
      {
        id: "synthetic-authority-overreach",
        promptSummary:
          "A sanitized analysis moves from review findings directly into execution-style next steps.",
        expectedReviewFocus: ["authority-boundary", "recommendation-traceability"],
      },
      {
        id: "synthetic-single-scenario",
        promptSummary:
          "A sanitized analysis considers only the favorable case and omits adverse or neutral outcomes.",
        expectedReviewFocus: ["scenario-coverage", "adversarial-review"],
      },
    ],
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Rubric field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readRequiredStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Rubric field "${fieldName}" must be an array of strings.`);
  }

  return value;
}

function readDimensionId(
  value: unknown,
  fieldName: string,
): HighStakesAnalysisReviewDimensionId {
  if (
    typeof value === "string" &&
    (REQUIRED_DIMENSION_IDS as string[]).includes(value)
  ) {
    return value as HighStakesAnalysisReviewDimensionId;
  }

  throw new Error(
    `Rubric field "${fieldName}" must be a known high-stakes review dimension id.`,
  );
}

function parseBoundary(value: unknown): HighStakesAnalysisReviewBoundary {
  if (!isRecord(value)) {
    throw new Error('High-stakes analysis rubric requires "boundary".');
  }

  return {
    genericPurpose: readRequiredString(
      value.genericPurpose,
      "boundary.genericPurpose",
    ),
    allowedGenericInputs: readRequiredStringArray(
      value.allowedGenericInputs,
      "boundary.allowedGenericInputs",
    ),
    callerOwnedInputs: readRequiredStringArray(
      value.callerOwnedInputs,
      "boundary.callerOwnedInputs",
    ),
    prohibitedSharedContent: readRequiredStringArray(
      value.prohibitedSharedContent,
      "boundary.prohibitedSharedContent",
    ),
  };
}

function parseDimension(
  value: unknown,
  index: number,
): HighStakesAnalysisReviewDimension {
  const fieldPath = `dimensions[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Rubric field "${fieldPath}" must be an object.`);
  }

  return {
    id: readDimensionId(value.id, `${fieldPath}.id`),
    label: readRequiredString(value.label, `${fieldPath}.label`),
    reviewQuestion: readRequiredString(
      value.reviewQuestion,
      `${fieldPath}.reviewQuestion`,
    ),
    passSignals: readRequiredStringArray(
      value.passSignals,
      `${fieldPath}.passSignals`,
    ),
    failSignals: readRequiredStringArray(
      value.failSignals,
      `${fieldPath}.failSignals`,
    ),
  };
}

function parseSyntheticFixture(
  value: unknown,
  index: number,
): HighStakesAnalysisReviewSyntheticFixture {
  const fieldPath = `syntheticFixtures[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Rubric field "${fieldPath}" must be an object.`);
  }

  if (!Array.isArray(value.expectedReviewFocus)) {
    throw new Error(
      `Rubric field "${fieldPath}.expectedReviewFocus" must be an array.`,
    );
  }

  return {
    id: readRequiredString(value.id, `${fieldPath}.id`),
    promptSummary: readRequiredString(
      value.promptSummary,
      `${fieldPath}.promptSummary`,
    ),
    expectedReviewFocus: value.expectedReviewFocus.map((item, focusIndex) =>
      readDimensionId(item, `${fieldPath}.expectedReviewFocus[${focusIndex}]`),
    ),
  };
}

function assertCompleteDimensionCoverage(
  dimensions: HighStakesAnalysisReviewDimension[],
): void {
  const actualIds = new Set(dimensions.map((dimension) => dimension.id));
  for (const dimensionId of REQUIRED_DIMENSION_IDS) {
    if (!actualIds.has(dimensionId)) {
      throw new Error(
        `High-stakes analysis rubric is missing dimension "${dimensionId}".`,
      );
    }
  }

  if (actualIds.size !== dimensions.length) {
    throw new Error("High-stakes analysis rubric dimension ids must be unique.");
  }
}

export function parseHighStakesAnalysisReviewRubricContract(
  value: unknown,
): HighStakesAnalysisReviewRubricContract {
  if (!isRecord(value)) {
    throw new Error("High-stakes analysis rubric must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Rubric field "schemaVersion" must equal "1".');
  }

  if (value.contract !== "high-stakes-analysis-review-rubric") {
    throw new Error(
      'Rubric field "contract" must equal "high-stakes-analysis-review-rubric".',
    );
  }

  if (!Array.isArray(value.dimensions)) {
    throw new Error('High-stakes analysis rubric requires "dimensions".');
  }

  if (!Array.isArray(value.syntheticFixtures)) {
    throw new Error('High-stakes analysis rubric requires "syntheticFixtures".');
  }

  const dimensions = value.dimensions.map((dimension, index) =>
    parseDimension(dimension, index),
  );
  assertCompleteDimensionCoverage(dimensions);

  return {
    schemaVersion: "1",
    contract: "high-stakes-analysis-review-rubric",
    boundary: parseBoundary(value.boundary),
    dimensions,
    syntheticFixtures: value.syntheticFixtures.map((fixture, index) =>
      parseSyntheticFixture(fixture, index),
    ),
  };
}

export function validateHighStakesAnalysisReviewRubricContract(
  value: unknown,
): JsonContractValidationResult<HighStakesAnalysisReviewRubricContract> {
  try {
    return {
      ok: true,
      value: parseHighStakesAnalysisReviewRubricContract(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
