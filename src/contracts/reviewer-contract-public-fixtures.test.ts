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

interface ParsedPublicFixtureContext {
  reviewFocus: string[];
  outOfScope: string[];
  reviewSurface: string;
}

interface CheckedInStructuredArtifact {
  markdownArtifactText: string;
  structuredArtifactText: string;
  structuredArtifact: unknown;
}

async function readManifestContextTarget(options: {
  manifestPath: string;
  contextPath: string;
  targetPath: string;
}): Promise<{
  manifestText: string;
  parsedManifest: ReturnType<typeof parseBatchReviewManifest>;
  contextText: string;
  context: ParsedPublicFixtureContext;
  targetText: string;
}> {
  const manifestText = await readExampleFile(options.manifestPath);
  const parsedManifest = parseBatchReviewManifest(JSON.parse(manifestText));
  const contextText = await readExampleFile(options.contextPath);
  const context = JSON.parse(contextText) as ParsedPublicFixtureContext;
  const targetText = await readExampleFile(options.targetPath);

  return {
    manifestText,
    parsedManifest,
    contextText,
    context,
    targetText,
  };
}

function expectPublicSafeSerializedContent(serialized: string): void {
  const normalized = serialized.toLowerCase();

  for (const privateBoundaryTerm of PRIVATE_BOUNDARY_TERMS) {
    expect(normalized).not.toContain(privateBoundaryTerm);
  }
}

async function readCheckedInStructuredArtifact(options: {
  markdownPath: string;
  structuredPath: string;
}): Promise<CheckedInStructuredArtifact> {
  const markdownArtifactText = await readExampleFile(options.markdownPath);
  const structuredArtifactText = await readExampleFile(options.structuredPath);
  const structuredArtifact = JSON.parse(structuredArtifactText) as unknown;

  return {
    markdownArtifactText,
    structuredArtifactText,
    structuredArtifact,
  };
}

function expectSyntheticContextPackStructuredArtifact(
  structuredArtifact: unknown,
): void {
  const validation = validateStructuredReviewResult(structuredArtifact);

  expect(validation).toEqual({
    ok: true,
    value: expect.objectContaining({
      workflow: "expert",
      summary: expect.stringContaining("empty audit fields"),
      findings: expect.arrayContaining([
        expect.objectContaining({
          key: "empty-audit-boundary",
          evidence: expect.arrayContaining([
            "Research-source audit intentionally omitted",
            "Public-source list intentionally omitted",
          ]),
        }),
        expect.objectContaining({
          key: "automated-action-readiness-unsupported",
          severity: "high",
        }),
      ]),
      provenance: expect.arrayContaining([
        expect.objectContaining({
          label: "Privacy boundary",
          value: "No public-source list or copied source truth in shared artifact",
        }),
      ]),
    }),
  });
}

function expectSyntheticContextPackMarkdownArtifact(
  markdownArtifactText: string,
): void {
  expect(markdownArtifactText).toContain("Output classification: review");
  expect(markdownArtifactText).toContain("public-source list empty");
  expect(markdownArtifactText).toContain(
    "any real web, registry, tracker, or approval check already passed",
  );
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
        decision: expect.objectContaining({
          verdict: "accept_with_follow_up",
          next_step_actions: ["collect_more_evidence", "track_follow_up"],
        }),
      }),
    });

    expectPublicSafeSerializedContent(fixtureText);
  });

  it("ships a runnable manifest and context pair that keeps external action caller-gated", async () => {
    const fixture = await readManifestContextTarget({
      manifestPath: "examples/synthetic-reviewer-contract-review.manifest.json",
      contextPath: "examples/synthetic-reviewer-contract-review-context.json",
      targetPath: "examples/synthetic-reviewer-contract-review-context.md",
    });

    expect(fixture.parsedManifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Evidence Reviewer",
        contextPath: "./examples/synthetic-reviewer-contract-review-context.json",
      }),
    );
    expect(fixture.parsedManifest.reviews).toEqual([
      expect.objectContaining({
        name: "Synthetic reviewer contract packet",
        target: "./examples/synthetic-reviewer-contract-review-context.md",
      }),
    ]);
    expect(fixture.context.reviewSurface).toBe("Synthetic reviewer-contract packet");
    expect(fixture.context.reviewFocus).toContain(
      "Flag any claim that implies external action readiness without approval, release, or routing evidence.",
    );
    expect(fixture.context.outOfScope).toContain(
      "Do not infer private repositories, issue trackers, products, companies, or domain programs from placeholder wording.",
    );
    expect(fixture.targetText).toContain("Evidence label C");
    expect(fixture.targetText).toContain("must remain caller-gated");
    expect(fixture.targetText).toContain(
      "Prefer stable generic finding keys when the same boundary or support gap could recur across runs.",
    );

    expectPublicSafeSerializedContent(
      `${fixture.manifestText}\n${fixture.contextText}\n${fixture.targetText}`,
    );
  });
});

