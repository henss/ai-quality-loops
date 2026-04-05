import { describe, expect, it } from "vitest";
import { sanitizeReviewSurfaceValue } from "./review-surface.js";

describe("sanitizeReviewSurfaceValue", () => {
  it("summarizes remote URLs without exposing query strings or fragments", () => {
    expect(
      sanitizeReviewSurfaceValue(
        "https://example.com/private/reports?token=secret#hero",
      ),
    ).toBe(
      "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
  });

  it("summarizes local file paths without exposing directory layout", () => {
    expect(
      sanitizeReviewSurfaceValue("D:\\workspace\\private\\mockups\\review.html"),
    ).toBe("Local file path (.html file)");
  });

  it("leaves short plain labels readable", () => {
    expect(sanitizeReviewSurfaceValue("section-hero")).toBe("section-hero");
  });

  it("truncates oversized plain labels", () => {
    expect(sanitizeReviewSurfaceValue("x".repeat(12), { maxLength: 5 })).toBe(
      "xxxxx... [truncated 7 chars]",
    );
  });
});
