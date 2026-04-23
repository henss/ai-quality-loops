import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseBatchReviewManifest, validateStructuredReviewResult } from "./json-contracts.js";
import {
  RECURRING_REVIEW_FAILURE_EVAL_CASES,
  evaluateRecurringReviewFailureHarness,
} from "../review/recurring-review-failure-eval.js";

const PUBLIC_SAFE_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "ops-",
  "company",
  "customer",
  "tenant",
  "employee",
  "https://",
  "d:\\",
  "/users/",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

describe("synthetic recurring review-failure eval public fixtures", () => {
  it("ships a runnable public-safe manifest and packet set", async () => {
    const manifestPath = path.join(
      process.cwd(),
      "examples/synthetic-recurring-review-failure-eval.manifest.json",
    );
    const manifestText = await fs.readFile(manifestPath, "utf-8");
    const manifest = parseBatchReviewManifest(JSON.parse(manifestText) as unknown);
    const contextText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-recurring-review-failure-eval-context.json",
      ),
      "utf-8",
    );

    expect(manifest.defaults).toEqual(
      expect.objectContaining({
        mode: "expert",
        expert: "Evidence Reviewer",
        contextPath: "./examples/synthetic-recurring-review-failure-eval-context.json",
      }),
    );
    expect(manifest.reviews).toHaveLength(4);

    const targetTexts = await Promise.all(
      manifest.reviews.map(async (review) =>
        fs.readFile(path.join(process.cwd(), review.target), "utf-8"),
      ),
    );

    expect(targetTexts[0]).toContain("missing-evidence-handle");
    expect(targetTexts[1]).toContain("stale-deterministic-input");
    expect(targetTexts[2]).toContain("command-noise-obscures-signal");
    expect(targetTexts[3]).toContain("verification-wrapper-mismatch");

    const serialized = [manifestText, contextText, ...targetTexts].join("\n").toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });

  it("ships a public-safe structured-results fixture that passes the harness", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-recurring-review-failure-eval-results.fixture.json",
        ),
        "utf-8",
      ),
    ) as {
      results?: Array<{
        caseId?: string;
        result?: unknown;
      }>;
    };

    expect(fixture.results).toHaveLength(4);

    const observedResults = (fixture.results ?? []).map((entry) => {
      const validation = validateStructuredReviewResult(entry.result);
      expect(validation.ok).toBe(true);
      if (!validation.ok) {
        throw validation.error;
      }

      return {
        caseId: entry.caseId ?? "",
        result: validation.value,
      };
    });

    const report = evaluateRecurringReviewFailureHarness({
      cases: RECURRING_REVIEW_FAILURE_EVAL_CASES,
      observedResults,
    });

    expect(report.status).toBe("passed");
    expect(report.failed).toBe(0);

    const serialized = JSON.stringify(fixture).toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });
});
