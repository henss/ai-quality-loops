import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseBatchReviewManifest,
  validateStructuredReviewResult,
} from "./json-contracts.js";

const PRIVATE_BOUNDARY_TERMS = [
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
] as const;

async function readExampleFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf-8");
}

function expectPublicSafeSerializedContent(serialized: string): void {
  const normalized = serialized.toLowerCase();

  for (const privateBoundaryTerm of PRIVATE_BOUNDARY_TERMS) {
    expect(normalized).not.toContain(privateBoundaryTerm);
  }
}

describe("synthetic reviewer-contract public fixtures", () => {
  it("ships a structured-result fixture with stable generic keys and caller-owned boundaries", async () => {
    const fixtureText = await readExampleFile(
      "examples/synthetic-reviewer-contract-result.fixture.json",
    );
    const fixture = JSON.parse(fixtureText) as unknown;

    const validation = validateStructuredReviewResult(fixture);
    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "expert",
        summary: expect.stringContaining("stable finding keys"),
        findings: [
          expect.objectContaining({
            key: "evidence-support-gap",
            evidence: ["Evidence label A", "Synthetic claim note"],
          }),
          expect.objectContaining({
            key: "external-action-readiness-unsupported",
            evidence: ["Evidence label C", "Boundary note: caller-owned action gate"],
          }),
        ],
        provenance: expect.arrayContaining([
          expect.objectContaining({
            label: "Evidence basis",
            value: "Generic evidence labels only",
          }),
          expect.objectContaining({
            label: "Privacy boundary",
          }),
        ]),
      }),
    });

    expectPublicSafeSerializedContent(fixtureText);
  });

  it("ships a runnable manifest and context pair that keeps external action caller-gated", async () => {
    const manifestText = await readExampleFile(
      "examples/synthetic-reviewer-contract-review.manifest.json",
    );
    const manifest = JSON.parse(manifestText) as unknown;
    const parsed = parseBatchReviewManifest(manifest);

    expect(parsed.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Evidence Reviewer",
        contextPath: "./examples/synthetic-reviewer-contract-review-context.json",
      }),
    );
    expect(parsed.reviews).toEqual([
      expect.objectContaining({
        name: "Synthetic reviewer contract packet",
        target: "./examples/synthetic-reviewer-contract-review-context.md",
      }),
    ]);

    const contextText = await readExampleFile(
      "examples/synthetic-reviewer-contract-review-context.json",
    );
    const context = JSON.parse(contextText) as {
      reviewFocus: string[];
      outOfScope: string[];
      reviewSurface: string;
    };
    expect(context.reviewSurface).toBe("Synthetic reviewer-contract packet");
    expect(context.reviewFocus).toContain(
      "Flag any claim that implies external action readiness without approval, release, or routing evidence.",
    );
    expect(context.outOfScope).toContain(
      "Do not infer private repositories, issue trackers, products, companies, or domain programs from placeholder wording.",
    );

    const targetText = await readExampleFile(
      "examples/synthetic-reviewer-contract-review-context.md",
    );
    expect(targetText).toContain("Evidence label C");
    expect(targetText).toContain("must remain caller-gated");
    expect(targetText).toContain(
      "Prefer stable generic finding keys when the same boundary or support gap could recur across runs.",
    );

    expectPublicSafeSerializedContent(
      `${manifestText}\n${contextText}\n${targetText}`,
    );
  });
});
