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

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf-8");
}

function expectPublicSafeSerializedContent(serialized: string): void {
  const normalized = serialized.toLowerCase();

  for (const privateBoundaryTerm of PRIVATE_BOUNDARY_TERMS) {
    expect(normalized).not.toContain(privateBoundaryTerm);
  }
}

describe("synthetic temporal anomaly public fixtures", () => {
  it("ships a runnable temporal anomaly packet that stays apartment-agnostic and caller-gated", async () => {
    const manifestText = await readRepoFile(
      "examples/synthetic-temporal-anomaly-review.manifest.json",
    );
    const contextText = await readRepoFile(
      "examples/synthetic-temporal-anomaly-review-context.json",
    );
    const targetText = await readRepoFile(
      "examples/synthetic-temporal-anomaly-review-context.md",
    );

    const manifest = parseBatchReviewManifest(JSON.parse(manifestText));
    const context = JSON.parse(contextText) as {
      reviewSurface: string;
      reviewFocus: string[];
      outOfScope: string[];
    };

    expect(manifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Evidence Reviewer",
        contextPath: "./examples/synthetic-temporal-anomaly-review-context.json",
      }),
    );
    expect(manifest.reviews).toEqual([
      expect.objectContaining({
        name: "Synthetic temporal anomaly packet",
        target: "./examples/synthetic-temporal-anomaly-review-context.md",
      }),
    ]);
    expect(context.reviewSurface).toBe("Synthetic temporal anomaly packet");
    expect(context.reviewFocus).toContain(
      "Check whether the packet distinguishes a generic temporal anomaly from higher-confidence interpretations such as occupancy, identity, or intent.",
    );
    expect(context.outOfScope).toContain(
      "Do not approve notifications, home-control actions, storage decisions, retention policy, or downstream routing.",
    );
    expect(targetText).toContain(
      "The packet proves a person entered the space between frames.",
    );
    expect(targetText).toContain("ready for automated household action");
    expect(targetText).toContain("apartment-agnostic temporal anomaly lane");

    expectPublicSafeSerializedContent(
      `${manifestText}\n${contextText}\n${targetText}`,
    );
  });

  it("ships a checked-in temporal anomaly pilot artifact with explicit continuation-safe boundaries", async () => {
    const markdownArtifactText = await readRepoFile(
      "reviews/temporal-anomaly/synthetic-temporal-anomaly-packet-expert-review.md",
    );
    const structuredArtifactText = await readRepoFile(
      "reviews/temporal-anomaly/json/synthetic-temporal-anomaly-packet-expert-review.json",
    );
    const structuredArtifact = JSON.parse(structuredArtifactText) as unknown;

    const validation = validateStructuredReviewResult(structuredArtifact);
    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "expert",
        expert: "Evidence Reviewer",
        summary: expect.stringContaining("promising reusable lane"),
        overallSeverity: "medium",
        findings: expect.arrayContaining([
          expect.objectContaining({
            key: "occupancy-inference-boundary",
            severity: "medium",
          }),
          expect.objectContaining({
            key: "automated-action-boundary",
            severity: "medium",
          }),
          expect.objectContaining({
            key: "temporal-evidence-traceability",
            severity: "low",
          }),
        ]),
        decision: expect.objectContaining({
          verdict: "accept_with_follow_up",
          blocking: false,
          next_step_actions: ["collect_more_evidence", "track_follow_up"],
        }),
      }),
    });

    expect(markdownArtifactText).toContain('"verdict": "accept_with_follow_up"');
    expect(markdownArtifactText).toContain(
      "Occupancy inference exceeds temporal evidence",
    );
    expect(markdownArtifactText).toContain(
      "Continue only if future temporal fixtures can stay apartment-agnostic and comparison-focused.",
    );

    expectPublicSafeSerializedContent(
      `${markdownArtifactText}\n${structuredArtifactText}`,
    );
  });
});
