import type { JsonContractValidationResult } from "./json-contracts.js";
import {
  REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS,
  REQUIRED_CLAIM_EVIDENCE_SCORE_VALUES,
  type ClaimEvidenceFixtureEvidenceItem,
  type ClaimEvidenceFixtureEvidenceKind,
  type ClaimEvidenceScoreLevel,
  type ClaimEvidenceScoreValue,
  type ClaimEvidenceScoringBoundary,
  type ClaimEvidenceScoringContract,
  type ClaimEvidenceScoringDimension,
  type ClaimEvidenceScoringDimensionId,
  type ClaimEvidenceScoringDisposition,
  type ClaimEvidenceScoringSyntheticFixture,
} from "./claim-evidence-scoring-surface.js";

export {
  CLAIM_EVIDENCE_SCORING_CONTRACT,
  type ClaimEvidenceFixtureEvidenceItem,
  type ClaimEvidenceFixtureEvidenceKind,
  type ClaimEvidenceScoreLevel,
  type ClaimEvidenceScoreValue,
  type ClaimEvidenceScoringBoundary,
  type ClaimEvidenceScoringContract,
  type ClaimEvidenceScoringDimension,
  type ClaimEvidenceScoringDimensionId,
  type ClaimEvidenceScoringDisposition,
  type ClaimEvidenceScoringSyntheticFixture,
} from "./claim-evidence-scoring-surface.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Claim-evidence field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readRequiredStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(
      `Claim-evidence field "${fieldName}" must be an array of strings.`,
    );
  }

  return value;
}

function readDimensionId(
  value: unknown,
  fieldName: string,
): ClaimEvidenceScoringDimensionId {
  if (
    typeof value === "string" &&
    (REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS as string[]).includes(value)
  ) {
    return value as ClaimEvidenceScoringDimensionId;
  }

  throw new Error(
    `Claim-evidence field "${fieldName}" must be a known scoring dimension id.`,
  );
}

function readScoreValue(
  value: unknown,
  fieldName: string,
): ClaimEvidenceScoreValue {
  if (
    typeof value === "number" &&
    REQUIRED_CLAIM_EVIDENCE_SCORE_VALUES.includes(value as ClaimEvidenceScoreValue)
  ) {
    return value as ClaimEvidenceScoreValue;
  }

  throw new Error(
    `Claim-evidence field "${fieldName}" must be one of 0, 1, 2, or 3.`,
  );
}

function readEvidenceKind(
  value: unknown,
  fieldName: string,
): ClaimEvidenceFixtureEvidenceKind {
  switch (value) {
    case "directional-interview":
    case "conditional-scenario":
    case "repeated-job-note":
      return value;
    default:
      throw new Error(
        `Claim-evidence field "${fieldName}" must be a known evidence kind.`,
      );
  }
}

function readDisposition(
  value: unknown,
  fieldName: string,
): ClaimEvidenceScoringDisposition {
  switch (value) {
    case "keep-caveated":
    case "rewrite-narrower":
      return value;
    default:
      throw new Error(
        `Claim-evidence field "${fieldName}" must be a known disposition.`,
      );
  }
}

function parseBoundary(value: unknown): ClaimEvidenceScoringBoundary {
  if (!isRecord(value)) {
    throw new Error('Claim-evidence scoring contract requires "boundary".');
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

function parseScoreLevel(value: unknown, index: number): ClaimEvidenceScoreLevel {
  const fieldPath = `scoreLevels[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Claim-evidence field "${fieldPath}" must be an object.`);
  }

  return {
    score: readScoreValue(value.score, `${fieldPath}.score`),
    label: readRequiredString(value.label, `${fieldPath}.label`),
    interpretation: readRequiredString(
      value.interpretation,
      `${fieldPath}.interpretation`,
    ),
  };
}

function parseDimension(
  value: unknown,
  index: number,
): ClaimEvidenceScoringDimension {
  const fieldPath = `dimensions[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Claim-evidence field "${fieldPath}" must be an object.`);
  }

  return {
    id: readDimensionId(value.id, `${fieldPath}.id`),
    label: readRequiredString(value.label, `${fieldPath}.label`),
    reviewQuestion: readRequiredString(
      value.reviewQuestion,
      `${fieldPath}.reviewQuestion`,
    ),
    highScoreSignals: readRequiredStringArray(
      value.highScoreSignals,
      `${fieldPath}.highScoreSignals`,
    ),
    lowScoreSignals: readRequiredStringArray(
      value.lowScoreSignals,
      `${fieldPath}.lowScoreSignals`,
    ),
  };
}

function parseEvidenceItem(
  value: unknown,
  fieldPath: string,
): ClaimEvidenceFixtureEvidenceItem {
  if (!isRecord(value)) {
    throw new Error(`Claim-evidence field "${fieldPath}" must be an object.`);
  }

  return {
    id: readRequiredString(value.id, `${fieldPath}.id`),
    kind: readEvidenceKind(value.kind, `${fieldPath}.kind`),
    summary: readRequiredString(value.summary, `${fieldPath}.summary`),
    caveat: readRequiredString(value.caveat, `${fieldPath}.caveat`),
  };
}

