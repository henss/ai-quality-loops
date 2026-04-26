import fs from "node:fs/promises";

import {
  parseStructuredReviewResult,
  type StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type {
  StructuredReviewDecisionVerdict,
  StructuredReviewNextStepAction,
} from "../contracts/structured-review-decision-contract.js";
import { resolveFromCwd } from "../shared/io.js";
import {
  evaluateReviewerCalibrationBenchmark,
  type ReviewerCalibrationBenchmarkCase,
  type ReviewerCalibrationBenchmarkReport,
  type ReviewerCalibrationGoldJudgment,
  type ReviewerCalibrationObservedRun,
} from "./reviewer-calibration-benchmark.js";

export interface ReviewerCalibrationBenchmarkRunInput {
  casesPath: string;
  goldJudgmentsPath: string;
  observedRunsPath: string;
  cwd?: string;
}

const REVIEW_SEVERITIES = Object.freeze([
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
] satisfies StructuredReviewSeverity[]);

const REVIEW_DECISION_VERDICTS = Object.freeze([
  "accept",
  "accept_with_follow_up",
  "changes_requested",
  "blocked",
] satisfies StructuredReviewDecisionVerdict[]);

const REVIEW_NEXT_STEP_ACTIONS = Object.freeze([
  "revise_artifact",
  "collect_more_evidence",
  "request_caller_review",
  "rerun_review",
  "track_follow_up",
] satisfies StructuredReviewNextStepAction[]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Calibration benchmark field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Calibration benchmark field "${fieldName}" must be an array of strings.`);
  }

  return value;
}

function readStringGroups(value: unknown, fieldName: string): string[][] {
  if (
    !Array.isArray(value) ||
    value.some(
      (group) =>
        !Array.isArray(group) || group.some((item) => typeof item !== "string"),
    )
  ) {
    throw new Error(
      `Calibration benchmark field "${fieldName}" must be an array of string arrays.`,
    );
  }

  return value;
}

function readVerdict(
  value: unknown,
  fieldName: string,
): StructuredReviewDecisionVerdict {
  if (!REVIEW_DECISION_VERDICTS.some((verdict) => verdict === value)) {
    throw new Error(
      `Calibration benchmark field "${fieldName}" must be a supported review verdict.`,
    );
  }

  return value as StructuredReviewDecisionVerdict;
}

function readNextStepActions(
  value: unknown,
  fieldName: string,
): StructuredReviewNextStepAction[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (action) =>
        !REVIEW_NEXT_STEP_ACTIONS.some((supportedAction) => supportedAction === action),
    )
  ) {
    throw new Error(
      `Calibration benchmark field "${fieldName}" must be an array of supported next-step actions.`,
    );
  }

  return value as StructuredReviewNextStepAction[];
}

function readSeverity(
  value: unknown,
  fieldName: string,
): StructuredReviewSeverity {
  if (!REVIEW_SEVERITIES.some((severity) => severity === value)) {
    throw new Error(
      `Calibration benchmark field "${fieldName}" must be a supported severity.`,
    );
  }

  return value as StructuredReviewSeverity;
}

function parseBenchmarkCase(
  value: unknown,
  index: number,
): ReviewerCalibrationBenchmarkCase {
  if (!isRecord(value)) {
    throw new Error(`Calibration benchmark case ${index + 1} must be a JSON object.`);
  }

  return {
    caseId: readRequiredString(value.caseId, `cases[${index}].caseId`),
    title: readRequiredString(value.title, `cases[${index}].title`),
    packetSummary: readRequiredString(
      value.packetSummary,
      `cases[${index}].packetSummary`,
    ),
    reviewerPrompt: readStringArray(
      value.reviewerPrompt,
      `cases[${index}].reviewerPrompt`,
    ),
  };
}

function parseGoldJudgment(
  value: unknown,
  index: number,
): ReviewerCalibrationGoldJudgment {
  if (!isRecord(value)) {
    throw new Error(
      `Calibration benchmark gold judgment ${index + 1} must be a JSON object.`,
    );
  }

  return {
    caseId: readRequiredString(value.caseId, `goldJudgments[${index}].caseId`),
    failureMode: readRequiredString(
      value.failureMode,
      `goldJudgments[${index}].failureMode`,
    ),
    expectedVerdict: readVerdict(
      value.expectedVerdict,
      `goldJudgments[${index}].expectedVerdict`,
    ),
    expectedFindingKeys: readStringArray(
      value.expectedFindingKeys,
      `goldJudgments[${index}].expectedFindingKeys`,
    ),
    expectedSignalGroups: readStringGroups(
      value.expectedSignalGroups,
      `goldJudgments[${index}].expectedSignalGroups`,
    ),
    expectedNextStepActions: readNextStepActions(
      value.expectedNextStepActions,
      `goldJudgments[${index}].expectedNextStepActions`,
    ),
    minimumSeverity: readSeverity(
      value.minimumSeverity,
      `goldJudgments[${index}].minimumSeverity`,
    ),
  };
}

function parseObservedRun(value: unknown, index: number): ReviewerCalibrationObservedRun {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error(
      `Calibration benchmark observed run ${index + 1} must include a results array.`,
    );
  }

  return {
    configurationId: readRequiredString(
      value.configurationId,
      `observedRuns[${index}].configurationId`,
    ),
    results: value.results.map((entry, resultIndex) => {
      if (!isRecord(entry)) {
        throw new Error(
          `Calibration benchmark observed result ${resultIndex + 1} in run ${index + 1} must be a JSON object.`,
        );
      }

      return {
        caseId: readRequiredString(
          entry.caseId,
          `observedRuns[${index}].results[${resultIndex}].caseId`,
        ),
        result: parseStructuredReviewResult(entry.result),
      };
    }),
  };
}

function parseCasesFixture(value: unknown): ReviewerCalibrationBenchmarkCase[] {
  if (!isRecord(value) || !Array.isArray(value.cases)) {
    throw new Error('Calibration benchmark cases fixture requires a "cases" array.');
  }

  return value.cases.map(parseBenchmarkCase);
}

function parseGoldFixture(value: unknown): ReviewerCalibrationGoldJudgment[] {
  if (!isRecord(value) || !Array.isArray(value.goldJudgments)) {
    throw new Error(
      'Calibration benchmark gold fixture requires a "goldJudgments" array.',
    );
  }

  return value.goldJudgments.map(parseGoldJudgment);
}

function parseObservedRunsFixture(value: unknown): ReviewerCalibrationObservedRun[] {
  if (!isRecord(value) || !Array.isArray(value.observedRuns)) {
    throw new Error(
      'Calibration benchmark observed-runs fixture requires an "observedRuns" array.',
    );
  }

  return value.observedRuns.map(parseObservedRun);
}

async function readJsonFile(filePath: string, cwd: string): Promise<unknown> {
  const resolvedPath = resolveFromCwd(filePath, cwd);
  const rawJson = await fs.readFile(resolvedPath, "utf-8");

  return JSON.parse(rawJson) as unknown;
}

export async function runReviewerCalibrationBenchmark(
  input: ReviewerCalibrationBenchmarkRunInput,
): Promise<ReviewerCalibrationBenchmarkReport> {
  const cwd = input.cwd ?? process.cwd();
  const [casesFixture, goldFixture, observedRunsFixture] = await Promise.all([
    readJsonFile(input.casesPath, cwd),
    readJsonFile(input.goldJudgmentsPath, cwd),
    readJsonFile(input.observedRunsPath, cwd),
  ]);

  return evaluateReviewerCalibrationBenchmark({
    cases: parseCasesFixture(casesFixture),
    goldJudgments: parseGoldFixture(goldFixture),
    observedRuns: parseObservedRunsFixture(observedRunsFixture),
  });
}
