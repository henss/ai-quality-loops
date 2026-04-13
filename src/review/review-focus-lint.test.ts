import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runReviewFocusLint } from "./review-focus-lint.js";

describe("review focus lint", () => {
  test("flags website UX drift terms in review artifacts", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-focus-lint-"));
    const reviewPath = path.join(dir, "review.md");
    fs.writeFileSync(reviewPath, "## Layout & Usability\nNavigation and CTA critique.", "utf8");

    const report = await runReviewFocusLint({
      paths: [reviewPath],
      forbiddenTerms: ["Layout & Usability", "Navigation", "CTA critique"]
    });

    expect(report.ok).toBe(false);
    expect(report.findings.map((finding) => finding.term)).toContain("Layout & Usability");
    expect(report.findings[0]?.classification).toBe("prompt_drift");
  });

  test("passes focused product-fit review text", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-focus-lint-pass-"));
    const reviewPath = path.join(dir, "review.md");
    fs.writeFileSync(reviewPath, "Material fit: beige chenille with compact dimensions.", "utf8");

    const report = await runReviewFocusLint({
      paths: [reviewPath],
      forbiddenTerms: ["Layout & Usability", "Navigation", "CTA"]
    });

    expect(report.ok).toBe(true);
    expect(report.scannedFiles).toBe(1);
  });
});
