import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { BatchReviewArtifactSummary } from "../contracts/json-contracts.js";
import {
  compareBatchReviewRunLedgers,
  computeBatchReviewRunLedgerFingerprint,
  createBatchReviewRunLedger,
  deriveBatchReviewRunLedgerFixtureEntries,
  formatBatchReviewRunLedgerDiffReport,
  loadBatchReviewRunLedger,
  runBatchReviewRunLedgerDiff,
  writeBatchReviewRunLedger,
} from "./batch-review-run-ledger.js";

function createSummary(
  results: BatchReviewArtifactSummary["results"],
): BatchReviewArtifactSummary {
  return {
    manifestPath: "Local file path (.json file)",
    total: results.length,
    succeeded: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failure").length,
    results,
  };
}

describe("batch review run ledger", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-run-ledger-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates a stable fixture fingerprint from summary entry identity only", () => {
    const summary = createSummary([
      {
        index: 0,
        name: "Homepage",
        resultKey: "homepage-vision",
        mode: "vision",
        targetSummary: "Remote URL (example.com)",
        status: "success",
      },
      {
        index: 1,
        name: "Readme",
        resultKey: "readme-expert",
        mode: "expert",
        targetSummary: "Local file path (.md file)",
        status: "failure",
      },
    ]);

    const entries = deriveBatchReviewRunLedgerFixtureEntries(summary);
    const fingerprint = computeBatchReviewRunLedgerFingerprint(entries);

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).toBe(
      computeBatchReviewRunLedgerFingerprint([
        {
          index: 1,
          name: "Readme",
          resultKey: "readme-expert",
          mode: "expert",
          targetSummary: "Local file path (.md file)",
        },
        {
          index: 0,
          name: "Homepage",
          resultKey: "homepage-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
        },
      ]),
    );
  });

  it("writes and reloads a same-fixture run ledger", async () => {
    const summary = createSummary([
      {
        index: 0,
        name: "Homepage",
        resultKey: "homepage-vision",
        mode: "vision",
        targetSummary: "Remote URL (example.com)",
        status: "success",
      },
    ]);
    const ledger = createBatchReviewRunLedger(summary, {
      fixtureLabel: "Synthetic fixed pack",
      runLabel: "Baseline cohort",
    });
    const ledgerPath = path.join(tempDir, "baseline-ledger.json");

    await writeBatchReviewRunLedger(ledger, ledgerPath);
    const loaded = await loadBatchReviewRunLedger(ledgerPath);

    expect(loaded).toEqual(ledger);
  });

  it("compares two runs of the same fixture and formats a stable summary", async () => {
    const beforeLedgerPath = path.join(tempDir, "before-ledger.json");
    const afterLedgerPath = path.join(tempDir, "after-ledger.json");

    await writeBatchReviewRunLedger(
      createBatchReviewRunLedger(
        createSummary([
          {
            index: 0,
            name: "Homepage",
            resultKey: "homepage-vision",
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: {
              overallSeverity: "high",
              totalFindings: 2,
              findingCounts: {
                critical: 0,
                high: 1,
                medium: 0,
                low: 1,
                unknown: 0,
              },
            },
            ollamaTelemetry: {
              promptEvalCount: 120,
            },
          },
        ]),
        {
          fixtureLabel: "Synthetic fixed pack",
          runLabel: "Baseline cohort",
        },
      ),
      beforeLedgerPath,
    );

    await writeBatchReviewRunLedger(
      createBatchReviewRunLedger(
        createSummary([
          {
            index: 0,
            name: "Homepage",
            resultKey: "homepage-vision",
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: {
              overallSeverity: "medium",
              totalFindings: 1,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 1,
                low: 0,
                unknown: 0,
              },
            },
            ollamaTelemetry: {
              promptEvalCount: 100,
            },
          },
        ]),
        {
          fixtureLabel: "Synthetic fixed pack",
          runLabel: "Candidate cohort",
        },
      ),
      afterLedgerPath,
    );

    const report = await runBatchReviewRunLedgerDiff({
      beforePath: "./before-ledger.json",
      afterPath: "./after-ledger.json",
      cwd: tempDir,
    });

    expect(report.fixture.label).toBe("Synthetic fixed pack");
    expect(report.comparison.counts.totalFindingsDelta).toBe(-1);
    expect(report.comparison.counts.promptEvalCountDelta).toBe(-20);
    expect(formatBatchReviewRunLedgerDiffReport(report)).toBe([
      "Same-fixture batch review ledger diff completed.",
      `Fixture: Synthetic fixed pack; fingerprint=${report.fixture.fingerprint}; entries=1.`,
      "Before run: Baseline cohort (Local file path (.json file)).",
      "After run: Candidate cohort (Local file path (.json file)).",
      "Entries: before=1, after=1, matched=1, added=0, removed=0, statusChanged=0.",
      "Severity movement among matched entries: improved=1, regressed=0, unchanged=0, unavailable=0.",
      "Finding count delta: total=-1; critical=0, high=-1, medium=1, low=-1, unknown=0.",
      "Prompt eval count delta: total=-20; added=0; unavailable=0.",
    ].join("\n"));
  });

  it("rejects diffs when the ledger fixtures do not match", () => {
    const before = createBatchReviewRunLedger(
      createSummary([
        {
          index: 0,
          resultKey: "homepage-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com)",
          status: "success",
        },
      ]),
      {
        fixtureLabel: "Synthetic fixed pack",
      },
    );
    const after = createBatchReviewRunLedger(
      createSummary([
        {
          index: 0,
          resultKey: "pricing-vision",
          mode: "vision",
          targetSummary: "Remote URL (example.com/pricing)",
          status: "success",
        },
      ]),
      {
        fixtureLabel: "Different fixed pack",
      },
    );

    expect(() => compareBatchReviewRunLedgers({ before, after })).toThrow(
      "same fixture fingerprint",
    );
  });
});