function parseExpectedScores(
  value: unknown,
  fieldPath: string,
): Record<ClaimEvidenceScoringDimensionId, ClaimEvidenceScoreValue> {
  if (!isRecord(value)) {
    throw new Error(`Claim-evidence field "${fieldPath}" must be an object.`);
  }

  const actualIds = new Set(Object.keys(value));
  for (const dimensionId of REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS) {
    if (!actualIds.has(dimensionId)) {
      throw new Error(
        `Claim-evidence fixture scores must include dimension "${dimensionId}".`,
      );
    }
  }

  if (actualIds.size !== REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS.length) {
    throw new Error(
      "Claim-evidence fixture scores must not include unknown dimensions.",
    );
  }

  return REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS.reduce(
    (accumulator, dimensionId) => ({
      ...accumulator,
      [dimensionId]: readScoreValue(value[dimensionId], `${fieldPath}.${dimensionId}`),
    }),
    {} as Record<ClaimEvidenceScoringDimensionId, ClaimEvidenceScoreValue>,
  );
}

function parseSyntheticFixture(
  value: unknown,
  index: number,
): ClaimEvidenceScoringSyntheticFixture {
  const fieldPath = `syntheticFixtures[${index}]`;
  if (!isRecord(value)) {
    throw new Error(`Claim-evidence field "${fieldPath}" must be an object.`);
  }

  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    throw new Error(
      `Claim-evidence field "${fieldPath}.evidence" must be a non-empty array.`,
    );
  }

  const evidence = value.evidence.map((item, evidenceIndex) =>
    parseEvidenceItem(item, `${fieldPath}.evidence[${evidenceIndex}]`),
  );
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const evidenceRefs = readRequiredStringArray(
    value.evidenceRefs,
    `${fieldPath}.evidenceRefs`,
  );

  for (const evidenceRef of evidenceRefs) {
    if (!evidenceIds.has(evidenceRef)) {
      throw new Error(
        `Claim-evidence fixture "${fieldPath}" references unknown evidence "${evidenceRef}".`,
      );
    }
  }

  return {
    id: readRequiredString(value.id, `${fieldPath}.id`),
    claim: readRequiredString(value.claim, `${fieldPath}.claim`),
    evidence,
    evidenceRefs,
    expectedScores: parseExpectedScores(
      value.expectedScores,
      `${fieldPath}.expectedScores`,
    ),
    expectedDisposition: readDisposition(
      value.expectedDisposition,
      `${fieldPath}.expectedDisposition`,
    ),
    rationale: readRequiredString(value.rationale, `${fieldPath}.rationale`),
  };
}

function assertCompleteDimensionCoverage(
  dimensions: ClaimEvidenceScoringDimension[],
): void {
  const actualIds = new Set(dimensions.map((dimension) => dimension.id));
  for (const dimensionId of REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS) {
    if (!actualIds.has(dimensionId)) {
      throw new Error(
        `Claim-evidence scoring contract is missing dimension "${dimensionId}".`,
      );
    }
  }

  if (actualIds.size !== dimensions.length) {
    throw new Error(
      "Claim-evidence scoring contract dimension ids must be unique.",
    );
  }
}

function assertCompleteScoreScale(scoreLevels: ClaimEvidenceScoreLevel[]): void {
  const actualScores = new Set(scoreLevels.map((level) => level.score));
  for (const score of REQUIRED_CLAIM_EVIDENCE_SCORE_VALUES) {
    if (!actualScores.has(score)) {
      throw new Error(
        `Claim-evidence scoring contract is missing score level "${score}".`,
      );
    }
  }

  if (actualScores.size !== scoreLevels.length) {
    throw new Error("Claim-evidence score levels must be unique.");
  }
}

export function parseClaimEvidenceScoringContract(
  value: unknown,
): ClaimEvidenceScoringContract {
  if (!isRecord(value)) {
    throw new Error("Claim-evidence scoring contract must be a JSON object.");
  }

  if (value.schemaVersion !== "1") {
    throw new Error('Claim-evidence field "schemaVersion" must equal "1".');
  }

  if (value.contract !== "claim-evidence-scoring") {
    throw new Error(
      'Claim-evidence field "contract" must equal "claim-evidence-scoring".',
    );
  }

  if (!Array.isArray(value.scoreLevels)) {
    throw new Error('Claim-evidence scoring contract requires "scoreLevels".');
  }

  if (!Array.isArray(value.dimensions)) {
    throw new Error('Claim-evidence scoring contract requires "dimensions".');
  }

  if (!Array.isArray(value.syntheticFixtures)) {
    throw new Error(
      'Claim-evidence scoring contract requires "syntheticFixtures".',
    );
  }

  const scoreLevels = value.scoreLevels.map((level, index) =>
    parseScoreLevel(level, index),
  );
  assertCompleteScoreScale(scoreLevels);

  const dimensions = value.dimensions.map((dimension, index) =>
    parseDimension(dimension, index),
  );
  assertCompleteDimensionCoverage(dimensions);

  return {
    schemaVersion: "1",
    contract: "claim-evidence-scoring",
    boundary: parseBoundary(value.boundary),
    scoreLevels,
    dimensions,
    syntheticFixtures: value.syntheticFixtures.map((fixture, index) =>
      parseSyntheticFixture(fixture, index),
    ),
  };
}

export function validateClaimEvidenceScoringContract(
  value: unknown,
): JsonContractValidationResult<ClaimEvidenceScoringContract> {
  try {
    return {
      ok: true,
      value: parseClaimEvidenceScoringContract(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
