import { describe, expect, it } from "vitest";
import {
  parseComparisonFixtureArtifact,
  unwrapComparisonFixtureArtifact,
} from "./comparison-fixture-artifact.js";

describe("comparison fixture artifact", () => {
  it("normalizes fixture labels to stable basenames", () => {
    const artifact = parseComparisonFixtureArtifact<{ changed: number }>({
      fixtureProvenance: {
        beforeFixture: ".\\examples\\before.fixture.json",
        afterFixture: "./examples/after.fixture.json",
      },
      comparison: {
        changed: 1,
      },
    });

    expect(artifact).toEqual({
      fixtureProvenance: {
        beforeFixture: "before.fixture.json",
        afterFixture: "after.fixture.json",
      },
      comparison: {
        changed: 1,
      },
    });
  });

  it("throws when the expected fixture pair drifts from the stored provenance", () => {
    expect(() =>
      unwrapComparisonFixtureArtifact(
        {
          fixtureProvenance: {
            beforeFixture: "before.fixture.json",
            afterFixture: "after.fixture.json",
          },
          comparison: {
            changed: 1,
          },
        },
        {
          beforeFixture: "other-before.fixture.json",
          afterFixture: "after.fixture.json",
        },
      ),
    ).toThrow('expected "other-before.fixture.json"');
  });
});
