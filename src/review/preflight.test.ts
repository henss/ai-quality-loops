import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatReviewPreflightSummary,
  runReviewPreflight,
} from "./preflight.js";

function createFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("review preflight", () => {
  let tempDir: string;
  const previousContextPath = process.env.CONTEXT_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-preflight-test-"));
    delete process.env.CONTEXT_PATH;
  });

  afterEach(async () => {
    if (previousContextPath === undefined) {
      delete process.env.CONTEXT_PATH;
    } else {
      process.env.CONTEXT_PATH = previousContextPath;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("passes when ollama, persona, browser, and context checks all resolve", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    const contextPath = path.join(tempDir, "context.json");
    const browserPath = path.join(tempDir, "browser.exe");
    await fs.writeFile(
      promptLibraryPath,
      "# CUSTOM REVIEWER\nEverything is fine.",
    );
    await fs.writeFile(contextPath, JSON.stringify({ project: "demo" }));
    await fs.writeFile(browserPath, "");

    const result = await runReviewPreflight({
      mode: "both",
      expert: "CUSTOM REVIEWER",
      expertModel: "qwen3.5:27b",
      visionModel: "qwen3-vl:30b",
      promptLibraryPath,
      contextPath,
      browserPath,
      fetchImpl: vi.fn().mockResolvedValue(
        createFetchResponse({
          models: [{ name: "qwen3.5:27b" }, { name: "qwen3-vl:30b" }],
        }),
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual([
      expect.objectContaining({ name: "ollama", status: "pass" }),
      expect.objectContaining({ name: "expert-model", status: "pass" }),
      expect.objectContaining({ name: "vision-model", status: "pass" }),
      expect.objectContaining({ name: "browser", status: "pass" }),
      expect.objectContaining({ name: "persona", status: "pass" }),
      expect.objectContaining({ name: "context", status: "pass" }),
    ]);
  });

  it("skips the browser check for expert-only preflight and skips missing default context", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      "# CUSTOM REVIEWER\nEverything is fine.",
    );

    const result = await runReviewPreflight({
      mode: "expert",
      expert: "CUSTOM REVIEWER",
      expertModel: "qwen3.5:27b",
      promptLibraryPath,
      fetchImpl: vi.fn().mockResolvedValue(
        createFetchResponse({
          models: [{ name: "qwen3.5:27b" }],
        }),
      ),
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "browser",
        status: "skip",
      }),
    );
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "context",
        status: "skip",
      }),
    );
  });

  it("fails ollama reachability and skips model validation when tags cannot be fetched", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      "# CUSTOM REVIEWER\nEverything is fine.",
    );

    const result = await runReviewPreflight({
      mode: "expert",
      expert: "CUSTOM REVIEWER",
      promptLibraryPath,
      fetchImpl: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1")),
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "ollama",
        status: "fail",
      }),
    );
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "expert-model",
        status: "skip",
      }),
    );
  });

  it("fails persona, browser, and invalid context checks with compact summaries", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    const contextPath = path.join(tempDir, "context.json");
    await fs.writeFile(promptLibraryPath, "# SOMEONE ELSE\nPrompt");
    await fs.writeFile(contextPath, "{not-json");

    const result = await runReviewPreflight({
      mode: "vision",
      expert: "CUSTOM REVIEWER",
      visionModel: "missing-vision-model",
      promptLibraryPath,
      contextPath,
      browserPath: path.join(tempDir, "missing-browser.exe"),
      fetchImpl: vi.fn().mockResolvedValue(
        createFetchResponse({
          models: [{ name: "other-model" }],
        }),
      ),
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "vision-model",
        status: "fail",
      }),
    );
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "browser",
        status: "fail",
      }),
    );
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "persona",
        status: "fail",
      }),
    );
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        name: "context",
        status: "fail",
      }),
    );

    expect(formatReviewPreflightSummary(result)).toContain(
      "Review preflight failed for vision mode.",
    );
  });
});
