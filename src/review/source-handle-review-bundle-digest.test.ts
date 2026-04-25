import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import {
  parseBatchReviewArtifactSummary,
  validateBatchReviewArtifactSummary,
} from "../contracts/json-contracts.js";
import { formatSourceHandleReviewBundleDigest } from "./source-handle-review-bundle-digest.js";

describe("source handle review bundle digest", () => {
  it("formats a compact digest from a published batch summary", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-source-handle-review-bundle-summary.fixture.json",
        ),
        "utf-8",
      ),
    ) as unknown;
    const expectedDigest = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-source-handle-review-bundle-digest.md",
      ),
      "utf-8",
    );

    const validation = validateBatchReviewArtifactSummary(fixture);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      throw new Error(
        "Synthetic source-handle review bundle summary fixture must validate",
      );
    }

    expect(formatSourceHandleReviewBundleDigest(validation.value)).toBe(
      expectedDigest.trimEnd(),
    );
  });

  it("sanitizes unsanitized result labels and failure text in the digest", () => {
    const digest = formatSourceHandleReviewBundleDigest(
      parseBatchReviewArtifactSummary({
        manifestPath: "D:\\workspace\\private\\manifest.json",
        total: 1,
        succeeded: 0,
        failed: 1,
        results: [
          {
            index: 0,
            resultKey:
              "source:https://example.com/private/path?token=secret#fragment",
            mode: "expert",
            targetSummary:
              "Review D:\\workspace\\private\\bundle.md with reviewer@example.com",
            status: "failure",
            errorSummary:
              'Failed to load "D:\\workspace\\private\\artifact.md" from https://example.com/private/path?token=secret#fragment and notify reviewer@example.com',
          },
        ],
      }),
    );

    expect(digest).not.toContain("D:\\workspace\\private");
    expect(digest).not.toContain("token=secret");
    expect(digest).not.toContain("reviewer@example.com");
    expect(digest).toContain("Local file path (.md file)");
    expect(digest).toContain(
      "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
    expect(digest).toContain("Email address");
  });
});
