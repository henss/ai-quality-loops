import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  REVIEWER_CALIBRATION_BENCHMARK_CASES,
  REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
} from "../review/reviewer-calibration-benchmark.js";

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

describe("synthetic reviewer calibration benchmark public fixtures", () => {
  it("keeps prompt-only cases separate from withheld gold judgments", async () => {
    const casesText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.cases.json",
      ),
      "utf-8",
    );
    const goldText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.gold.json",
      ),
      "utf-8",
    );
    const casesFixture = JSON.parse(casesText) as { cases?: unknown };
    const goldFixture = JSON.parse(goldText) as { goldJudgments?: unknown };

    expect(casesFixture.cases).toEqual(REVIEWER_CALIBRATION_BENCHMARK_CASES);
    expect(goldFixture.goldJudgments).toEqual(
      REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
    );
    expect(casesText).not.toContain("goldJudgments");
    expect(goldText).not.toContain("packetSummary");

    const serialized = `${casesText}\n${goldText}`.toLowerCase();
    for (const blockedTerm of PUBLIC_SAFE_BLOCKLIST) {
      expect(serialized).not.toContain(blockedTerm);
    }
  });

  it("ships concise baseline scoring output shape", async () => {
    const expectedText = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-reviewer-calibration-benchmark.expected.md",
      ),
      "utf-8",
    );
    expect(expectedText).toContain(
      "Reviewer calibration benchmark: 2 configuration(s), 6 withheld-gold case(s).",
    );
    expect(expectedText).toContain(
      "- [passed] synthetic-local-reviewer: 30/30 (100%), 6 passed, 0 failed.",
    );
    expect(expectedText).toContain(
      "Highlight: missed verification signal obscured by command noise.",
    );
  });
});
