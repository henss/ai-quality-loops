import { describe, expect, it } from "vitest";
import {
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "./review-surface.js";

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

  it("scrubs embedded remote URLs and local paths from longer plain text", () => {
    expect(
      sanitizeReviewSurfaceValue(
        "Compare https://example.com/private/reports?token=secret with D:\\workspace\\private\\review.html",
      ),
    ).toBe(
      "Compare Remote URL (host: example.com, path segments: 2, query redacted) with Local file path (.html file)",
    );
  });

  it("scrubs embedded quoted local paths with spaces from longer plain text", () => {
    expect(
      sanitizeReviewSurfaceValue(
        'Open "D:\\Program Files\\Private Browser\\browser.exe" before loading "./private mocks/review page.html"',
      ),
    ).toBe(
      'Open "Local file path (.exe file)" before loading "Local file path (.html file)"',
    );
  });

  it("scrubs embedded unquoted local paths with spaces when a file extension is present", () => {
    expect(
      sanitizeReviewSurfaceValue(
        "Browser path D:\\Program Files\\Private Browser\\browser.exe failed while rendering /tmp/private mocks/review page.html",
      ),
    ).toBe(
      "Browser path Local file path (.exe file) failed while rendering Local file path (.html file)",
    );
  });
});

describe("summarizeReviewSurfaceError", () => {
  it("summarizes error messages without exposing raw URL query strings", () => {
    const error = new Error(
      "Request failed for https://example.com/private/reports?token=secret#hero",
    );

    expect(summarizeReviewSurfaceError(error)).toBe(
      "Error: Request failed for Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
  });

  it("summarizes error messages without exposing raw local file paths", () => {
    const error = new Error("Failed to open D:\\workspace\\private\\review.html");

    expect(summarizeReviewSurfaceError(error)).toBe(
      "Error: Failed to open Local file path (.html file)",
    );
  });

  it("summarizes error messages without exposing embedded quoted local paths with spaces", () => {
    const error = new Error(
      'Failed to launch "C:\\Program Files\\Private Browser\\browser.exe" for "D:\\private mocks\\review page.html"',
    );

    expect(summarizeReviewSurfaceError(error)).toBe(
      'Error: Failed to launch "Local file path (.exe file)" for "Local file path (.html file)"',
    );
  });

  it("handles non-error values generically", () => {
    expect(
      summarizeReviewSurfaceError({
        toString: () => "https://example.com/private?token=secret",
      }),
    ).toBe("Remote URL (host: example.com, path segments: 1, query redacted)");
    expect(summarizeReviewSurfaceError(undefined)).toBe("Unknown error");
  });
});
