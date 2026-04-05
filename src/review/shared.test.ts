import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  buildReviewEnvelope,
  loadPersonaPrompt,
  loadReviewContext,
  resolvePersonaName,
  resolvePromptLibraryPath,
  writeReviewOutput,
} from "./shared.js";

describe("Review shared utilities", () => {
  let tempDir: string;
  const previousPromptLibraryPath = process.env.PROMPT_LIBRARY_PATH;
  const previousContextPath = process.env.CONTEXT_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-review-test-"));
    delete process.env.PROMPT_LIBRARY_PATH;
    delete process.env.CONTEXT_PATH;
  });

  afterEach(async () => {
    if (previousPromptLibraryPath === undefined) {
      delete process.env.PROMPT_LIBRARY_PATH;
    } else {
      process.env.PROMPT_LIBRARY_PATH = previousPromptLibraryPath;
    }

    if (previousContextPath === undefined) {
      delete process.env.CONTEXT_PATH;
    } else {
      process.env.CONTEXT_PATH = previousContextPath;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("resolves built-in expert aliases before prompt lookup", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Critical review prompt",
      ].join("\n"),
    );

    const result = await loadPersonaPrompt({
      expert: "UI/UX",
      promptLibraryPath,
    });

    expect(result.personaName).toBe("SKEPTICAL UI/UX CRITIC");
    expect(result.personaPrompt).toContain("Critical review prompt");
  });

  it("prefers a cwd personas.md file when no explicit path is provided", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      [
        "### LLM COMMITTEE PERSONA: 2. CUSTOM REVIEWER",
        "Custom reviewer prompt",
      ].join("\n"),
    );

    expect(resolvePromptLibraryPath(undefined, tempDir)).toBe(promptLibraryPath);

    const result = await loadPersonaPrompt({
      expert: "CUSTOM REVIEWER",
      promptLibraryPath: promptLibraryPath,
    });

    expect(result.promptLibraryPath).toBe(promptLibraryPath);
  });

  it("loads context from disk and falls back to an empty object when missing", async () => {
    const contextPath = path.join(tempDir, "context.json");
    await fs.writeFile(contextPath, JSON.stringify({ project: "demo" }));

    await expect(loadReviewContext(contextPath, tempDir)).resolves.toEqual({
      project: "demo",
    });
    await expect(
      loadReviewContext(path.join(tempDir, "missing.json"), tempDir),
    ).resolves.toEqual({});
  });

  it("writes review output to nested paths using the current working directory", async () => {
    const writtenPath = await writeReviewOutput(
      "reviews/output.md",
      "hello",
      tempDir,
    );

    expect(writtenPath).toBe(path.join(tempDir, "reviews", "output.md"));
    await expect(fs.readFile(writtenPath, "utf-8")).resolves.toBe("hello");
  });

  it("allows explicit expert maps to override alias resolution", () => {
    expect(
      resolvePersonaName("Reviewer", {
        Reviewer: "MY CUSTOM REVIEWER",
      }),
    ).toBe("MY CUSTOM REVIEWER");
  });

  it("builds a reusable review envelope with generic sections", () => {
    const prompt = buildReviewEnvelope({
      personaPrompt: "You are a careful reviewer.",
      context: { project: "demo" },
      taskInstructions: "Inspect the supplied material.",
      sections: [
        {
          heading: "CONTENT TO REVIEW",
          body: "example payload",
          fenced: true,
        },
        {
          heading: "EVIDENCE",
          body: "image_01.png",
        },
      ],
    });

    expect(prompt).toContain("You are a careful reviewer.");
    expect(prompt).toContain("## CONTEXT\n{\n  \"project\": \"demo\"\n}");
    expect(prompt).toContain("## TASK\nInspect the supplied material.");
    expect(prompt).toContain("## CONTENT TO REVIEW\n---\nexample payload\n---");
    expect(prompt).toContain("## EVIDENCE\nimage_01.png");
    expect(prompt.endsWith("Provide your critical feedback in Markdown.")).toBe(
      true,
    );
  });
});
