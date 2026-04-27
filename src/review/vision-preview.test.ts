import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  formatVisionPreviewResult,
  runVisionPreview,
} from "./vision-preview.js";

const takeScreenshot = vi.hoisted(() => vi.fn());

vi.mock("../utils/screenshot.js", () => ({
  takeScreenshot,
}));

describe("runVisionPreview", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-preview-"));
    takeScreenshot.mockReset();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("captures the planned screenshots and reports the saved artifact paths", async () => {
    const sourcePath = path.join(tempDir, "page.html");
    const outputDir = path.join(tempDir, "artifacts");
    await fs.writeFile(sourcePath, "<html><body>Preview</body></html>", "utf-8");

    takeScreenshot.mockImplementation(async (_target: string, outputPath: string) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, "fake-image");
    });

    const result = await runVisionPreview({
      urlOrPath: sourcePath,
      sections: ["hero", "pricing"],
      customCss: "body { color: red; }",
      outputDir,
      outputFileStem: "homepage",
    });

    expect(result.captureMode).toBe("targeted-sections");
    expect(result.customCssRequested).toBe(true);
    expect(result.customCssInjected).toBe(true);
    expect(result.outputDir).toBe(outputDir);
    expect(result.screenshots).toHaveLength(2);
    expect(result.screenshots[0].outputPath).toBe(
      path.join(outputDir, "homepage-section-1-hero.png"),
    );
    expect(result.screenshots[1].outputPath).toBe(
      path.join(outputDir, "homepage-section-2-pricing.png"),
    );
    expect(takeScreenshot).toHaveBeenCalledTimes(2);

    const formatted = formatVisionPreviewResult(result);
    expect(formatted).toContain("Captured 2 preview screenshot(s)");
    expect(formatted).toContain("Custom CSS injected: yes");
    expect(formatted).toContain("homepage-section-1-hero.png");
  });

  it("previews the synthetic section stability benchmark with stable section artifact names", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "examples",
      "synthetic-section-stability-layout.html",
    );
    const outputDir = path.join(tempDir, "section-stability");
    const sections = [
      "stability-overview",
      "stable-target-alpha",
      "stable-target-beta",
      "stability-summary",
    ];

    takeScreenshot.mockImplementation(async (_target: string, outputPath: string) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, "fake-image");
    });

    const result = await runVisionPreview({
      urlOrPath: fixturePath,
      sections,
      width: 1280,
      height: 720,
      outputDir,
      outputFileStem: "synthetic-section-stability",
    });

    expect(result.captureMode).toBe("targeted-sections");
    expect(result.screenshots.map((screenshot) => path.basename(screenshot.outputPath))).toEqual([
      "synthetic-section-stability-section-1-stability-overview.png",
      "synthetic-section-stability-section-2-stable-target-alpha.png",
      "synthetic-section-stability-section-3-stable-target-beta.png",
      "synthetic-section-stability-section-4-stability-summary.png",
    ]);
    expect(takeScreenshot.mock.calls.map(([target]) => target)).toEqual(
      sections.map((section) => `${fixturePath}#${section}`),
    );
  });
});
