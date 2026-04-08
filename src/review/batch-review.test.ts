import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getLogger, setLogger, silentLogger } from "../shared/logger.js";
import type { ExpertReviewOptions } from "./expert-review.js";
import type { VisionReviewOptions } from "./vision-review.js";
import {
  formatBatchReviewSummary,
  loadBatchReviewManifest,
  normalizeBatchReviewManifest,
  runBatchReviewManifest,
  type BatchReviewManifest,
} from "./batch-review.js";

describe("batch review manifest", () => {
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

  it("loads a JSON manifest and applies defaults during normalization", async () => {
    const manifestPath = path.join(tempDir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          defaults: {
            mode: "vision",
            expert: "UI/UX",
            outputDir: "./reviews",
            width: 1440,
            height: 900,
            sections: ["hero"],
          },
          reviews: [
            {
              name: "Homepage hero",
              target: "https://example.com",
            },
            {
              mode: "expert",
              expert: "Efficiency",
              target: "./README.md",
              outputPath: "./reviews/readme-audit.md",
            },
          ],
        },
        null,
        2,
      ),
    );

    const manifest = await loadBatchReviewManifest(manifestPath, tempDir);
    const normalized = normalizeBatchReviewManifest(manifest, tempDir);

    expect(normalized).toEqual([
      {
        index: 0,
        name: "Homepage hero",
        mode: "vision",
        target: "https://example.com",
        expert: "UI/UX",
        model: undefined,
        outputPath: path.join(tempDir, "reviews", "homepage-hero-vision-review.md"),
        width: 1440,
        height: 900,
        sections: ["hero"],
        css: undefined,
        promptLibraryPath: undefined,
        contextPath: undefined,
        ollamaUrl: undefined,
      },
      {
        index: 1,
        name: undefined,
        mode: "expert",
        target: "./README.md",
        expert: "Efficiency",
        model: undefined,
        outputPath: path.join(tempDir, "reviews", "readme-audit.md"),
        width: 1440,
        height: 900,
        sections: ["hero"],
        css: undefined,
        promptLibraryPath: undefined,
        contextPath: undefined,
        ollamaUrl: undefined,
      },
    ]);
  });

  it("runs manifest entries sequentially through the existing expert and vision runners", async () => {
    const manifest: BatchReviewManifest = {
      defaults: {
        mode: "vision",
        expert: "UI/UX",
        outputDir: "./reviews",
      },
      reviews: [
        {
          name: "Homepage",
          target: "https://example.com",
          sections: ["hero", "pricing"],
        },
        {
          mode: "expert",
          expert: "Efficiency",
          target: "./README.md",
          outputPath: "./reviews/readme.md",
          model: "qwen3.5:32b",
        },
      ],
    };
    const manifestPath = path.join(tempDir, "manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const calls: string[] = [];
    const runVisionReviewImpl = vi.fn(async (_options: VisionReviewOptions) => {
      calls.push("vision");
      return "vision";
    });
    const runExpertReviewImpl = vi.fn(async (_options: ExpertReviewOptions) => {
      calls.push("expert");
      return "expert";
    });

    const summary = await runBatchReviewManifest({
      manifestPath,
      cwd: tempDir,
      runExpertReviewImpl,
      runVisionReviewImpl,
    });

    expect(calls).toEqual(["vision", "expert"]);
    expect(runVisionReviewImpl).toHaveBeenCalledWith({
      urlOrPath: "https://example.com",
      expert: "UI/UX",
      outputPath: path.join(tempDir, "reviews", "homepage-vision-review.md"),
      width: undefined,
      height: undefined,
      sections: ["hero", "pricing"],
      model: undefined,
      promptLibraryPath: undefined,
      contextPath: undefined,
      ollamaUrl: undefined,
      customCss: undefined,
    });
    expect(runExpertReviewImpl).toHaveBeenCalledWith({
      expert: "Efficiency",
      content: "./README.md",
      modelId: "qwen3.5:32b",
      outputPath: path.join(tempDir, "reviews", "readme.md"),
      promptLibraryPath: undefined,
      contextPath: undefined,
      ollamaUrl: undefined,
    });
    expect(summary.succeeded).toBe(2);
    expect(summary.failed).toBe(0);
  });

  it("captures failures in the summary and keeps later entries running", async () => {
    const manifestPath = path.join(tempDir, "manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          defaults: {
            mode: "expert",
            expert: "Efficiency",
          },
          reviews: [
            {
              name: "Broken file",
              target: "./missing.md",
            },
            {
              name: "Second file",
              target: "./README.md",
            },
          ],
        },
        null,
        2,
      ),
    );

    const runExpertReviewImpl = vi
      .fn(async (_options: ExpertReviewOptions) => "ok")
      .mockRejectedValueOnce(new Error("Failed to open D:\\workspace\\private\\missing.md"))
      .mockResolvedValueOnce("ok");

    const summary = await runBatchReviewManifest({
      manifestPath,
      cwd: tempDir,
      runExpertReviewImpl,
    });

    expect(runExpertReviewImpl).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({
      total: 2,
      succeeded: 1,
      failed: 1,
      results: [
        {
          name: "Broken file",
          status: "failure",
          errorSummary: "Error: Failed to open Local file path (.md file)",
        },
        {
          name: "Second file",
          status: "success",
        },
      ],
    });
    expect(formatBatchReviewSummary(summary)).toContain(
      "Batch review summary: 1 succeeded, 1 failed, 2 total.",
    );
  });

  it("requires a mode and expert persona for expert batch entries", () => {
    expect(() =>
      normalizeBatchReviewManifest({
        reviews: [
          {
            target: "./README.md",
          },
        ],
      }),
    ).toThrow('Set "defaults.mode" or "reviews[0].mode"');

    expect(() =>
      normalizeBatchReviewManifest({
        reviews: [
          {
            mode: "expert",
            target: "./README.md",
          },
        ],
      }),
    ).toThrow("requires an expert persona");
  });
});
