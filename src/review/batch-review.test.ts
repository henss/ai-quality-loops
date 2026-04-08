import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getLogger, setLogger, silentLogger } from "../shared/logger.js";
import type { ExpertReviewOptions } from "./expert-review.js";
import type { VisionReviewOptions } from "./vision-review.js";
import {
  createBatchReviewArtifactSummary,
  deriveBatchReviewPreflightOptions,
  formatBatchReviewSummary,
  formatBatchReviewArtifactSummary,
  loadBatchReviewManifest,
  normalizeBatchReviewManifest,
  runBatchReviewManifestPreflight,
  runBatchReviewManifest,
  type BatchReviewManifest,
  writeBatchReviewArtifactSummary,
} from "./batch-review.js";

function createFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

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
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          outputPath: "D:\\workspace\\private\\reviews\\homepage.md",
          status: "success",
        },
        {
          index: 1,
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
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          outputPath: "Local file path (.md file)",
          status: "success",
        },
        {
          index: 1,
          name: undefined,
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          status: "failure",
          errorSummary: "Error: Failed to open Local file path (.md file)",
        },
      ],
    });

    expect(JSON.parse(formatBatchReviewArtifactSummary({
      manifestPath: "D:\\workspace\\private\\manifest.json",
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    }))).toMatchObject({
      manifestPath: "Local file path (.json file)",
      total: 0,
    });
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
            mode: "expert",
            targetSummary: "Local file path (.md file)",
            outputPath: path.join(tempDir, "reviews", "readme.md"),
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
          mode: "expert",
          targetSummary: "Local file path (.md file)",
          outputPath: "Local file path (.md file)",
          status: "success",
        },
      ],
    });
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

  it("derives combined preflight requirements across manifest entries", () => {
    const preflight = deriveBatchReviewPreflightOptions([
      {
        index: 0,
        mode: "vision",
        target: "https://example.com",
        expert: "UI/UX",
        model: "qwen3-vl:30b",
        promptLibraryPath: "./personas-a.md",
        contextPath: "./context-a.json",
        ollamaUrl: "http://127.0.0.1:11434",
      },
      {
        index: 1,
        mode: "expert",
        target: "./README.md",
        expert: "Efficiency",
        model: "qwen3.5:32b",
        promptLibraryPath: "./personas-b.md",
        contextPath: "./context-b.json",
        ollamaUrl: "http://127.0.0.1:22434",
      },
      {
        index: 2,
        mode: "vision",
        target: "https://example.com/pricing",
        expert: "UI/UX",
        model: "qwen3-vl:30b",
        promptLibraryPath: "./personas-a.md",
        contextPath: "./context-a.json",
        ollamaUrl: "http://127.0.0.1:11434",
      },
    ]);

    expect(preflight).toEqual({
      mode: "both",
      personaRequirements: [
        { expert: "UI/UX", promptLibraryPath: "./personas-a.md" },
        { expert: "Efficiency", promptLibraryPath: "./personas-b.md" },
      ],
      modelRequirements: [
        {
          name: "expert-model",
          model: "qwen3.5:32b",
          ollamaUrl: "http://127.0.0.1:22434",
        },
        {
          name: "vision-model",
          model: "qwen3-vl:30b",
          ollamaUrl: "http://127.0.0.1:11434",
        },
      ],
      contextPaths: ["./context-a.json", "./context-b.json"],
    });
  });

  it("runs manifest preflight before execution using combined manifest requirements", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    const contextPath = path.join(tempDir, "context.json");
    const browserPath = path.join(tempDir, "browser.exe");
    const manifestPath = path.join(tempDir, "manifest.json");
    await fs.writeFile(
      promptLibraryPath,
      [
        "# SKEPTICAL UI/UX CRITIC",
        "Prompt",
        "",
        "# REPOSITORY & AI EFFICIENCY SPECIALIST",
        "Prompt",
      ].join("\n"),
    );
    await fs.writeFile(contextPath, JSON.stringify({ project: "demo" }));
    await fs.writeFile(browserPath, "");
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          defaults: {
            mode: "vision",
            expert: "UI/UX",
            promptLibraryPath,
            contextPath,
          },
          reviews: [
            {
              target: "https://example.com",
              model: "qwen3-vl:30b",
            },
            {
              mode: "expert",
              expert: "Efficiency",
              target: "./README.md",
              model: "qwen3.5:32b",
            },
          ],
        },
        null,
        2,
      ),
    );

    const result = await runBatchReviewManifestPreflight({
      manifestPath,
      cwd: tempDir,
      browserPath,
      fetchImpl: vi.fn().mockResolvedValue(
        createFetchResponse({
          models: [{ name: "qwen3-vl:30b" }, { name: "qwen3.5:32b" }],
        }),
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("both");
    expect(result.checks.filter((check) => check.name === "persona")).toHaveLength(2);
    expect(
      result.checks.filter((check) => check.name === "vision-model"),
    ).toHaveLength(1);
    expect(
      result.checks.filter((check) => check.name === "expert-model"),
    ).toHaveLength(1);
  });
});