describe("synthetic context-pack public fixtures", () => {
  it("ships a context-pack example that keeps source auditing caller-owned", async () => {
    const fixture = await readManifestContextTarget({
      manifestPath: "examples/synthetic-context-pack-quality-review.manifest.json",
      contextPath: "examples/synthetic-context-pack-quality-review-context.json",
      targetPath: "examples/synthetic-context-pack-quality-review-context.md",
    });

    expect(fixture.parsedManifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Efficiency",
        contextPath: "./examples/synthetic-context-pack-quality-review-context.json",
      }),
    );
    expect(fixture.parsedManifest.reviews).toEqual([
      expect.objectContaining({
        name: "Synthetic context pack quality packet",
        target: "./examples/synthetic-context-pack-quality-review-context.md",
      }),
    ]);
    expect(fixture.context.reviewSurface).toBe("Synthetic context pack quality packet");
    expect(fixture.context.reviewFocus).toContain(
      "Treat the omitted research-source audit and public-source list as intentional synthetic scope; do not infer that source freshness, retrieval coverage, public-source selection, or approval checks already happened.",
    );
    expect(fixture.context.outOfScope).toContain(
      "Do not infer private source contents, real tracker state, account details, or production readiness.",
    );
    expect(fixture.targetText).toContain("Research-source audit");
    expect(fixture.targetText).toContain("Public-source list");
    expect(fixture.targetText).toContain("Intentionally omitted in this synthetic example.");
    expect(fixture.targetText).toContain(
      "real callers must audit source freshness, retrieval coverage, public-source selection, and approval in their own boundary.",
    );
    expect(fixture.targetText).toContain(
      "Treat the missing research-source audit and public-source list as intentional fixture scope",
    );

    expectPublicSafeSerializedContent(
      `${fixture.manifestText}\n${fixture.contextText}\n${fixture.targetText}`,
    );
  });

  it("ships a checked-in synthetic context-pack review artifact with an explicit no-public-sources boundary", async () => {
    const artifact = await readCheckedInStructuredArtifact({
      markdownPath:
        "reviews/context-pack-quality/synthetic-context-pack-quality-packet-expert-review.md",
      structuredPath:
        "reviews/context-pack-quality/json/synthetic-context-pack-quality-packet-expert-review.json",
    });

    expectSyntheticContextPackStructuredArtifact(artifact.structuredArtifact);
    expectSyntheticContextPackMarkdownArtifact(artifact.markdownArtifactText);

    expectPublicSafeSerializedContent(
      `${artifact.markdownArtifactText}\n${artifact.structuredArtifactText}`,
    );
  });
});

describe("synthetic private-domain bridge public fixtures", () => {
  it("ships a bridge packet example with stable generic keys and explicit caller-owned authority", async () => {
    const fixture = await readManifestContextTarget({
      manifestPath: "examples/synthetic-private-domain-bridge-review.manifest.json",
      contextPath: "examples/synthetic-private-domain-bridge-review-context.json",
      targetPath: "examples/synthetic-private-domain-bridge-review-context.md",
    });

    expect(fixture.parsedManifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Efficiency",
        contextPath: "./examples/synthetic-private-domain-bridge-review-context.json",
      }),
    );
    expect(fixture.parsedManifest.reviews).toEqual([
      expect.objectContaining({
        name: "Synthetic private-domain bridge packet",
        target: "./examples/synthetic-private-domain-bridge-review-context.md",
      }),
    ]);
    expect(fixture.context.reviewSurface).toBe("Synthetic private-domain bridge packet");
    expect(fixture.context.reviewFocus).toContain(
      "Check that stable finding keys are used only when they stay generic across runs and do not depend on private naming or caller-owned identifiers.",
    );
    expect(fixture.context.outOfScope).toContain(
      "Assigning priority, writing queue state, changing ownership, or approving downstream execution.",
    );
    expect(fixture.targetText).toContain("This bridge packet is analysis-only.");
    expect(fixture.targetText).toContain("caller-owned-authority-gap");
    expect(fixture.targetText).toContain("stable-finding-key-ready");
    expect(fixture.targetText).toContain("not as a source of truth about a real project");

    expectPublicSafeSerializedContent(
      `${fixture.manifestText}\n${fixture.contextText}\n${fixture.targetText}`,
    );
  });
});
