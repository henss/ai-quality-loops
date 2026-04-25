import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateStructuredReviewResult } from "./json-contracts.js";
import { compareStructuredReviewResults } from "../review/review-result-comparison.js";
import { unwrapComparisonFixtureArtifact } from "../shared/comparison-fixture-artifact.js";

const PUBLIC_SAFE_COMPARISON_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "ops-",
  "customer",
  "tenant",
  "employee",
  "company",
  "https://",
  "d:\\",
  "/users/",
  ".png",
  ".jpg",
  ".jpeg",
];

async function loadExample(filename: string): Promise<unknown> {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "examples", filename), "utf-8"),
  ) as unknown;
}

describe("public comparison fixtures", () => {
  it("keeps the structured-result golden diff fixture provenance in sync", async () => {
    const [beforeFixture, afterFixture, expectedComparisonArtifact] =
      await Promise.all([
        loadExample("synthetic-structured-result-golden-diff-before.fixture.json"),
        loadExample("synthetic-structured-result-golden-diff-after.fixture.json"),
        loadExample("synthetic-structured-result-golden-diff.expected.json"),
      ]);
    const expectedComparison = unwrapComparisonFixtureArtifact<
      ReturnType<typeof compareStructuredReviewResults>
    >(expectedComparisonArtifact, {
      beforeFixture: "synthetic-structured-result-golden-diff-before.fixture.json",
      afterFixture: "synthetic-structured-result-golden-diff-after.fixture.json",
    });

    const beforeValidation = validateStructuredReviewResult(beforeFixture);
    const afterValidation = validateStructuredReviewResult(afterFixture);
    expect(beforeValidation.ok).toBe(true);
    expect(afterValidation.ok).toBe(true);
    if (!beforeValidation.ok || !afterValidation.ok) {
      throw new Error("Synthetic golden-diff fixtures must validate");
    }

    expect(
      compareStructuredReviewResults({
        before: beforeValidation.value,
        after: afterValidation.value,
      }),
    ).toEqual(expectedComparison);

    const serialized = JSON.stringify({
      beforeFixture,
      afterFixture,
      expectedComparisonArtifact,
    }).toLowerCase();
    for (const privateBoundaryTerm of PUBLIC_SAFE_COMPARISON_BLOCKLIST) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });

  it("keeps the evidence-only diff fixture provenance in sync", async () => {
    const [beforeFixture, afterFixture, expectedComparisonArtifact] =
      await Promise.all([
        loadExample("synthetic-review-output-evidence-diff-before.fixture.json"),
        loadExample("synthetic-review-output-evidence-diff-after.fixture.json"),
        loadExample("synthetic-review-output-evidence-diff.expected.json"),
      ]);
    const expectedComparison = unwrapComparisonFixtureArtifact<
      ReturnType<typeof compareStructuredReviewResults>
    >(expectedComparisonArtifact, {
      beforeFixture: "synthetic-review-output-evidence-diff-before.fixture.json",
      afterFixture: "synthetic-review-output-evidence-diff-after.fixture.json",
    });

    const beforeValidation = validateStructuredReviewResult(beforeFixture);
    const afterValidation = validateStructuredReviewResult(afterFixture);
    expect(beforeValidation.ok).toBe(true);
    expect(afterValidation.ok).toBe(true);
    if (!beforeValidation.ok || !afterValidation.ok) {
      throw new Error("Synthetic review-output evidence diff fixtures must validate");
    }

    expect(
      compareStructuredReviewResults({
        before: beforeValidation.value,
        after: afterValidation.value,
      }),
    ).toEqual(expectedComparison);

    const serialized = JSON.stringify({
      beforeFixture,
      afterFixture,
      expectedComparisonArtifact,
    }).toLowerCase();
    for (const privateBoundaryTerm of PUBLIC_SAFE_COMPARISON_BLOCKLIST) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });

  it("keeps the compact evidence-pack diff fixture provenance in sync", async () => {
    const [beforeFixture, afterFixture, expectedComparisonArtifact] =
      await Promise.all([
        loadExample("synthetic-compact-evidence-pack-diff-before.fixture.json"),
        loadExample("synthetic-compact-evidence-pack-diff-after.fixture.json"),
        loadExample("synthetic-compact-evidence-pack-diff.expected.json"),
      ]);
    const expectedComparison = unwrapComparisonFixtureArtifact<
      ReturnType<typeof compareStructuredReviewResults>
    >(expectedComparisonArtifact, {
      beforeFixture: "synthetic-compact-evidence-pack-diff-before.fixture.json",
      afterFixture: "synthetic-compact-evidence-pack-diff-after.fixture.json",
    });

    const beforeValidation = validateStructuredReviewResult(beforeFixture);
    const afterValidation = validateStructuredReviewResult(afterFixture);
    expect(beforeValidation.ok).toBe(true);
    expect(afterValidation.ok).toBe(true);
    if (!beforeValidation.ok || !afterValidation.ok) {
      throw new Error(
        "Synthetic compact evidence-pack diff fixtures must validate",
      );
    }

    expect(
      compareStructuredReviewResults({
        before: beforeValidation.value,
        after: afterValidation.value,
      }),
    ).toEqual(expectedComparison);

    const serialized = JSON.stringify({
      beforeFixture,
      afterFixture,
      expectedComparisonArtifact,
    }).toLowerCase();
    for (const privateBoundaryTerm of PUBLIC_SAFE_COMPARISON_BLOCKLIST) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });
});
