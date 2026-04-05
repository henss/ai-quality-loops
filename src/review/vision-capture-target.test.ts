import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { prepareVisionCaptureTarget } from "./vision-capture-target.js";

describe("prepareVisionCaptureTarget", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  it("returns the original target when no custom CSS is supplied", async () => {
    const prepared = await prepareVisionCaptureTarget("example.html");

    expect(prepared.target).toBe("example.html");
    await expect(prepared.cleanup()).resolves.toBeUndefined();
  });

  it("creates a temporary styled copy for local html paths without mutating the source", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-target-"));
    createdDirs.push(tempDir);
    const sourcePath = path.join(tempDir, "page.html");
    await fs.writeFile(sourcePath, "<html><head></head><body>Hello</body></html>", "utf-8");

    const prepared = await prepareVisionCaptureTarget(sourcePath, "body { color: red; }");

    expect(prepared.target).not.toBe(sourcePath);
    const sourceHtml = await fs.readFile(sourcePath, "utf-8");
    const preparedHtml = await fs.readFile(prepared.target, "utf-8");

    expect(sourceHtml).toBe("<html><head></head><body>Hello</body></html>");
    expect(preparedHtml).toContain('<style id="custom-vision-fix">');
    expect(preparedHtml).toContain("body { color: red; }");
    expect(preparedHtml).toContain("</head>");

    await prepared.cleanup();
    await expect(fs.access(prepared.target)).rejects.toThrow();
  });

  it("supports file URLs and injects the style block even when no head tag exists", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-target-"));
    createdDirs.push(tempDir);
    const sourcePath = path.join(tempDir, "fragment.html");
    await fs.writeFile(sourcePath, "<div>Preview</div>", "utf-8");

    const fileUrl = `file://${sourcePath.replace(/\\/g, "/")}`;
    const prepared = await prepareVisionCaptureTarget(fileUrl, ".card { display: none; }");
    const preparedHtml = await fs.readFile(prepared.target, "utf-8");

    expect(preparedHtml.startsWith('<style id="custom-vision-fix">')).toBe(true);
    expect(preparedHtml).toContain("<div>Preview</div>");

    await prepared.cleanup();
  });

  it("preserves hash fragments when rewriting a local html path", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-target-"));
    createdDirs.push(tempDir);
    const sourcePath = path.join(tempDir, "page.html");
    await fs.writeFile(sourcePath, "<html><body>Anchored</body></html>", "utf-8");

    const prepared = await prepareVisionCaptureTarget(
      `${sourcePath}#hero-section`,
      "body { outline: 1px solid red; }",
    );

    expect(prepared.target.endsWith("#hero-section")).toBe(true);
    const preparedHtmlPath = prepared.target.split("#", 1)[0];
    await expect(fs.readFile(preparedHtmlPath, "utf-8")).resolves.toContain(
      "outline: 1px solid red",
    );

    await prepared.cleanup();
    await expect(fs.access(preparedHtmlPath)).rejects.toThrow();
  });

  it("preserves hash fragments when rewriting a file url", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-vision-target-"));
    createdDirs.push(tempDir);
    const sourcePath = path.join(tempDir, "page.html");
    await fs.writeFile(sourcePath, "<html><body>Anchored</body></html>", "utf-8");

    const fileUrl = `file://${sourcePath.replace(/\\/g, "/")}#capture-target`;
    const prepared = await prepareVisionCaptureTarget(
      fileUrl,
      "body { background: black; }",
    );

    expect(prepared.target.endsWith("#capture-target")).toBe(true);
    const preparedHtmlPath = prepared.target.split("#", 1)[0];
    await expect(fs.readFile(preparedHtmlPath, "utf-8")).resolves.toContain(
      "background: black",
    );

    await prepared.cleanup();
  });
});
