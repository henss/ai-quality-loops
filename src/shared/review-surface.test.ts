import { describe, expect, it } from "vitest";
import {
  defineReviewSurfaceRedactions,
  type ReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "./review-surface.js";

describe("defineReviewSurfaceRedactions", () => {
  it("returns a reusable copy of caller-provided rules", () => {
    const sourceRules = [
      {
        pattern: /\bacme-internal-\d+\b/g,
        replacement: "[Project identifier redacted]",
      },
    ];

    const reusableRules = defineReviewSurfaceRedactions(sourceRules);

    expect(reusableRules).toEqual(sourceRules);
    expect(reusableRules).not.toBe(sourceRules);
    expect(
      sanitizeReviewSurfaceValue("Escalate with tenant acme-internal-42", {
        extraRedactions: reusableRules,
      }),
    ).toBe("Escalate with tenant [Project identifier redacted]");
  });

  it("returns an immutable reusable bundle boundary", () => {
    const reusableRules = defineReviewSurfaceRedactions([
      {
        pattern: /\bacme-internal-\d+\b/g,
        replacement: "[Project identifier redacted]",
      },
    ]);

    expect(Object.isFrozen(reusableRules)).toBe(true);
    expect(Object.isFrozen(reusableRules[0])).toBe(true);
  });

  it("exposes the reusable bundle type as a readonly public boundary", () => {
    const reusableRules: ReviewSurfaceRedactions = defineReviewSurfaceRedactions([
      {
        pattern: /\bacme-internal-\d+\b/g,
        replacement: "[Project identifier redacted]",
      },
    ]);

    expect(
      sanitizeReviewSurfaceValue("Escalate with tenant acme-internal-42", {
        extraRedactions: reusableRules,
      }),
    ).toBe("Escalate with tenant [Project identifier redacted]");
  });
});

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

  it("can include the local filename while still hiding directory layout", () => {
    expect(
      sanitizeReviewSurfaceValue("D:\\workspace\\private\\mockups\\review.html", {
        includeFileName: true,
      }),
    ).toBe("Local file path (.html file, file: review.html)");
  });

  it("leaves short plain labels readable", () => {
    expect(sanitizeReviewSurfaceValue("section-hero")).toBe("section-hero");
  });

  it("summarizes raw email addresses and mailto links", () => {
    expect(sanitizeReviewSurfaceValue("reviewer@example.com")).toBe(
      "Email address",
    );
    expect(
      sanitizeReviewSurfaceValue(
        "mailto:reviewer@example.com?subject=Private%20Review",
      ),
    ).toBe("Email link (query redacted)");
  });

  it("summarizes direct data urls without exposing payloads", () => {
    expect(
      sanitizeReviewSurfaceValue("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"),
    ).toBe("Data URL (media type: image/png, base64 payload redacted)");
    expect(
      sanitizeReviewSurfaceValue("data:text/plain,private-review-notes"),
    ).toBe("Data URL (media type: text/plain, payload redacted)");
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

  it("scrubs embedded data urls from longer plain text", () => {
    expect(
      sanitizeReviewSurfaceValue(
        'Compare "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA" with data:text/plain,private-review-notes',
      ),
    ).toBe(
      'Compare "Data URL (media type: image/png, base64 payload redacted)" with Data URL (media type: text/plain, payload redacted)',
    );
  });

  it("scrubs embedded email addresses and mailto links from longer plain text", () => {
    expect(
      sanitizeReviewSurfaceValue(
        'Share findings with reviewer@example.com or "mailto:security@example.com?subject=private"',
      ),
    ).toBe(
      'Share findings with Email address or "Email link (query redacted)"',
    );
  });

  it("supports caller-provided extra redaction rules for project-local identifiers", () => {
    expect(
      sanitizeReviewSurfaceValue("Escalate with tenant acme-internal-42", {
        extraRedactions: [
          {
            pattern: /\bacme-internal-\d+\b/g,
            replacement: "[Project identifier redacted]",
          },
        ],
      }),
    ).toBe("Escalate with tenant [Project identifier redacted]");
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

  it("summarizes error messages without exposing email addresses", () => {
    const error = new Error(
      "Notify reviewer@example.com or mailto:security@example.com?subject=private",
    );

    expect(summarizeReviewSurfaceError(error)).toBe(
      "Error: Notify Email address or Email link (query redacted)",
    );
  });

  it("summarizes error messages without exposing data url payloads", () => {
    const error = new Error(
      "Inline evidence data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA failed validation",
    );

    expect(summarizeReviewSurfaceError(error)).toBe(
      "Error: Inline evidence Data URL (media type: image/png, base64 payload redacted) failed validation",
    );
  });

  it("applies caller-provided extra redaction rules to error summaries", () => {
    const error = new Error("Unknown tenant acme-internal-42 failed validation");

    expect(
      summarizeReviewSurfaceError(error, {
        extraRedactions: [
          {
            pattern: /\bacme-internal-\d+\b/g,
            replacement: "[Project identifier redacted]",
          },
        ],
      }),
    ).toBe(
      "Error: Unknown tenant [Project identifier redacted] failed validation",
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
