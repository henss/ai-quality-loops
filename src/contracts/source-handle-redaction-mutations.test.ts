import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  defineReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
} from "../shared/review-surface.js";

type SourceHandleRedactionMutationFixture = {
  redactionRule?: {
    pattern?: string;
    replacement?: string;
  };
  domains?: Array<{
    domain?: string;
    cases?: Array<{
      mutation?: string;
      input?: string;
      expected?: string;
      mustNotContain?: string[];
    }>;
  }>;
};

describe("synthetic source-handle redaction mutation fixture", () => {
  it("ships public-safe mutation coverage across synthetic domains", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-source-handle-redaction-mutations.fixture.json",
        ),
        "utf-8",
      ),
    ) as SourceHandleRedactionMutationFixture;

    expect(fixture.redactionRule).toEqual(
      expect.objectContaining({
        pattern: expect.any(String),
        replacement: "[Source handle redacted]",
      }),
    );
    expect(fixture.domains?.map((domain) => domain.domain)).toEqual([
      "finance-like",
      "household-like",
      "organization-like",
      "creative-like",
    ]);

    const redactions = defineReviewSurfaceRedactions([
      {
        pattern: new RegExp(fixture.redactionRule!.pattern!, "g"),
        replacement: fixture.redactionRule!.replacement!,
      },
    ]);

    for (const domain of fixture.domains || []) {
      expect(domain.cases?.length).toBeGreaterThanOrEqual(3);

      for (const corpusCase of domain.cases || []) {
        expect(typeof corpusCase.mutation).toBe("string");
        expect(
          sanitizeReviewSurfaceValue(corpusCase.input!, {
            extraRedactions: redactions,
            maxLength: 1000,
          }),
        ).toBe(corpusCase.expected);

        for (const forbidden of corpusCase.mustNotContain || []) {
          expect(corpusCase.expected).not.toContain(forbidden);
        }
      }
    }

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const privateBoundaryTerm of [
      "stefan",
      "linear",
      "smartseer",
      "ops-",
      "customer",
      "tenant",
      "employee",
      "https://",
      "d:\\",
      "/users/",
      ".png",
      ".jpg",
      ".jpeg",
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });
});
