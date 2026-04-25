import * as fs from "node:fs/promises";
import path from "node:path";
import { expect } from "vitest";
import { loadBatchReviewExecutionPlan } from "../review/batch-review.js";
import {
  defineReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
} from "../shared/review-surface.js";
import { parseBatchReviewManifest, validateStructuredReviewResult } from "./json-contracts.js";
import type { BatchReviewSummaryComparisonReport } from "./batch-review-summary-comparison-contract.js";

const PUBLIC_SAFE_EXAMPLE_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "format the sky",
  "ops-",
  "d:\\",
  "/users/",
  "https://",
  ".png",
  ".jpg",
  ".jpeg",
];

const PUBLIC_SAFE_FIXTURE_BLOCKLIST = [
  "stefan",
  "linear",
  "smartseer",
  "ops-",
  "customer",
  "tenant",
  "employee",
  "company",
  "https://",
  "d:\\",
  "/users/",
  ".png",
  ".jpg",
  ".jpeg",
];

const PRIVATE_HOME_DATA_BLOCKLIST = [
  "stefan",
  "bedroom",
  "kitchen",
  "bathroom",
  "living room",
  "latitude",
  "longitude",
  ".png",
  ".jpg",
  ".jpeg",
  "d:\\",
  "/users/",
];

type PublicSafeTextManifestExample = {
  manifestPath: string;
  contextPath: string;
  expert?: string;
  reviewName: string;
  reviewSurface: string;
  targetPath: string;
  targetSummary: string;
};

type PublicSafeStructuredReviewFixture = {
  fixturePath: string;
  workflow: "expert" | "vision";
  blockedTerms?: string[];
};

type PublicSafeRunnableManifestFixture = {
  manifestPath: string;
  expectedMode: "expert" | "vision";
  expectedExpert?: string;
  expectedContextPath?: string;
  expectedReviewName: string;
  expectedTargetPath: string;
  blockedTerms?: string[];
};

type DecisionSummaryInput = {
  verdict: "accept" | "accept_with_follow_up" | "changes_requested" | "blocked" | "process_failed";
  confidence: "low" | "medium" | "high";
  acceptedFindings: number;
  rejectedFindings: number;
};

type StructuredResultSummaryInput = {
  overallSeverity: "critical" | "high" | "medium" | "low" | "unknown";
  totalFindings: number;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  decision?: ReturnType<typeof createDecisionSummary>;
};

type CalibrationSnapshotInput = {
  decisionsWithConfidence: number;
  acceptedDecisions: number;
  rejectedDecisions: number;
  acceptedFindings: number;
  rejectedFindings: number;
  acceptedConfidence: ReturnType<typeof createConfidenceCounts>;
  rejectedConfidence: ReturnType<typeof createConfidenceCounts>;
};

type PolicyRedactionsFixture = {
  redactions?: Array<{
    pattern?: string;
    replacement?: string;
    sample?: string;
    expected?: string;
  }>;
};

export function createDecisionSummary(input: DecisionSummaryInput) {
  return { ...input };
}

export function createStructuredResultSummary(input: StructuredResultSummaryInput) {
  return input.decision ? { ...input, decision: input.decision } : { ...input };
}

export function createConfidenceCounts(low: number, medium: number, high: number) {
  return { low, medium, high };
}

export function createCalibrationSnapshot(input: CalibrationSnapshotInput) {
  return { ...input };
}

function expectSerializedToExcludeTerms(serialized: string, blockedTerms: string[]) {
  for (const blockedTerm of blockedTerms) {
    expect(serialized).not.toContain(blockedTerm);
  }
}

async function readJsonFixture(fixturePath: string) {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), fixturePath), "utf-8"),
  ) as unknown;
}

