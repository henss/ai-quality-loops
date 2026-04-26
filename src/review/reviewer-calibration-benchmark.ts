import type {
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type {
  StructuredReviewDecisionVerdict,
  StructuredReviewNextStepAction,
} from "../contracts/structured-review-decision-contract.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface ReviewerCalibrationBenchmarkCase {
  caseId: string;
  title: string;
  packetSummary: string;
  reviewerPrompt: string[];
}

export interface ReviewerCalibrationGoldJudgment {
  caseId: string;
  failureMode: string;
  expectedVerdict: StructuredReviewDecisionVerdict;
  expectedFindingKeys: string[];
  expectedSignalGroups: string[][];
  expectedNextStepActions: StructuredReviewNextStepAction[];
  minimumSeverity: StructuredReviewSeverity;
}

export interface ReviewerCalibrationObservedResult {
  caseId: string;
  result: StructuredReviewResult;
}

export interface ReviewerCalibrationObservedRun {
  configurationId: string;
  results: ReadonlyArray<ReviewerCalibrationObservedResult>;
}

export interface ReviewerCalibrationCaseScore {
  caseId: string;
  failureMode: string;
  status: "passed" | "failed";
  score: number;
  maxScore: number;
  issues: string[];
}

export interface ReviewerCalibrationRunScore {
  configurationId: string;
  status: "passed" | "failed";
  score: number;
  maxScore: number;
  scorePercent: number;
  passedCases: number;
  failedCases: number;
  highlightedFailureMode?: string;
  caseScores: ReviewerCalibrationCaseScore[];
}

export interface ReviewerCalibrationBenchmarkReport {
  status: "passed" | "failed";
  caseCount: number;
  runScores: ReviewerCalibrationRunScore[];
}

function severityRank(severity: StructuredReviewSeverity): number {
  return REVIEW_SEVERITY_ORDER.indexOf(severity);
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#~]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSearchableText(result: StructuredReviewResult): string {
  return normalizeComparableText(
    [
      result.summary,
      result.markdown,
      ...result.findings.flatMap((finding) => [
        finding.key ?? "",
        finding.title,
        finding.summary,
        finding.recommendation ?? "",
        ...(finding.evidence ?? []),
      ]),
      result.decision?.summary ?? "",
      ...(result.decision?.required_before_merge ?? []),
      ...(result.decision?.follow_up ?? []),
      ...(result.decision?.next_step_actions ?? []),
    ].join("\n"),
  );
}

function hasAnySignal(searchableText: string, signals: string[]): boolean {
  return signals.some((signal) => {
    const normalizedSignal = normalizeComparableText(signal);
    return normalizedSignal.length > 0 && searchableText.includes(normalizedSignal);
  });
}

function createScoreCheck(passed: boolean, issue: string): {
  score: number;
  issue?: string;
} {
  return passed ? { score: 1 } : { score: 0, issue };
}

function scoreCase(input: {
  gold: ReviewerCalibrationGoldJudgment;
  observed?: StructuredReviewResult;
}): ReviewerCalibrationCaseScore {
  const { gold, observed } = input;

  if (!observed) {
    return {
      caseId: gold.caseId,
      failureMode: gold.failureMode,
      status: "failed",
      score: 0,
      maxScore: 5,
      issues: ["missing structured review result"],
    };
  }

  const issues: string[] = [];
  const findingKeys = new Set(
    observed.findings
      .map((finding) => normalizeComparableText(finding.key ?? ""))
      .filter(Boolean),
  );
  const missingFindingKeys = gold.expectedFindingKeys.filter(
    (key) => !findingKeys.has(normalizeComparableText(key)),
  );
  const searchableText = createSearchableText(observed);
  const missingSignalGroups = gold.expectedSignalGroups.filter(
    (signals) => !hasAnySignal(searchableText, signals),
  );
  const observedActions = new Set(observed.decision?.next_step_actions ?? []);
  const missingNextStepActions = gold.expectedNextStepActions.filter(
    (action) => !observedActions.has(action),
  );
  const checks = [
    createScoreCheck(
      observed.decision?.verdict === gold.expectedVerdict,
      `expected verdict ${gold.expectedVerdict}, observed ${observed.decision?.verdict ?? "missing"}`,
    ),
    createScoreCheck(
      severityRank(observed.overallSeverity) <= severityRank(gold.minimumSeverity),
      `expected severity at least ${gold.minimumSeverity}, observed ${observed.overallSeverity}`,
    ),
    createScoreCheck(
      missingFindingKeys.length === 0,
      `missing finding keys: ${missingFindingKeys.join(", ")}`,
    ),
    createScoreCheck(
      missingSignalGroups.length === 0,
      `missing signal groups: ${missingSignalGroups.map((group) => group.join(" | ")).join("; ")}`,
    ),
    createScoreCheck(
      missingNextStepActions.length === 0,
      `missing next-step actions: ${missingNextStepActions.join(", ")}`,
    ),
  ];

  const score = checks.reduce((sum, check) => sum + check.score, 0);
  issues.push(
    ...checks.flatMap((check) => (check.issue === undefined ? [] : [check.issue])),
  );

  return {
    caseId: gold.caseId,
    failureMode: gold.failureMode,
    status: issues.length === 0 ? "passed" : "failed",
    score,
    maxScore: 5,
    issues,
  };
}

