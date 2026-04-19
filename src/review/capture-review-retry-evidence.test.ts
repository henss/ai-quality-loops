import { describe, expect, it } from "vitest";
import type {
  BatchReviewArtifactSummary,
  BatchReviewManifest,
} from "../contracts/json-contracts.js";
import {
  CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
  classifyCaptureReviewRetryEvidence,
} from "./capture-review-retry-evidence.js";

describe("classifyCaptureReviewRetryEvidence", () => {
  const manifest: BatchReviewManifest = {
    defaults: {
      mode: "vision",
      outputDir: "./reviews/capture-review",
      structuredOutputDir: "./reviews/capture-review/json",
    },
    reviews: [
      {
        name: "Capture 1",
        target: "./artifacts/captures/capture-1.png",
      },
      {
        name: "Capture 2",
        target: "./artifacts/captures/capture-2.png",
      },
    ],
  };

  const summary: BatchReviewArtifactSummary = {
    manifestPath: "Local file path (.json file)",
    total: 2,
    succeeded: 1,
    failed: 1,
    results: [
      {
        index: 0,
        name: "Capture 1",
        resultKey: "capture-1-vision",
        mode: "vision",
        targetSummary: "Local file path (.png file)",
        status: "failure",
        errorSummary: "Error: browser capture timed out",
      },
      {
        index: 1,
        name: "Capture 2",
        resultKey: "capture-2-vision",
        mode: "vision",
        targetSummary: "Local file path (.png file)",
        status: "success",
        structuredResult: {
          overallSeverity: "medium",
          totalFindings: 2,
          findingCounts: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 1,
            unknown: 0,
          },
        },
      },
    ],
  };

  it("classifies failed capture-review evidence as retry-ready when public-safe fields are confirmed", () => {
    const classification = classifyCaptureReviewRetryEvidence(manifest, summary, {
      selector: { kind: "failed-results" },
      genericity: CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
    });

    expect(classification.status).toBe("ready");
    expect(classification.counts).toEqual({
      ready: 1,
      incomplete: 0,
      rejected: 0,
    });
    expect(classification.selected).toEqual([
      expect.objectContaining({
        status: "ready",
        purpose: "recover-failed-review",
        index: 0,
        name: "Capture 1",
        resultKey: "capture-1-vision",
        targetSummary: "Local file path (.png file)",
        issues: [],
      }),
    ]);
  });

  it("classifies completed capture-review evidence as retry-ready when a structured rollup exists", () => {
    const classification = classifyCaptureReviewRetryEvidence(manifest, summary, {
      selector: { kind: "result-key", resultKey: "capture-2-vision" },
      genericity: CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
    });

    expect(classification.status).toBe("ready");
    expect(classification.selected[0]).toMatchObject({
      status: "ready",
      purpose: "recheck-completed-review",
      index: 1,
      name: "Capture 2",
      issues: [],
    });
  });

  it("keeps missing genericity confirmation incomplete instead of assuming public-boundary safety", () => {
    const classification = classifyCaptureReviewRetryEvidence(manifest, summary, {
      selector: { kind: "entry-name", name: "Capture 1" },
    });

    expect(classification.status).toBe("incomplete");
    expect(classification.selected[0].issues).toEqual([
      "targetReference genericity is not confirmed",
      "outputPaths genericity is not confirmed",
      "captureLabels genericity is not confirmed",
    ]);
    expect(classification.selected[0].name).toBeUndefined();
    expect(classification.selected[0].resultKey).toBeUndefined();
    expect(classification.selected[0].targetSummary).toBeUndefined();
  });

  it("rejects evidence when the caller marks a required evidence field as domain-specific", () => {
    const classification = classifyCaptureReviewRetryEvidence(manifest, summary, {
      selector: { kind: "entry-index", index: 0 },
      genericity: {
        ...CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
        captureLabels: "domain-specific",
      },
    });

    expect(classification.status).toBe("rejected");
    expect(classification.selected[0].issues).toContain(
      "captureLabels are not public-boundary safe",
    );
  });

  it("keeps unmatched selectors and missing retry rollups incomplete", () => {
    const unmatched = classifyCaptureReviewRetryEvidence(manifest, summary, {
      selector: { kind: "entry-name", name: "Capture 3" },
      genericity: CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
    });

    expect(unmatched.status).toBe("incomplete");
    expect(unmatched.selected[0].issues[0]).toContain("matched no prior summary results");

    const summaryWithoutRollup: BatchReviewArtifactSummary = {
      ...summary,
      results: [
        {
          ...summary.results[1],
          structuredResult: undefined,
        },
      ],
    };

    const missingRollup = classifyCaptureReviewRetryEvidence(
      { reviews: [manifest.reviews[1]], defaults: manifest.defaults },
      summaryWithoutRollup,
      {
        selector: { kind: "entry-index", index: 1 },
        genericity: CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY,
      },
    );

    expect(missingRollup.status).toBe("incomplete");
    expect(missingRollup.selected[0].issues).toContain(
      "summary result does not match a manifest entry",
    );
    expect(missingRollup.selected[0].issues).toContain(
      "completed summary result is missing a structured severity rollup",
    );
  });
});
