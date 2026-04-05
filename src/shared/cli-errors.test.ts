import { describe, expect, it, vi } from "vitest";
import { formatCliError, reportCliError } from "./cli-errors.js";

describe("formatCliError", () => {
  it("summarizes embedded remote URLs and omits raw stack output", () => {
    const error = new Error(
      "Request failed for https://example.com/private/reports?token=secret#hero",
    );
    error.stack = [
      "Error: Request failed for https://example.com/private/reports?token=secret#hero",
      "    at main (D:\\workspace\\private\\cli.ts:10:2)",
    ].join("\n");

    expect(formatCliError(error)).toBe(
      "Command failed: Error: Request failed for Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
  });

  it("summarizes string errors that contain local paths", () => {
    expect(
      formatCliError(
        'Failed to launch "C:\\Program Files\\Private Browser\\browser.exe"',
      ),
    ).toBe(
      'Command failed: Failed to launch "Local file path (.exe file)"',
    );
  });
});

describe("reportCliError", () => {
  it("emits only the sanitized summary", () => {
    const logger = { error: vi.fn() };

    reportCliError(
      new Error("Failed to open D:\\workspace\\private\\review.html"),
      logger,
    );

    expect(logger.error).toHaveBeenCalledWith(
      "Command failed: Error: Failed to open Local file path (.html file)",
    );
  });
});
