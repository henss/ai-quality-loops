import { describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { formatReviewFocusLintReport, runReviewFocusLint } from "./review-focus-lint.js";

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

  test("flags review text that explains internal value without concrete user benefit", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-focus-lint-relevance-"));
    const reviewPath = path.join(dir, "review.md");
    fs.writeFileSync(
      reviewPath,
      "## Summary\nThis creates a reusable helper and improves the architecture of the review loop.",
      "utf8",
    );

    const report = await runReviewFocusLint({
      paths: [reviewPath],
      forbiddenTerms: [],
      requireUserBenefit: true,
    });

    expect(report.ok).toBe(false);
    expect(report.findings).toMatchObject([
      {
        term: "user benefit",
        line: 1,
        classification: "missing_user_relevance",
      },
    ]);
    expect(formatReviewFocusLintReport(report)).toContain("Review focus lint: fail");
  });

  test("passes review text that states saved attention or decision support", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-focus-lint-relevance-pass-"));
    const reviewPath = path.join(dir, "review.md");
    fs.writeFileSync(
      reviewPath,
      "## Summary\nThis saves reviewer attention by catching low-value candidates before manual triage.",
      "utf8",
    );

    const report = await runReviewFocusLint({
      paths: [reviewPath],
      forbiddenTerms: [],
      requireUserBenefit: true,
    });

    expect(report.ok).toBe(true);
    expect(report.findings).toHaveLength(0);
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
