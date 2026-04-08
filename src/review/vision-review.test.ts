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
});
