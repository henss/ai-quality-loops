import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getLogger, setLogger, silentLogger } from "../shared/logger.js";
import {
  createBatchReviewArtifactSummary,
  formatBatchReviewArtifactSummary,
  loadBatchReviewArtifactSummary,
  selectBatchReviewEntriesFromSummary,
  type BatchReviewManifest,
  writeBatchReviewArtifactSummary,
} from "./batch-review.js";

describe("batch review artifacts", () => {
  let tempDir: string;
  const originalLogger = getLogger();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-batch-review-"));
    setLogger(silentLogger);
  });

  afterEach(async () => {
    setLogger(originalLogger);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates a sanitized machine-readable artifact summary", () => {
    const artifact = createBatchReviewArtifactSummary({
      manifestPath: "D:\\workspace\\private\\manifest.json",
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          index: 0,
          name: "Homepage",
          resultKey: "homepage-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          outputPath: "D:\\workspace\\private\\reviews\\homepage.md",
          structuredOutputPath: "D:\\workspace\\private\\reviews\\homepage.json",
          structuredResult: {
            overallSeverity: "high",
            totalFindings: 2,
            findingCounts: {
              critical: 0,
              high: 1,
              medium: 0,
              low: 1,
              unknown: 0,
            },
          },
          status: "success",
        },
        {
          index: 1,
          resultKey: "review-2-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          status: "failure",
          errorSummary: "Error: Failed to open Local file path (.md file)",
        },
      ],
    });

    expect(artifact).toEqual({
      manifestPath: "Local file path (.json file)",
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          index: 0,
          name: "Homepage",
          resultKey: "homepage-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          outputPath: "Local file path (.md file)",
          structuredOutputPath: "Local file path (.json file)",
          structuredResult: {
            overallSeverity: "high",
            totalFindings: 2,
            findingCounts: {
              critical: 0,
              high: 1,
              medium: 0,
              low: 1,
              unknown: 0,
            },
          },
          status: "success",
        },
        {
          index: 1,
          name: undefined,
          resultKey: "review-2-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          status: "failure",
          errorSummary: "Error: Failed to open Local file path (.md file)",
        },
      ],
    });

    expect(
      JSON.parse(
        formatBatchReviewArtifactSummary({
          manifestPath: "D:\\workspace\\private\\manifest.json",
          total: 0,
          succeeded: 0,
          failed: 0,
          results: [],
        }),
      ),
    ).toMatchObject({
      manifestPath: "Local file path (.json file)",
      total: 0,
    });
  });

  it("keeps a synthetic public-boundary extraction artifact smoke test generic", () => {
    const artifactJson = formatBatchReviewArtifactSummary({
      manifestPath: "D:\\workspace\\private-product\\aiql-extraction\\manifest.json",
      total: 1,
      succeeded: 0,
      failed: 1,
      results: [
        {
          index: 0,
          name: "Synthetic public boundary smoke",
          resultKey: "synthetic-public-boundary-smoke-expert",
          mode: "expert",
          targetSummary:
            "Review https://example.com/private/extraction?token=secret#handoff with D:\\workspace\\private-product\\artifact.md and reviewer@example.com",
          outputPath:
            "D:\\workspace\\private-product\\aiql-extraction\\reviews\\artifact.md",
          structuredOutputPath:
            "D:\\workspace\\private-product\\aiql-extraction\\reviews\\artifact.json",
          status: "failure",
          errorSummary:
            'Failed to load "D:\\workspace\\private-product\\logs\\artifact.log" from https://example.com/private/extraction?token=secret#handoff and notify reviewer@example.com',
        },
      ],
    });

    expect(artifactJson).not.toContain("private-product");
    expect(artifactJson).not.toContain("private/extraction");
    expect(artifactJson).not.toContain("token=secret");
    expect(artifactJson).not.toContain("#handoff");
    expect(artifactJson).not.toContain("reviewer@example.com");
    expect(artifactJson).toContain("Local file path (.json file)");
    expect(artifactJson).toContain(
      "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
    expect(artifactJson).toContain("Email address");
  });

  it("writes the machine-readable artifact summary to disk", async () => {
    const outputPath = path.join(tempDir, "artifacts", "batch-summary.json");

    await writeBatchReviewArtifactSummary(
      {
        manifestPath: path.join(tempDir, "manifest.json"),
        total: 1,
        succeeded: 1,
        failed: 0,
        results: [
          {
            index: 0,
            resultKey: "review-1-expert",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            outputPath: path.join(tempDir, "reviews", "readme.md"),
            structuredOutputPath: path.join(tempDir, "reviews", "readme.json"),
            structuredResult: {
              overallSeverity: "low",
              totalFindings: 0,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                unknown: 0,
              },
            },
            status: "success",
          },
        ],
      },
      outputPath,
    );

    const written = JSON.parse(await fs.readFile(outputPath, "utf-8"));
    expect(written).toEqual({
      manifestPath: "Local file path (.json file)",
      total: 1,
      succeeded: 1,
      failed: 0,
      results: [
        {
          index: 0,
          resultKey: "review-1-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          outputPath: "Local file path (.md file)",
          structuredOutputPath: "Local file path (.json file)",
          structuredResult: {
            overallSeverity: "low",
            totalFindings: 0,
            findingCounts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              unknown: 0,
            },
          },
          status: "success",
        },
      ],
    });
  });

  it("loads a machine-readable artifact summary from disk", async () => {
    const outputPath = path.join(tempDir, "artifacts", "batch-summary.json");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          manifestPath: "Local file path (.json file)",
          total: 2,
          succeeded: 1,
          failed: 1,
          results: [
            {
              index: 0,
              name: "Homepage",
              resultKey: "homepage-vision",
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              structuredOutputPath: "Local file path (.json file)",
              status: "success",
            },
            {
              index: 1,
              name: "Readme audit",
              resultKey: "readme-audit-expert",
              mode: "expert",
              targetSummary: "Local file path (.md file)",
              status: "failure",
              errorSummary: "Error: Failed to open Local file path (.md file)",
            },
          ],
        },
        null,
        2,
      ),
    );

    const loaded = await loadBatchReviewArtifactSummary(outputPath, tempDir);
    expect(loaded).toEqual({
      manifestPath: "Local file path (.json file)",
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          index: 0,
          name: "Homepage",
          resultKey: "homepage-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          outputPath: undefined,
          structuredOutputPath: "Local file path (.json file)",
          structuredResult: undefined,
          status: "success",
        },
        {
          index: 1,
          name: "Readme audit",
          resultKey: "readme-audit-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          outputPath: undefined,
          structuredOutputPath: undefined,
          structuredResult: undefined,
          status: "failure",
          errorSummary: "Error: Failed to open Local file path (.md file)",
        },
      ],
    });
  });

  it("selects failed or named rerun entries from a prior summary artifact", () => {
    const manifest: BatchReviewManifest = {
      defaults: {
        mode: "expert",
        expert: "Efficiency",
      },
      reviews: [
        { name: "Homepage", mode: "vision", target: "https://example.com" },
        { name: "Readme audit", target: "./README.md" },
        { name: "Changelog audit", target: "./CHANGELOG.md" },
      ],
    };

    const selected = selectBatchReviewEntriesFromSummary(
      manifest,
      {
        manifestPath: "Local file path (.json file)",
        total: 3,
        succeeded: 1,
        failed: 2,
        results: [
          {
            index: 0,
            name: "Homepage",
            resultKey: "homepage-vision",
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "failure",
          },
          {
            index: 1,
            name: "Readme audit",
            resultKey: "readme-audit-expert",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            status: "success",
          },
          {
            index: 2,
            name: "Changelog audit",
            resultKey: "changelog-audit-expert",
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            status: "failure",
          },
        ],
      },
      {
        onlyFailed: true,
        entryNames: ["Readme audit"],
      },
    );

    expect(selected).toEqual({
      defaults: manifest.defaults,
      reviews: [
        { name: "Homepage", mode: "vision", target: "https://example.com" },
        { name: "Readme audit", target: "./README.md" },
        { name: "Changelog audit", target: "./CHANGELOG.md" },
      ],
    });
  });

  it("rejects ambiguous or empty summary-based rerun selections", () => {
    const manifest: BatchReviewManifest = {
      reviews: [
        { name: "Homepage", mode: "vision", target: "https://example.com" },
      ],
    };

    expect(() =>
      selectBatchReviewEntriesFromSummary(
        manifest,
        {
          manifestPath: "Local file path (.json file)",
          total: 1,
          succeeded: 1,
          failed: 0,
          results: [
            {
              index: 0,
              name: "Homepage",
              resultKey: "homepage-vision",
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "success",
            },
          ],
        },
        {},
      ),
    ).toThrow("--rerun-failed or --entry-name");

    expect(() =>
      selectBatchReviewEntriesFromSummary(
        manifest,
        {
          manifestPath: "Local file path (.json file)",
          total: 2,
          succeeded: 0,
          failed: 2,
          results: [
            {
              index: 0,
              name: "Homepage",
              resultKey: "homepage-vision",
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "failure",
            },
            {
              index: 0,
              name: "Homepage",
              resultKey: "homepage-vision",
              mode: "vision",
              targetSummary: "Remote URL (example.com)",
              status: "failure",
            },
          ],
        },
        { entryNames: ["Homepage"] },
      ),
    ).toThrow("ambiguous");
  });
});
