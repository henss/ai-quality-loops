import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  formatTargetedVisionCaptureReferences,
  planVisionCaptures,
} from "./vision-capture-plan.js";

describe("planVisionCaptures", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  it("plans a full-page capture when no sections are provided", async () => {
    const plan = await planVisionCaptures({
      urlOrPath: "https://example.com",
    });

    expect(plan.captureMode).toBe("full-page");
    expect(plan.customCssRequested).toBe(false);
    expect(plan.customCssInjected).toBe(false);
    expect(plan.captures).toEqual([
      {
        label: "full",
        target: "https://example.com",
        width: 1280,
        height: 6000,
      },
    ]);

    await plan.cleanup();
  });

  it("reuses the prepared base target for section captures", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-plan-"));
    createdDirs.push(tempDir);
    const sourcePath = path.join(tempDir, "page.html");
    await fs.writeFile(sourcePath, "<html><body>Anchored</body></html>", "utf-8");

    const plan = await planVisionCaptures({
      urlOrPath: `${sourcePath}#stale-fragment`,
      sections: ["hero", "pricing"],
      customCss: "body { color: red; }",
      width: 1440,
      height: 900,
    });

    expect(plan.captureMode).toBe("targeted-sections");
    expect(plan.customCssRequested).toBe(true);
    expect(plan.customCssInjected).toBe(true);
    expect(plan.usesPreparedTarget).toBe(true);
    expect(plan.captures).toHaveLength(2);
    expect(plan.captures[0]).toMatchObject({
      label: "section-1",
      section: "hero",
      width: 1440,
      height: 900,
    });
    expect(plan.captures[0].target).toContain("#hero");
    expect(plan.captures[0].target.includes("#stale-fragment#hero")).toBe(false);
    expect(plan.captures[1].target).toContain("#pricing");

    await plan.cleanup();
    const preparedHtmlPath = plan.captures[0].target.split("#", 1)[0];
    await expect(fs.access(preparedHtmlPath)).rejects.toThrow();
  });

  it("surfaces when custom css was requested but could not be injected", async () => {
    const plan = await planVisionCaptures({
      urlOrPath: "https://example.com",
      customCss: "body { color: red; }",
      sections: ["hero"],
    });

    expect(plan.customCssRequested).toBe(true);
    expect(plan.customCssInjected).toBe(false);
    expect(plan.usesPreparedTarget).toBe(false);
    expect(plan.captures[0].target).toBe("https://example.com#hero");

    await plan.cleanup();
  });

  it("formats targeted capture references with labels and section ids", () => {
    expect(
      formatTargetedVisionCaptureReferences([
        {
          label: "section-1",
          section: "hero",
        },
        {
          label: "section-2",
          section: "pricing",
        },
      ]),
    ).toBe("section-1 (hero), section-2 (pricing)");
  });

  it("plans ordered targeted captures for the synthetic section stability benchmark", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "examples",
      "synthetic-section-stability-layout.html",
    );
    const sections = [
      "stability-overview",
      "stable-target-alpha",
      "stable-target-beta",
      "stability-summary",
    ];
    const plan = await planVisionCaptures({
      urlOrPath: fixturePath,
      sections,
      width: 1280,
      height: 720,
    });

    expect(plan.captureMode).toBe("targeted-sections");
    expect(plan.usesPreparedTarget).toBe(false);
    expect(plan.captures.map((capture) => capture.section)).toEqual(sections);
    expect(plan.captures.map((capture) => capture.label)).toEqual([
      "section-1",
      "section-2",
      "section-3",
      "section-4",
    ]);
    expect(plan.captures.map((capture) => capture.target)).toEqual(
      sections.map((section) => `${fixturePath}#${section}`),
    );

    await plan.cleanup();
  });
});
