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

  it("publishes starter examples in the package file list", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "package.json"), "utf-8"),
    ) as {
      files?: string[];
    };

    expect(packageJson.files).toContain("examples");
  });
});
