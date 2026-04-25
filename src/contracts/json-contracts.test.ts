import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  JSON_CONTRACT_SCHEMA_FILES,
  createBatchReviewResultKey,
  parseBatchReviewArtifactSummary,
  parseBatchReviewManifest,
  validateBatchReviewManifest,
  validateStructuredReviewResult,
} from "./json-contracts.js";
import { validateBatchReviewSummaryComparisonReport } from "./batch-review-summary-comparison-contract.js";
import {
  createBatchReviewSummaryComparisonFixture,
  createDecisionSummary,
  createStructuredResultSummary,
  expectApartmentAgnosticVisionProbeManifest,
  expectPublicSafePolicyRedactionsFixture,
  expectPublicSafeRunnableManifestFixture,
  expectPublicSafeStructuredReviewFixture,
  expectPublicSafeTextManifestExample,
} from "./json-contracts-test-helpers.js";

describe("public JSON contracts", () => {
  it("parses the published batch review manifest shape", () => {
    expect(
      parseBatchReviewManifest({
        defaults: {
          mode: "vision",
          expert: "UI/UX",
          outputDir: "./reviews",
          structuredOutputDir: "./reviews/json",
        },
        reviews: [
          {
            name: "Homepage hero",
            target: "https://example.com",
            sections: ["hero"],
            structuredOutputPath: "./reviews/json/homepage-hero.json",
          },
        ],
      }),
    ).toEqual({
      defaults: {
        mode: "vision",
        expert: "UI/UX",
        model: undefined,
        outputDir: "./reviews",
        structuredOutputDir: "./reviews/json",
        width: undefined,
        height: undefined,
        sections: undefined,
        css: undefined,
        promptLibraryPath: undefined,
        contextPath: undefined,
        ollamaUrl: undefined,
        ollamaKeepAlive: undefined,
      },
      reviews: [
        {
          name: "Homepage hero",
          target: "https://example.com",
          mode: undefined,
          expert: undefined,
          model: undefined,
          outputDir: undefined,
          width: undefined,
          height: undefined,
          sections: ["hero"],
          css: undefined,
          promptLibraryPath: undefined,
          contextPath: undefined,
          ollamaUrl: undefined,
          ollamaKeepAlive: undefined,
          outputPath: undefined,
          structuredOutputPath: "./reviews/json/homepage-hero.json",
        },
      ],
    });
  });

  it("returns a thin validation result instead of throwing for invalid input", () => {
    const validation = validateBatchReviewManifest({
      reviews: [{ mode: "expert" }],
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.message).toContain("reviews[0].target");
    }
  });

  it("parses the published batch review summary shape", () => {
    expect(
      parseBatchReviewArtifactSummary({
        manifestPath: "Local file path (.json file)",
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [
          {
            index: 0,
            resultKey: "readme-audit-expert",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            structuredOutputPath: "Local file path (.json file)",
            structuredResult: createStructuredResultSummary({
              overallSeverity: "medium",
              totalFindings: 2,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 1,
                low: 1,
                unknown: 0,
              },
              decision: createDecisionSummary({
                verdict: "accept_with_follow_up",
                confidence: "medium",
                acceptedFindings: 2,
                rejectedFindings: 0,
              }),
            }),
            status: "success",
          },
        ],
      }),
    ).toEqual({
      manifestPath: "Local file path (.json file)",
      total: 1,
      succeeded: 1,
      failed: 0,
      results: [
        {
          index: 0,
          name: undefined,
          resultKey: "readme-audit-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          outputPath: undefined,
          structuredOutputPath: "Local file path (.json file)",
          structuredResult: createStructuredResultSummary({
            overallSeverity: "medium",
            totalFindings: 2,
            findingCounts: {
              critical: 0,
              high: 0,
              medium: 1,
              low: 1,
              unknown: 0,
            },
            decision: createDecisionSummary({
              verdict: "accept_with_follow_up",
              confidence: "medium",
              acceptedFindings: 2,
              rejectedFindings: 0,
            }),
          }),
          status: "success",
          errorSummary: undefined,
        },
      ],
    });
  });

  it("fills a stable result key when older summaries omit it", () => {
    const parsed = parseBatchReviewArtifactSummary({
      total: 1,
      succeeded: 1,
      failed: 0,
      results: [
        {
          index: 0,
          name: "Homepage hero",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          status: "success",
        },
      ],
    });

    expect(parsed.results[0]?.resultKey).toBe(
      createBatchReviewResultKey({
        index: 0,
        name: "Homepage hero",
        mode: "vision",
      }),
    );
  });

  it("validates the published batch review summary comparison shape", () => {
    const validation = validateBatchReviewSummaryComparisonReport(
      createBatchReviewSummaryComparisonFixture(),
    );

    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        comparison: expect.objectContaining({
          counts: expect.objectContaining({
            totalFindingsDelta: 1,
          }),
          changed: [
            expect.objectContaining({
              severityChange: expect.objectContaining({
                direction: "regressed",
              }),
            }),
          ],
        }),
      }),
    });
  });

  it("validates the published structured review result shape", () => {
    const validation = validateStructuredReviewResult({
      schemaVersion: "1",
      workflow: "vision",
      expert: "SKEPTICAL UI/UX CRITIC",
      model: "qwen3-vl:30b",
      summary: "One high-severity issue remains.",
      overallSeverity: "high",
      findings: [
        {
          key: "cta-contrast",
          title: "Contrast regression",
          summary: "The primary CTA falls below contrast guidance.",
          severity: "high",
          evidence: ["Hero CTA", "Footer CTA"],
        },
      ],
      provenance: [
        {
          label: "Content source",
          value: "Remote URL (example.com)",
        },
      ],
      markdown: "# Summary\nOne high-severity issue remains.",
    });

    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "vision",
        overallSeverity: "high",
        findings: [
          expect.objectContaining({
            key: "cta-contrast",
          }),
        ],
      }),
    });
  });

  it("ships parseable JSON schema artifacts at the package root", async () => {
    for (const schemaPath of Object.values(JSON_CONTRACT_SCHEMA_FILES)) {
      const absolutePath = path.join(process.cwd(), schemaPath);
      const parsed = JSON.parse(await fs.readFile(absolutePath, "utf-8")) as {
        $id?: string;
        type?: string;
      };

      expect(parsed.$id).toContain(path.basename(schemaPath));
      expect(parsed.type).toBe("object");
    }
  });

  it("ships parseable starter manifest examples at the package root", async () => {
    const exampleManifestPaths = [
      "examples/text-expert-audit.manifest.json",
      "examples/webpage-vision-sweep.manifest.json",
      "examples/screenshot-batch-run.manifest.json",
      "examples/synthetic-zone-vision-probe.manifest.json",
      "examples/synthetic-creative-review-packet.manifest.json",
      "examples/sanitized-social-evidence-review.manifest.json",
      "examples/synthetic-context-pack-quality-review.manifest.json",
      "examples/synthetic-finance-signal-routing-review.manifest.json",
      "examples/synthetic-buyer-claim-caveat-review.manifest.json",
      "examples/synthetic-grocy-public-safety-review.manifest.json",
      "examples/synthetic-scheduling-fallback-review.manifest.json",
    ];

    for (const examplePath of exampleManifestPaths) {
      const parsed = JSON.parse(
        await fs.readFile(path.join(process.cwd(), examplePath), "utf-8"),
      ) as unknown;

      expect(parseBatchReviewManifest(parsed)).toEqual(
        expect.objectContaining({
          reviews: expect.any(Array),
        }),
      );
    }
  });

  it("keeps the synthetic buyer-claim caveat manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-buyer-claim-caveat-review.manifest.json",
      contextPath: "./examples/synthetic-buyer-claim-caveat-review-context.json",
      reviewName: "Synthetic buyer claim caveat packet",
      reviewSurface: "Synthetic buyer claim caveat packet",
      targetPath: "./examples/synthetic-buyer-claim-caveat-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-buyer-claim-caveat-review-context.md)",
    });
  });

  it("keeps the synthetic Grocy public-safety manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-grocy-public-safety-review.manifest.json",
      contextPath: "./examples/synthetic-grocy-public-safety-review-context.json",
      reviewName: "Synthetic Grocy public-safety packet",
      reviewSurface: "Synthetic Grocy public-safety packet",
      targetPath: "./examples/synthetic-grocy-public-safety-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-grocy-public-safety-review-context.md)",
    });
  });

  it("keeps the synthetic scheduling fallback manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-scheduling-fallback-review.manifest.json",
      contextPath: "./examples/synthetic-scheduling-fallback-review-context.json",
      expert: "Efficiency",
      reviewName: "Synthetic scheduling fallback packet",
      reviewSurface: "Synthetic scheduling fallback packet",
      targetPath: "./examples/synthetic-scheduling-fallback-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-scheduling-fallback-review-context.md)",
    });
  });

  it("keeps the synthetic creative-review manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-creative-review-packet.manifest.json",
      contextPath: "./examples/synthetic-creative-review-context.json",
      reviewName: "Synthetic creative review packet",
      reviewSurface: "Sanitized creative review packet",
      targetPath: "./examples/synthetic-creative-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-creative-review-context.md)",
    });
  });

  it("keeps the sanitized social-evidence starter manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/sanitized-social-evidence-review.manifest.json",
      contextPath: "./examples/synthetic-social-evidence-review-context.json",
      reviewName: "Synthetic social evidence packet",
      reviewSurface: "Sanitized social evidence packet",
      targetPath: "./examples/synthetic-social-evidence-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-social-evidence-review-context.md)",
    });
  });

  it("keeps the synthetic context-pack quality manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-context-pack-quality-review.manifest.json",
      contextPath: "./examples/synthetic-context-pack-quality-review-context.json",
      expert: "Efficiency",
      reviewName: "Synthetic context pack quality packet",
      reviewSurface: "Synthetic context pack quality packet",
      targetPath: "./examples/synthetic-context-pack-quality-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-context-pack-quality-review-context.md)",
    });
  });

  it("keeps the synthetic finance-signal routing manifest public-safe and context-backed", async () => {
    await expectPublicSafeTextManifestExample({
      manifestPath: "examples/synthetic-finance-signal-routing-review.manifest.json",
      contextPath: "./examples/synthetic-finance-signal-routing-review-context.json",
      expert: "Efficiency",
      reviewName: "Synthetic finance-signal routing packet",
      reviewSurface: "Synthetic finance-signal routing packet",
      targetPath: "./examples/synthetic-finance-signal-routing-review-context.md",
      targetSummary:
        "Local file path (.md file, file: synthetic-finance-signal-routing-review-context.md)",
    });
  });

  it("ships a synthetic apartment review-result fixture without private home data", async () => {
    await expectPublicSafeStructuredReviewFixture({
      fixturePath: "examples/synthetic-apartment-review-result.fixture.json",
      workflow: "vision",
    });
  });

  it("ships a public-safe synthetic reviewer-contract fixture", async () => {
    await expectPublicSafeStructuredReviewFixture({
      fixturePath: "examples/synthetic-reviewer-contract-result.fixture.json",
      workflow: "expert",
    });
  });

  it("ships a public-safe synthetic PR review adapter pilot fixture", async () => {
    await expectPublicSafeStructuredReviewFixture({
      fixturePath: "examples/synthetic-pr-review-result.fixture.json",
      workflow: "expert",
      blockedTerms: [
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
        "github.com",
      ],
    });
  });

  it("ships a runnable public-safe synthetic reviewer-contract manifest", async () => {
    await expectPublicSafeRunnableManifestFixture({
      manifestPath: "examples/synthetic-reviewer-contract-review.manifest.json",
      expectedMode: "expert",
      expectedExpert: "Evidence Reviewer",
      expectedContextPath: "./examples/synthetic-reviewer-contract-review-context.json",
      expectedReviewName: "Synthetic reviewer contract packet",
      expectedTargetPath: "./examples/synthetic-reviewer-contract-review-context.md",
    });
  });

  it("ships a public-safe synthetic policy redactions fixture", async () => {
    await expectPublicSafePolicyRedactionsFixture(
      "examples/synthetic-policy-redactions.fixture.json",
    );
  });

  it("ships an apartment-agnostic synthetic vision probe without private home semantics", async () => {
    await expectApartmentAgnosticVisionProbeManifest();
  });

  it("publishes starter examples in the package file list", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "package.json"), "utf-8"),
    ) as {
      files?: string[];
    };

    expect(packageJson.files).toContain("examples");
    expect(packageJson.files).toContain("docs");
  });
});