export function evaluateReviewerCalibrationBenchmark(input: {
  cases: ReadonlyArray<ReviewerCalibrationBenchmarkCase>;
  goldJudgments: ReadonlyArray<ReviewerCalibrationGoldJudgment>;
  observedRuns: ReadonlyArray<ReviewerCalibrationObservedRun>;
}): ReviewerCalibrationBenchmarkReport {
  const caseIds = new Set(input.cases.map((benchmarkCase) => benchmarkCase.caseId));
  const goldJudgments = input.goldJudgments.filter((gold) => caseIds.has(gold.caseId));

  const runScores = input.observedRuns.map((run) => {
    const observedByCaseId = new Map(
      run.results.map((entry) => [entry.caseId, entry.result]),
    );
    const caseScores = goldJudgments.map((gold) =>
      scoreCase({
        gold,
        observed: observedByCaseId.get(gold.caseId),
      }),
    );
    const score = caseScores.reduce((sum, entry) => sum + entry.score, 0);
    const maxScore = caseScores.reduce((sum, entry) => sum + entry.maxScore, 0);
    const failedCases = caseScores.filter((entry) => entry.status === "failed").length;
    const firstFailure = caseScores.find((entry) => entry.status === "failed");

    return {
      configurationId: run.configurationId,
      status: failedCases === 0 ? "passed" : "failed",
      score,
      maxScore,
      scorePercent: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
      passedCases: caseScores.length - failedCases,
      failedCases,
      highlightedFailureMode: firstFailure?.failureMode,
      caseScores,
    } satisfies ReviewerCalibrationRunScore;
  });

  return {
    status: runScores.every((run) => run.status === "passed") ? "passed" : "failed",
    caseCount: goldJudgments.length,
    runScores,
  };
}

export function formatReviewerCalibrationBenchmarkReport(
  report: ReviewerCalibrationBenchmarkReport,
): string {
  const lines = [
    `Reviewer calibration benchmark: ${report.runScores.length} configuration(s), ${report.caseCount} withheld-gold case(s).`,
  ];

  for (const run of report.runScores) {
    const highlight = run.highlightedFailureMode
      ? ` Highlight: ${run.highlightedFailureMode}.`
      : "";
    lines.push(
      `- [${run.status}] ${run.configurationId}: ${run.score}/${run.maxScore} (${run.scorePercent}%), ${run.passedCases} passed, ${run.failedCases} failed.${highlight}`,
    );

    for (const caseScore of run.caseScores.filter(
      (entry) => entry.status === "failed",
    )) {
      lines.push(
        `  - ${caseScore.caseId}: ${caseScore.score}/${caseScore.maxScore} ${caseScore.failureMode}`,
      );
      lines.push(...caseScore.issues.map((issue) => `    - ${issue}`));
    }
  }

  return lines.join("\n");
}

