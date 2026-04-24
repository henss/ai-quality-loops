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
import { loadBatchReviewExecutionPlan } from "../review/batch-review.js";
import {
  defineReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
} from "../shared/review-surface.js";

const PUBLIC_SAFE_EXAMPLE_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "format the sky",
  "ops-",
  "d:\\",
  "/users/",
  "https://",
  ".png",
  ".jpg",
  ".jpeg",
];

type PublicSafeTextManifestExample = {
  manifestPath: string;
  contextPath: string;
  expert?: string;
  reviewName: string;
  reviewSurface: string;
  targetPath: string;
  targetSummary: string;
};

async function expectPublicSafeTextManifestExample(
  example: PublicSafeTextManifestExample,
) {
  const manifestPath = path.join(process.cwd(), example.manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
  const parsed = parseBatchReviewManifest(manifest);
  const expert = example.expert ?? "UI/UX";

  expect(parsed.defaults).toEqual(
    expect.objectContaining({
      mode: "expert",
      expert,
      contextPath: example.contextPath,
    }),
  );
  expect(parsed.reviews).toEqual([
    expect.objectContaining({
      name: example.reviewName,
      target: example.targetPath,
    }),
  ]);

  const plan = await loadBatchReviewExecutionPlan({
    manifestPath,
    cwd: process.cwd(),
  });
  expect(plan.entries).toEqual([
    expect.objectContaining({
      mode: "expert",
      target: example.targetPath,
      targetSummary: example.targetSummary,
      contextPath: example.contextPath,
    }),
  ]);
  expect(plan.preflight.personaRequirements).toEqual([
    {
      expert,
      promptLibraryPath: undefined,
    },
  ]);
  expect(plan.preflight.contextPaths).toEqual([example.contextPath]);

  const contextPath = path.join(process.cwd(), example.contextPath);
  const targetPath = path.join(process.cwd(), example.targetPath);
  await expect(fs.access(contextPath)).resolves.toBeUndefined();
  await expect(fs.access(targetPath)).resolves.toBeUndefined();

  const context = JSON.parse(await fs.readFile(contextPath, "utf-8")) as {
    reviewFocus?: unknown;
    outOfScope?: unknown;
  };
  expect(context).toEqual(
    expect.objectContaining({
      reviewSurface: example.reviewSurface,
      reviewFocus: expect.any(Array),
      outOfScope: expect.any(Array),
    }),
  );

  const serialized = [
    JSON.stringify(manifest),
    JSON.stringify(context),
    await fs.readFile(targetPath, "utf-8"),
  ]
    .join("\n")
    .toLowerCase();
  for (const privateBoundaryTerm of PUBLIC_SAFE_EXAMPLE_BLOCKLIST) {
    expect(serialized).not.toContain(privateBoundaryTerm);
  }
}

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
            structuredResult: {
              overallSeverity: "medium",
              totalFindings: 2,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 1,
                low: 1,
                unknown: 0,
              },
            },
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
          structuredResult: {
            overallSeverity: "medium",
            totalFindings: 2,
            findingCounts: {
              critical: 0,
              high: 0,
              medium: 1,
              low: 1,
              unknown: 0,
            },
          },
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
    const validation = validateBatchReviewSummaryComparisonReport({
      inputs: {
        before: { pathLabel: "Local file path (.json file)" },
        after: { pathLabel: "Local file path (.json file)" },
      },
      comparison: {
        counts: {
          beforeEntries: 1,
          afterEntries: 1,
          added: 0,
          removed: 0,
          matched: 1,
          statusChanged: 0,
          severityMovement: {
            improved: 0,
            regressed: 1,
            unchanged: 0,
            unavailable: 0,
          },
          totalFindingsDelta: 1,
          findingCountDelta: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            unknown: 0,
          },
          promptEvalCountDelta: 20,
          addedPromptEvalCount: 20,
          promptEvalCountUnavailable: 0,
        },
        added: [],
        removed: [],
        changed: [
          {
            resultKey: "homepage-vision",
            before: {
              resultKey: "homepage-vision",
              index: 0,
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "success",
              structuredResult: {
                overallSeverity: "medium",
                totalFindings: 1,
                findingCounts: {
                  critical: 0,
                  high: 0,
                  medium: 1,
                  low: 0,
                  unknown: 0,
                },
              },
            },
            after: {
              resultKey: "homepage-vision",
              index: 0,
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "success",
              structuredResult: {
                overallSeverity: "high",
                totalFindings: 2,
                findingCounts: {
                  critical: 0,
                  high: 1,
                  medium: 1,
                  low: 0,
                  unknown: 0,
                },
              },
            },
            statusChange: {
              before: "success",
              after: "success",
              changed: false,
            },
            severityChange: {
              before: "medium",
              after: "high",
              direction: "regressed",
            },
            totalFindingsDelta: 1,
            findingCountDelta: {
              critical: 0,
              high: 1,
              medium: 0,
              low: 0,
              unknown: 0,
            },
          },
        ],
        unchanged: [],
      },
    });

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
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-apartment-review-result.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;

    const validation = validateStructuredReviewResult(fixture);
    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "vision",
        provenance: expect.arrayContaining([
          expect.objectContaining({
            label: "Privacy boundary",
          }),
        ]),
      }),
    });

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const privateHomeDataTerm of [
      "stefan",
      "bedroom",
      "kitchen",
      "bathroom",
      "living room",
      "latitude",
      "longitude",
      ".png",
      ".jpg",
      ".jpeg",
      "d:\\",
      "/users/",
    ]) {
      expect(serialized).not.toContain(privateHomeDataTerm);
    }
  });

  it("ships a public-safe synthetic reviewer-contract fixture", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-reviewer-contract-result.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;

    const validation = validateStructuredReviewResult(fixture);
    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "expert",
        provenance: expect.arrayContaining([
          expect.objectContaining({
            label: "Privacy boundary",
          }),
        ]),
      }),
    });

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const privateBoundaryTerm of [
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
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });

  it("ships a public-safe synthetic PR review adapter pilot fixture", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-pr-review-result.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;

    const validation = validateStructuredReviewResult(fixture);
    expect(validation).toEqual({
      ok: true,
      value: expect.objectContaining({
        workflow: "expert",
        provenance: expect.arrayContaining([
          expect.objectContaining({
            label: "Privacy boundary",
          }),
        ]),
      }),
    });

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const privateBoundaryTerm of [
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
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });

  it("ships a runnable public-safe synthetic reviewer-contract manifest", async () => {
    const manifestPath = path.join(
      process.cwd(),
      "examples/synthetic-reviewer-contract-review.manifest.json",
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
    const parsed = parseBatchReviewManifest(manifest);

    expect(parsed.defaults?.mode).toBe("expert");
    expect(parsed.defaults?.expert).toBe("Evidence Reviewer");
    expect(parsed.defaults?.contextPath).toBe(
      "./examples/synthetic-reviewer-contract-review-context.json",
    );
    expect(parsed.reviews[0]).toEqual(
      expect.objectContaining({
        name: "Synthetic reviewer contract packet",
        target: "./examples/synthetic-reviewer-contract-review-context.md",
      }),
    );

    const contextJsonPath = path.join(
      process.cwd(),
      "examples/synthetic-reviewer-contract-review-context.json",
    );
    const targetPath = path.join(
      process.cwd(),
      parsed.reviews[0]!.target,
    );
    await expect(fs.access(contextJsonPath)).resolves.toBeUndefined();
    await expect(fs.access(targetPath)).resolves.toBeUndefined();

    const contextJson = await fs.readFile(contextJsonPath, "utf-8");
    const targetMarkdown = await fs.readFile(targetPath, "utf-8");
    const serialized = `${JSON.stringify(manifest)}\n${contextJson}\n${targetMarkdown}`.toLowerCase();
    for (const privateBoundaryTerm of [
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
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });

  it("ships a public-safe synthetic policy redactions fixture", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-policy-redactions.fixture.json",
        ),
        "utf-8",
      ),
    ) as {
      redactions?: Array<{
        pattern?: string;
        replacement?: string;
        sample?: string;
        expected?: string;
      }>;
    };

    expect(fixture.redactions).toEqual(expect.any(Array));

    for (const redaction of fixture.redactions || []) {
      expect(typeof redaction.pattern).toBe("string");
      expect(typeof redaction.replacement).toBe("string");
      expect(typeof redaction.sample).toBe("string");
      expect(typeof redaction.expected).toBe("string");

      const redactions = defineReviewSurfaceRedactions([
        {
          pattern: new RegExp(redaction.pattern!, "g"),
          replacement: redaction.replacement!,
        },
      ]);

      expect(
        sanitizeReviewSurfaceValue(redaction.sample!, {
          extraRedactions: redactions,
        }),
      ).toBe(redaction.expected);
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
      "company",
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

  it("ships an apartment-agnostic synthetic vision probe without private home semantics", async () => {
    const manifestPath = path.join(
      process.cwd(),
      "examples/synthetic-zone-vision-probe.manifest.json",
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
    const parsed = parseBatchReviewManifest(manifest);

    expect(parsed.defaults?.mode).toBe("vision");
    expect(parsed.reviews[0]).toEqual(
      expect.objectContaining({
        name: "Synthetic zone overview",
        target: "./examples/synthetic-zone-layout.html",
        sections: ["overview", "zone-a", "zone-b", "boundary-note"],
      }),
    );

    const htmlPath = path.join(process.cwd(), parsed.reviews[0]!.target);
    await expect(fs.access(htmlPath)).resolves.toBeUndefined();

    const html = await fs.readFile(htmlPath, "utf-8");
    const serialized = `${JSON.stringify(manifest)}\n${html}`.toLowerCase();
    for (const privateHomeDataTerm of [
      "stefan",
      "apartment",
      "bedroom",
      "kitchen",
      "bathroom",
      "living room",
      "resident",
      "latitude",
      "longitude",
      ".png",
      ".jpg",
      ".jpeg",
      "d:\\",
      "/users/",
    ]) {
      expect(serialized).not.toContain(privateHomeDataTerm);
    }
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
