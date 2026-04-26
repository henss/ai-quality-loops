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

interface ParsedPublicFixtureContext {
  reviewFocus: string[];
  outOfScope: string[];
  reviewSurface: string;
}

interface ReviewerContractSamplePack {
  packId: string;
  manifestPath: string;
  contextPath: string;
  targetPath: string;
  expectedPath: string;
  expectedReviewName: string;
  expectedReviewSurface: string;
  expectedFindingKeys: string[];
  expectedNextStepActions: string[];
  expectedVerdict: string;
  expectedEvidenceRequestKeys?: string[];
}

async function readExampleFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf-8");
}

function expectPublicSafeSerializedContent(serialized: string): void {
  const normalized = serialized.toLowerCase();

  for (const privateBoundaryTerm of PRIVATE_BOUNDARY_TERMS) {
    expect(normalized).not.toContain(privateBoundaryTerm);
  }
}

async function readReviewerContractSamplePack(
  samplePack: ReviewerContractSamplePack,
): Promise<{
  manifestText: string;
  parsedManifest: ReturnType<typeof parseBatchReviewManifest>;
  contextText: string;
  context: ParsedPublicFixtureContext;
  targetText: string;
  expectedText: string;
  expectedFixture: unknown;
}> {
  const manifestText = await readExampleFile(samplePack.manifestPath);
  const contextText = await readExampleFile(samplePack.contextPath);
  const targetText = await readExampleFile(samplePack.targetPath);
  const expectedText = await readExampleFile(samplePack.expectedPath);

  return {
    manifestText,
    parsedManifest: parseBatchReviewManifest(JSON.parse(manifestText)),
    contextText,
    context: JSON.parse(contextText) as ParsedPublicFixtureContext,
    targetText,
    expectedText,
    expectedFixture: JSON.parse(expectedText) as unknown,
  };
}

function expectReviewerContractSamplePackConformance(
  samplePack: ReviewerContractSamplePack,
  fixture: Awaited<ReturnType<typeof readReviewerContractSamplePack>>,
): void {
  expect(fixture.parsedManifest.defaults).toEqual(
    expect.objectContaining({
      mode: "expert",
      expert: "Evidence Reviewer",
      contextPath: samplePack.contextPath,
    }),
  );
  expect(fixture.parsedManifest.reviews).toEqual([
    expect.objectContaining({
      name: samplePack.expectedReviewName,
      target: samplePack.targetPath,
      structuredOutputPath: expect.stringContaining(
        `reviewer-contract-sample-packs/json/${samplePack.packId}.json`,
      ),
    }),
  ]);
  expect(fixture.context.reviewSurface).toBe(samplePack.expectedReviewSurface);
  expect(fixture.context.reviewFocus).toEqual(
    expect.arrayContaining([
      expect.stringContaining("stable generic finding keys"),
    ]),
  );
  expect(fixture.context.outOfScope).toEqual(
    expect.arrayContaining([expect.stringContaining("Do not")]),
  );
  expect(fixture.targetText).toContain("Evidence label C");
  expect(fixture.targetText).toContain("caller-owned");

  const validation = validateStructuredReviewResult(fixture.expectedFixture);
  expect(validation).toEqual({
    ok: true,
    value: expect.objectContaining({
      workflow: "expert",
      expert: "Evidence Reviewer",
      decision: expect.objectContaining({
        verdict: samplePack.expectedVerdict,
        next_step_actions: samplePack.expectedNextStepActions,
      }),
      findings: expect.arrayContaining(
        samplePack.expectedFindingKeys.map((key) =>
          expect.objectContaining({ key }),
        ),
      ),
      provenance: expect.arrayContaining([
        expect.objectContaining({
          label: "Privacy boundary",
        }),
        expect.objectContaining({
          label: "Evidence basis",
          value: "Generic evidence labels only",
        }),
      ]),
    }),
  });

  if (samplePack.expectedEvidenceRequestKeys) {
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      throw validation.error;
    }
    expect(validation.value.decision?.evidence_requests).toEqual(
      expect.arrayContaining(
        samplePack.expectedEvidenceRequestKeys.map((key) =>
          expect.objectContaining({ key }),
        ),
      ),
    );
  }

  expectPublicSafeSerializedContent(
    [
      fixture.manifestText,
      fixture.contextText,
      fixture.targetText,
      fixture.expectedText,
    ].join("\n"),
  );
}

describe("reviewer-contract sample packs", () => {
  it.each<ReviewerContractSamplePack>([
    {
      packId: "evidence-support-gap",
      manifestPath:
        "examples/reviewer-contract-sample-packs/evidence-support-gap.manifest.json",
      contextPath:
        "./examples/reviewer-contract-sample-packs/evidence-support-gap.context.json",
      targetPath:
        "./examples/reviewer-contract-sample-packs/evidence-support-gap.packet.md",
      expectedPath:
        "examples/reviewer-contract-sample-packs/evidence-support-gap.expected.json",
      expectedReviewName: "Reviewer contract evidence-support gap",
      expectedReviewSurface: "Reviewer contract evidence-support sample pack",
      expectedFindingKeys: [
        "evidence-support-gap",
        "caveat-preservation-gap",
      ],
      expectedNextStepActions: ["collect_more_evidence", "track_follow_up"],
      expectedVerdict: "accept_with_follow_up",
    },
    {
      packId: "evidence-request",
      manifestPath:
        "examples/reviewer-contract-sample-packs/evidence-request.manifest.json",
      contextPath:
        "./examples/reviewer-contract-sample-packs/evidence-request.context.json",
      targetPath:
        "./examples/reviewer-contract-sample-packs/evidence-request.packet.md",
      expectedPath:
        "examples/reviewer-contract-sample-packs/evidence-request.expected.json",
      expectedReviewName: "Reviewer contract evidence-request abstention",
      expectedReviewSurface: "Reviewer contract evidence-request sample pack",
      expectedFindingKeys: [],
      expectedNextStepActions: ["request_evidence"],
      expectedVerdict: "abstain_request_evidence",
      expectedEvidenceRequestKeys: ["missing-evidence-label-c-summary"],
    },
    {
      packId: "action-boundary",
      manifestPath:
        "examples/reviewer-contract-sample-packs/action-boundary.manifest.json",
      contextPath:
        "./examples/reviewer-contract-sample-packs/action-boundary.context.json",
      targetPath:
        "./examples/reviewer-contract-sample-packs/action-boundary.packet.md",
      expectedPath:
        "examples/reviewer-contract-sample-packs/action-boundary.expected.json",
      expectedReviewName: "Reviewer contract action-boundary gap",
      expectedReviewSurface: "Reviewer contract action-boundary sample pack",
      expectedFindingKeys: [
        "external-action-readiness-unsupported",
        "caller-owned-authority-gap",
      ],
      expectedNextStepActions: ["revise_artifact", "collect_more_evidence"],
      expectedVerdict: "changes_requested",
    },
  ])(
    "ships the $packId pack with actionable conformance expectations",
    async (samplePack) => {
      const fixture = await readReviewerContractSamplePack(samplePack);

      expectReviewerContractSamplePackConformance(samplePack, fixture);
    },
  );
});