export const REVIEWER_CALIBRATION_BENCHMARK_CASES = Object.freeze([
  {
    caseId: "missing-evidence-handle",
    title: "Missing evidence handle",
    packetSummary:
      "A review packet references an evidence label but does not include the source handle needed to verify it.",
    reviewerPrompt: [
      "Judge whether the packet is traceable.",
      "Flag any evidence boundary that prevents a caller from verifying the claim.",
    ],
  },
  {
    caseId: "stale-input-snapshot",
    title: "Stale input snapshot",
    packetSummary:
      "A packet relies on a deterministic input snapshot that is older than the latest generated status.",
    reviewerPrompt: [
      "Judge whether the packet uses current deterministic evidence.",
      "Call out stale baseline risk without inferring private workflow details.",
    ],
  },
  {
    caseId: "noisy-verification-log",
    title: "Noisy verification log",
    packetSummary:
      "A packet repeats failed command output until the actual verification result is hard to audit.",
    reviewerPrompt: [
      "Judge whether the verification evidence is concise enough to support the conclusion.",
      "Separate command noise from the real verification signal.",
    ],
  },
  {
    caseId: "wrapper-command-mismatch",
    title: "Wrapper command mismatch",
    packetSummary:
      "A verification wrapper claims one command was run, while the cited output shows a different command.",
    reviewerPrompt: [
      "Judge whether the wrapper and cited evidence support the same verification path.",
      "Escalate mismatches that make the result unauditable.",
    ],
  },
  {
    caseId: "summary-omits-regression",
    title: "Summary omits regression",
    packetSummary:
      "An outcome summary says the review surface is stable while omitting a regressed comparison signal.",
    reviewerPrompt: [
      "Judge whether the summary accounts for added, removed, or regressed review signals.",
      "Avoid accepting stability claims that omit material comparison evidence.",
    ],
  },
  {
    caseId: "gate-evidence-overclaim",
    title: "Gate evidence overclaim",
    packetSummary:
      "A packet claims readiness even though the gate result needed to defend that claim is absent.",
    reviewerPrompt: [
      "Judge whether readiness claims are backed by explicit gate evidence.",
      "Request caller review or more evidence when gate evidence is missing.",
    ],
  },
] satisfies ReadonlyArray<ReviewerCalibrationBenchmarkCase>);

export const REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS = Object.freeze([
  {
    caseId: "missing-evidence-handle",
    failureMode: "missed traceability gap",
    expectedVerdict: "accept_with_follow_up",
    expectedFindingKeys: ["missing-evidence-handle"],
    expectedSignalGroups: [["evidence handle", "source handle"], ["missing", "absent"]],
    expectedNextStepActions: ["collect_more_evidence"],
    minimumSeverity: "medium",
  },
  {
    caseId: "stale-input-snapshot",
    failureMode: "missed stale deterministic input",
    expectedVerdict: "accept_with_follow_up",
    expectedFindingKeys: ["stale-input-snapshot"],
    expectedSignalGroups: [["stale", "outdated"], ["snapshot", "baseline"]],
    expectedNextStepActions: ["collect_more_evidence", "track_follow_up"],
    minimumSeverity: "medium",
  },
  {
    caseId: "noisy-verification-log",
    failureMode: "missed verification signal obscured by command noise",
    expectedVerdict: "changes_requested",
    expectedFindingKeys: ["verification-log-noise"],
    expectedSignalGroups: [["command noise", "repeated command"], ["verification signal"]],
    expectedNextStepActions: ["revise_artifact"],
    minimumSeverity: "medium",
  },
  {
    caseId: "wrapper-command-mismatch",
    failureMode: "missed verification wrapper mismatch",
    expectedVerdict: "blocked",
    expectedFindingKeys: ["wrapper-command-mismatch"],
    expectedSignalGroups: [["wrapper", "verification wrapper"], ["mismatch", "different command"]],
    expectedNextStepActions: ["rerun_review", "request_caller_review"],
    minimumSeverity: "high",
  },
  {
    caseId: "summary-omits-regression",
    failureMode: "missed omitted regression signal",
    expectedVerdict: "changes_requested",
    expectedFindingKeys: ["summary-omits-regression"],
    expectedSignalGroups: [["regressed", "regression"], ["omits", "missing"]],
    expectedNextStepActions: ["revise_artifact", "collect_more_evidence"],
    minimumSeverity: "medium",
  },
  {
    caseId: "gate-evidence-overclaim",
    failureMode: "missed readiness overclaim without gate evidence",
    expectedVerdict: "blocked",
    expectedFindingKeys: ["gate-evidence-overclaim"],
    expectedSignalGroups: [["gate evidence", "gate result"], ["overclaim", "readiness"]],
    expectedNextStepActions: ["request_caller_review", "collect_more_evidence"],
    minimumSeverity: "high",
  },
] satisfies ReadonlyArray<ReviewerCalibrationGoldJudgment>);