export async function expectPublicSafeTextManifestExample(
  example: PublicSafeTextManifestExample,
) {
  const manifestPath = path.join(process.cwd(), example.manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
  const parsed = parseBatchReviewManifest(manifest);
  const expert = example.expert ?? "UI/UX";

  expect(parsed.defaults).toEqual(
    expect.objectContaining({
      mode: "expert",
      expert,
      contextPath: example.contextPath,
    }),
  );
  expect(parsed.reviews).toEqual([
    expect.objectContaining({
      name: example.reviewName,
      target: example.targetPath,
    }),
  ]);

  const plan = await loadBatchReviewExecutionPlan({
    manifestPath,
    cwd: process.cwd(),
  });
  expect(plan.entries).toEqual([
    expect.objectContaining({
      mode: "expert",
      target: example.targetPath,
      targetSummary: example.targetSummary,
      contextPath: example.contextPath,
    }),
  ]);
  expect(plan.preflight.personaRequirements).toEqual([
    {
      expert,
      promptLibraryPath: undefined,
    },
  ]);
  expect(plan.preflight.contextPaths).toEqual([example.contextPath]);

  const contextPath = path.join(process.cwd(), example.contextPath);
  const targetPath = path.join(process.cwd(), example.targetPath);
  await expect(fs.access(contextPath)).resolves.toBeUndefined();
  await expect(fs.access(targetPath)).resolves.toBeUndefined();

  const context = JSON.parse(await fs.readFile(contextPath, "utf-8")) as {
    reviewFocus?: unknown;
    outOfScope?: unknown;
  };
  expect(context).toEqual(
    expect.objectContaining({
      reviewSurface: example.reviewSurface,
      reviewFocus: expect.any(Array),
      outOfScope: expect.any(Array),
    }),
  );

  const serialized = [
    JSON.stringify(manifest),
    JSON.stringify(context),
    await fs.readFile(targetPath, "utf-8"),
  ]
    .join("\n")
    .toLowerCase();
  expectSerializedToExcludeTerms(serialized, PUBLIC_SAFE_EXAMPLE_BLOCKLIST);
}

export async function expectPublicSafeStructuredReviewFixture(
  fixture: PublicSafeStructuredReviewFixture,
) {
  const parsedFixture = await readJsonFixture(fixture.fixturePath);
  const validation = validateStructuredReviewResult(parsedFixture);

  expect(validation).toEqual({
    ok: true,
    value: expect.objectContaining({
      workflow: fixture.workflow,
      provenance: expect.arrayContaining([
        expect.objectContaining({
          label: "Privacy boundary",
        }),
      ]),
    }),
  });

  const blockedTerms =
    fixture.blockedTerms ??
    (fixture.workflow === "vision"
      ? PRIVATE_HOME_DATA_BLOCKLIST
      : PUBLIC_SAFE_FIXTURE_BLOCKLIST);
  expectSerializedToExcludeTerms(
    JSON.stringify(parsedFixture).toLowerCase(),
    blockedTerms,
  );
}

export async function expectPublicSafeRunnableManifestFixture(
  fixture: PublicSafeRunnableManifestFixture,
) {
  const manifestPath = path.join(process.cwd(), fixture.manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
  const parsed = parseBatchReviewManifest(manifest);

  expect(parsed.defaults?.mode).toBe(fixture.expectedMode);
  if (fixture.expectedExpert) expect(parsed.defaults?.expert).toBe(fixture.expectedExpert);
  if (fixture.expectedContextPath) {
    expect(parsed.defaults?.contextPath).toBe(fixture.expectedContextPath);
  }
  expect(parsed.reviews[0]).toEqual(
    expect.objectContaining({
      name: fixture.expectedReviewName,
      target: fixture.expectedTargetPath,
    }),
  );

  if (!parsed.reviews[0]) throw new Error("Expected runnable manifest to contain a review entry.");

  const targetPath = path.join(process.cwd(), parsed.reviews[0].target);
  await expect(fs.access(targetPath)).resolves.toBeUndefined();

  const serializedParts = [JSON.stringify(manifest), await fs.readFile(targetPath, "utf-8")];
  if (fixture.expectedContextPath) {
    const contextPath = path.join(process.cwd(), fixture.expectedContextPath);
    await expect(fs.access(contextPath)).resolves.toBeUndefined();
    serializedParts.splice(1, 0, await fs.readFile(contextPath, "utf-8"));
  }

  expectSerializedToExcludeTerms(
    serializedParts.join("\n").toLowerCase(),
    fixture.blockedTerms ?? PUBLIC_SAFE_FIXTURE_BLOCKLIST,
  );
}

export async function expectPublicSafePolicyRedactionsFixture(fixturePath: string) {
  const fixture = (await readJsonFixture(fixturePath)) as PolicyRedactionsFixture;

  expect(fixture.redactions).toEqual(expect.any(Array));
  for (const redaction of fixture.redactions || []) {
    expect(typeof redaction.pattern).toBe("string");
    expect(typeof redaction.replacement).toBe("string");
    expect(typeof redaction.sample).toBe("string");
    expect(typeof redaction.expected).toBe("string");

    const redactions = defineReviewSurfaceRedactions([
      {
        pattern: new RegExp(redaction.pattern!, "g"),
        replacement: redaction.replacement!,
      },
    ]);

    expect(
      sanitizeReviewSurfaceValue(redaction.sample!, {
        extraRedactions: redactions,
      }),
    ).toBe(redaction.expected);
  }

  expectSerializedToExcludeTerms(
    JSON.stringify(fixture).toLowerCase(),
    PUBLIC_SAFE_FIXTURE_BLOCKLIST,
  );
}

export async function expectApartmentAgnosticVisionProbeManifest() {
  const manifestPath = path.join(
    process.cwd(),
    "examples/synthetic-zone-vision-probe.manifest.json",
  );
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as unknown;
  const parsed = parseBatchReviewManifest(manifest);

  expect(parsed.defaults?.mode).toBe("vision");
  expect(parsed.reviews[0]).toEqual(
    expect.objectContaining({
      name: "Synthetic zone overview",
      target: "./examples/synthetic-zone-layout.html",
      sections: ["overview", "zone-a", "zone-b", "boundary-note"],
    }),
  );

  if (!parsed.reviews[0]) {
    throw new Error("Expected the synthetic vision probe manifest to contain a review entry.");
  }

  const htmlPath = path.join(process.cwd(), parsed.reviews[0].target);
  await expect(fs.access(htmlPath)).resolves.toBeUndefined();

  expectSerializedToExcludeTerms(
    `${JSON.stringify(manifest)}\n${await fs.readFile(htmlPath, "utf-8")}`.toLowerCase(),
    [
      "stefan",
      "apartment",
      "bedroom",
      "kitchen",
      "bathroom",
      "living room",
      "resident",
      "latitude",
      "longitude",
      ".png",
      ".jpg",
      ".jpeg",
      "d:\\",
      "/users/",
    ],
  );
}

export function createBatchReviewSummaryComparisonFixture(): BatchReviewSummaryComparisonReport {
  return {
    inputs: {
      before: { pathLabel: "Local file path (.json file)" },
      after: { pathLabel: "Local file path (.json file)" },
    },
    comparison: {
      counts: {
        beforeEntries: 1,
        afterEntries: 1,
        added: 0,
        removed: 0,
        matched: 1,
        statusChanged: 0,
        severityMovement: {
          improved: 0,
          regressed: 1,
          unchanged: 0,
          unavailable: 0,
        },
        totalFindingsDelta: 1,
        findingCountDelta: {
          critical: 0,
          high: 1,
          medium: 0,
          low: 0,
          unknown: 0,
        },
        promptEvalCountDelta: 20,
        addedPromptEvalCount: 20,
        promptEvalCountUnavailable: 0,
      },
      calibration: {
        before: createCalibrationSnapshot({
          decisionsWithConfidence: 1,
          acceptedDecisions: 1,
          rejectedDecisions: 0,
          acceptedFindings: 1,
          rejectedFindings: 0,
          acceptedConfidence: createConfidenceCounts(0, 1, 0),
          rejectedConfidence: createConfidenceCounts(0, 0, 0),
        }),
        after: createCalibrationSnapshot({
          decisionsWithConfidence: 1,
          acceptedDecisions: 0,
          rejectedDecisions: 1,
          acceptedFindings: 0,
          rejectedFindings: 2,
          acceptedConfidence: createConfidenceCounts(0, 0, 0),
          rejectedConfidence: createConfidenceCounts(0, 0, 1),
        }),
        delta: {
          decisionsWithConfidence: 0,
          acceptedDecisions: -1,
          rejectedDecisions: 1,
          acceptedFindings: -1,
          rejectedFindings: 2,
          acceptedConfidence: createConfidenceCounts(0, -1, 0),
          rejectedConfidence: createConfidenceCounts(0, 0, 1),
        },
      },
      added: [],
      removed: [],
      changed: [
        {
          resultKey: "homepage-vision",
          before: {
            resultKey: "homepage-vision",
            index: 0,
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: createStructuredResultSummary({
              overallSeverity: "medium",
              totalFindings: 1,
              findingCounts: {
                critical: 0,
                high: 0,
                medium: 1,
                low: 0,
                unknown: 0,
              },
              decision: createDecisionSummary({
                verdict: "accept",
                confidence: "medium",
                acceptedFindings: 1,
                rejectedFindings: 0,
              }),
            }),
          },
          after: {
            resultKey: "homepage-vision",
            index: 0,
            mode: "vision",
            targetSummary: "Remote URL (example.com)",
            status: "success",
            structuredResult: createStructuredResultSummary({
              overallSeverity: "high",
              totalFindings: 2,
              findingCounts: {
                critical: 0,
                high: 1,
                medium: 1,
                low: 0,
                unknown: 0,
              },
              decision: createDecisionSummary({
                verdict: "changes_requested",
                confidence: "high",
                acceptedFindings: 0,
                rejectedFindings: 2,
              }),
            }),
          },
          statusChange: {
            before: "success",
            after: "success",
            changed: false,
          },
          severityChange: {
            before: "medium",
            after: "high",
            direction: "regressed",
          },
          totalFindingsDelta: 1,
          findingCountDelta: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            unknown: 0,
          },
        },
      ],
      unchanged: [],
    },
  };
}
