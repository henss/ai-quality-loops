import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLogger, setLogger, silentLogger } from "../shared/logger.js";

const callOllamaVision = vi.fn();
const imageToBase64 = vi.fn();
const takeScreenshot = vi.fn();

vi.mock("../shared/ollama.js", () => ({
  callOllamaVision,
  imageToBase64,
}));

vi.mock("../utils/screenshot.js", () => ({
  takeScreenshot,
}));

describe("runVisionReview", () => {
  let tempDir: string;
  const originalLogger = getLogger();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-review-"));
    setLogger(silentLogger);
    callOllamaVision.mockReset();
    imageToBase64.mockReset();
    takeScreenshot.mockReset();
  });

  afterEach(async () => {
    setLogger(originalLogger);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns a structured result with sanitized provenance for screenshot-backed reviews", async () => {
    const { runVisionReview } = await import("./vision-review.js");

    await fs.writeFile(
      path.join(tempDir, "personas.md"),
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Review like a skeptic.",
      ].join("\n"),
    );

    takeScreenshot.mockImplementation(async (_target: string, outputPath: string) => {
      await fs.writeFile(outputPath, "fake-image");
    });
    imageToBase64.mockResolvedValue("ZmFrZS1pbWFnZQ==");
    callOllamaVision.mockResolvedValue([
      "# Overview",
      "The page communicates the offer, but one medium-priority issue remains.",
      "",
      "## Findings",
      "- CTA hierarchy: Medium severity because the secondary action is visually louder than the primary action.",
    ].join("\n"));

    const result = await runVisionReview({
      urlOrPath: "https://example.com/private/page?token=secret#hero",
      expert: "UI/UX",
      structuredOutputPath: path.join(tempDir, "reviews", "vision.json"),
      promptLibraryPath: path.join(tempDir, "personas.md"),
      resultFormat: "structured",
    });

    expect(result).toMatchObject({
      workflow: "vision",
      expert: "SKEPTICAL UI/UX CRITIC",
      overallSeverity: "medium",
      provenance: [
        {
          label: "Source",
          value:
            "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
        },
        {
          label: "Attached image count",
          value: "1",
        },
        {
          label: "Capture mode",
          value: "full-page screenshot",
        },
      ],
      findings: [
        expect.objectContaining({
          title: "CTA hierarchy",
          severity: "medium",
        }),
      ],
    });

    await expect(
      fs.readFile(path.join(tempDir, "reviews", "vision.json"), "utf-8"),
    ).resolves.toContain('"workflow": "vision"');
    expect(takeScreenshot).toHaveBeenCalledTimes(1);
    expect(imageToBase64).toHaveBeenCalledTimes(1);
  });

  it("preserves targeted section identifiers in prompt-safe capture references", async () => {
    const { runVisionReview } = await import("./vision-review.js");

    await fs.writeFile(
      path.join(tempDir, "personas.md"),
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Review like a skeptic.",
      ].join("\n"),
    );

    takeScreenshot.mockImplementation(async (_target: string, outputPath: string) => {
      await fs.writeFile(outputPath, "fake-image");
    });
    imageToBase64.mockResolvedValue("ZmFrZS1pbWFnZQ==");
    callOllamaVision.mockResolvedValue([
      "# Overview",
      "The targeted sections reveal one medium-priority issue.",
      "",
      "## Findings",
      "- CTA hierarchy: Medium severity because the primary CTA styling is inconsistent between sections.",
    ].join("\n"));

    const result = await runVisionReview({
      urlOrPath: "https://example.com/private/page",
      expert: "UI/UX",
      sections: ["hero", "pricing-secret"],
      extraRedactions: [
        {
          pattern: /\bpricing-secret\b/g,
          replacement: "[Section redacted]",
        },
      ],
      promptLibraryPath: path.join(tempDir, "personas.md"),
      resultFormat: "structured",
    });

    expect(result.provenance).toContainEqual({
      label: "Captured section references",
      value: "section-1 (hero), section-2 ([Section redacted])",
    });

    expect(callOllamaVision).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "The screenshots focus on 2 explicitly targeted section(s): section-1 (hero), section-2 ([Section redacted]).",
        ),
      }),
    );
    expect(callOllamaVision).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Captured section references: section-1 (hero), section-2 ([Section redacted])",
        ),
      }),
    );
  });
});
