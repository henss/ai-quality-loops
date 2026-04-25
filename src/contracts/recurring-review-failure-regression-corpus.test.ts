import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RECURRING_REVIEW_FAILURE_EVAL_CASES,
  type RecurringReviewFailureEvalCase,
} from "../review/recurring-review-failure-eval.js";

type RecurringReviewFailureRegressionCorpus = {
  reviewSurface?: string;
  purpose?: string;
  openQuestion?: string;
  cases?: Array<{
    caseId?: string;
    failureMode?: string;
    reviewName?: string;
    sanitizedPacketPath?: string;
    summary?: string;
    expectedFindingKeys?: string[];
    expectedSignalGroups?: string[][];
    expectedNextStepActions?: string[];
    minimumSeverity?: string;
    sanitizedExcerpt?: string;
  }>;
};

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

function toComparableShape(evalCase: RecurringReviewFailureEvalCase) {
  return {
    caseId: evalCase.caseId,
    failureMode: evalCase.failureMode,
    reviewName: evalCase.reviewName,
    summary: evalCase.summary,
    expectedFindingKeys: evalCase.requiredFindingKeys ?? [],
    expectedSignalGroups: evalCase.requiredSignalGroups ?? [],
    expectedNextStepActions: evalCase.requiredNextStepActions ?? [],
    minimumSeverity: evalCase.minimumSeverity,
  };
}

describe("synthetic process-failed peer-review regression corpus", () => {
  it("ships a public-safe corpus aligned to the recurring failure harness", async () => {
    const corpus = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json",
        ),
        "utf-8",
      ),
    ) as RecurringReviewFailureRegressionCorpus;

    expect(corpus.reviewSurface).toBe(
      "Synthetic process-failed peer-review regression corpus",
    );
    expect(corpus.purpose).toContain("Public-safe regression cases");
    expect(corpus.openQuestion).toContain("private packet assembly details");
    expect(corpus.cases).toHaveLength(RECURRING_REVIEW_FAILURE_EVAL_CASES.length);

    const comparableCases = (corpus.cases ?? []).map((corpusCase) => ({
      caseId: corpusCase.caseId,
      failureMode: corpusCase.failureMode,
      reviewName: corpusCase.reviewName,
      summary: corpusCase.summary,
      expectedFindingKeys: corpusCase.expectedFindingKeys ?? [],
      expectedSignalGroups: corpusCase.expectedSignalGroups ?? [],
      expectedNextStepActions: corpusCase.expectedNextStepActions ?? [],
      minimumSeverity: corpusCase.minimumSeverity,
    }));

    expect(comparableCases).toEqual(
      RECURRING_REVIEW_FAILURE_EVAL_CASES.map(toComparableShape),
    );

    for (const corpusCase of corpus.cases ?? []) {
      expect(corpusCase.sanitizedExcerpt).toBeTruthy();
      expect(corpusCase.sanitizedPacketPath).toBeTruthy();

      const packetText = await fs.readFile(
        path.join(process.cwd(), corpusCase.sanitizedPacketPath!),
        "utf-8",
      );

      const comparablePacketText = packetText.toLowerCase();
      expect(comparablePacketText).toContain(
        corpusCase.failureMode!.replace(/-/g, " ").toLowerCase(),
      );
      expect(comparablePacketText).toContain(
        corpusCase.expectedFindingKeys?.[0]?.toLowerCase() ?? "",
      );
    }

    const serialized = JSON.stringify(corpus).toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });
});
