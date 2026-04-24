import path from "node:path";

export interface ComparisonFixtureProvenance {
  beforeFixture: string;
  afterFixture: string;
}

export interface ComparisonFixtureArtifact<TComparison> {
  fixtureProvenance: ComparisonFixtureProvenance;
  comparison: TComparison;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredFixtureLabel(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Fixture artifact field "${fieldName}" must be a non-empty string.`);
  }

  return path.basename(value.trim().replaceAll("\\", "/"));
}

export function parseComparisonFixtureArtifact<TComparison>(
  value: unknown,
): ComparisonFixtureArtifact<TComparison> {
  if (!isRecord(value)) {
    throw new Error("Comparison fixture artifact must be a JSON object.");
  }

  if (!isRecord(value.fixtureProvenance)) {
    throw new Error(
      'Comparison fixture artifact requires a "fixtureProvenance" object.',
    );
  }

  if (!("comparison" in value)) {
    throw new Error('Comparison fixture artifact requires a "comparison" field.');
  }

  return {
    fixtureProvenance: {
      beforeFixture: readRequiredFixtureLabel(
        value.fixtureProvenance.beforeFixture,
        "fixtureProvenance.beforeFixture",
      ),
      afterFixture: readRequiredFixtureLabel(
        value.fixtureProvenance.afterFixture,
        "fixtureProvenance.afterFixture",
      ),
    },
    comparison: value.comparison as TComparison,
  };
}

export function unwrapComparisonFixtureArtifact<TComparison>(
  value: unknown,
  expectedFixtures: ComparisonFixtureProvenance,
): TComparison {
  const artifact = parseComparisonFixtureArtifact<TComparison>(value);
  const expectedBefore = readRequiredFixtureLabel(
    expectedFixtures.beforeFixture,
    "expectedFixtures.beforeFixture",
  );
  const expectedAfter = readRequiredFixtureLabel(
    expectedFixtures.afterFixture,
    "expectedFixtures.afterFixture",
  );

  if (artifact.fixtureProvenance.beforeFixture !== expectedBefore) {
    throw new Error(
      `Comparison fixture provenance mismatch for before fixture: expected "${expectedBefore}" but found "${artifact.fixtureProvenance.beforeFixture}".`,
    );
  }

  if (artifact.fixtureProvenance.afterFixture !== expectedAfter) {
    throw new Error(
      `Comparison fixture provenance mismatch for after fixture: expected "${expectedAfter}" but found "${artifact.fixtureProvenance.afterFixture}".`,
    );
  }

  return artifact.comparison;
}
