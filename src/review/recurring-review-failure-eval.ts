import type {
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { StructuredReviewNextStepAction } from "../contracts/structured-review-decision-contract.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export interface RecurringReviewFailureEvalCase {
  caseId: string;
  reviewName: string;
  failureMode: string;
  summary: string;
  requiredFindingKeys?: string[];
  requiredSignalGroups?: string[][];
  requiredNextStepActions?: StructuredReviewNextStepAction[];
  minimumSeverity?: StructuredReviewSeverity;
}

export interface RecurringReviewFailureEvalObservedResult {
  caseId: string;
  result: StructuredReviewResult;
}

export type RecurringReviewFailureReplayOutcome =
  | "caught"
  | "partial_miss"
  | "missed"
  | "overflagged";

export interface RecurringReviewFailureEvalReportEntry {
  caseId: string;
  reviewName: string;
  failureMode: string;
  status: "passed" | "failed";
  outcome: RecurringReviewFailureReplayOutcome;
  observedSeverity?: StructuredReviewSeverity;
  missingFindingKeys: string[];
  missingSignalGroups: string[][];
  missingNextStepActions: StructuredReviewNextStepAction[];
  issues: string[];
}

export interface RecurringReviewFailureEvalReport {
  status: "passed" | "failed";
  total: number;
  passed: number;
  failed: number;
  caught: number;
  partialMisses: number;
  missed: number;
  overflagged: number;
  results: RecurringReviewFailureEvalReportEntry[];
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
      ...result.provenance.flatMap((item) => [item.label, item.value]),
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

function hasSignal(searchableText: string, signal: string): boolean {
  const normalizedSignal = normalizeComparableText(signal);
  return normalizedSignal.length > 0 && searchableText.includes(normalizedSignal);
}

function buildEvaluationIssues(input: {
  evalCase: RecurringReviewFailureEvalCase;
  observedSeverity: StructuredReviewSeverity;
  missingFindingKeys: string[];
  missingSignalGroups: string[][];
  missingNextStepActions: StructuredReviewNextStepAction[];
}): string[] {
  const {
    evalCase,
    observedSeverity,
    missingFindingKeys,
    missingSignalGroups,
    missingNextStepActions,
  } = input;
  const issues: string[] = [];

  if (
    evalCase.minimumSeverity &&
    severityRank(observedSeverity) > severityRank(evalCase.minimumSeverity)
  ) {
    issues.push(
      `overall severity ${observedSeverity} is lower than required ${evalCase.minimumSeverity}`,
    );
  }

  if (missingFindingKeys.length > 0) {
    issues.push(`missing finding keys: ${missingFindingKeys.join(", ")}`);
  }

  if (missingSignalGroups.length > 0) {
    issues.push(
      `missing signal groups: ${missingSignalGroups.map((group) => group.join(" | ")).join("; ")}`,
    );
  }

  if (missingNextStepActions.length > 0) {
    issues.push(`missing next-step actions: ${missingNextStepActions.join(", ")}`);
  }

  return issues;
}

function classifyReplayOutcome(input: {
  issues: string[];
  requiredFindingKeys?: readonly string[];
  missingFindingKeys: readonly string[];
}): RecurringReviewFailureReplayOutcome {
  const requiredFindingKeys = input.requiredFindingKeys ?? [];

  if (input.issues.length === 0) {
    return "caught";
  }

  if (
    requiredFindingKeys.length > 0 &&
    input.missingFindingKeys.length === requiredFindingKeys.length
  ) {
    return "missed";
  }

  return "partial_miss";
}

function evaluateCase(input: {
  evalCase: RecurringReviewFailureEvalCase;
  observed?: StructuredReviewResult;
}): RecurringReviewFailureEvalReportEntry {
  const { evalCase, observed } = input;

  if (!observed) {
    return {
      caseId: evalCase.caseId,
      reviewName: evalCase.reviewName,
      failureMode: evalCase.failureMode,
      status: "failed",
      outcome: "missed",
      missingFindingKeys: [...(evalCase.requiredFindingKeys ?? [])],
      missingSignalGroups: [...(evalCase.requiredSignalGroups ?? [])],
      missingNextStepActions: [...(evalCase.requiredNextStepActions ?? [])],
      issues: ["no structured review result was provided for this eval case"],
    };
  }

  const findingKeys = new Set(
    observed.findings
      .map((finding) => normalizeComparableText(finding.key ?? ""))
      .filter(Boolean),
  );
  const searchableText = createSearchableText(observed);
  const nextStepActions = new Set(observed.decision?.next_step_actions ?? []);
  const missingFindingKeys = (evalCase.requiredFindingKeys ?? []).filter(
    (key) => !findingKeys.has(normalizeComparableText(key)),
  );
  const missingSignalGroups = (evalCase.requiredSignalGroups ?? []).filter(
    (signals) => !signals.some((signal) => hasSignal(searchableText, signal)),
  );
  const missingNextStepActions = (evalCase.requiredNextStepActions ?? []).filter(
    (action) => !nextStepActions.has(action),
  );
  const issues = buildEvaluationIssues({
    evalCase,
    observedSeverity: observed.overallSeverity,
    missingFindingKeys,
    missingSignalGroups,
    missingNextStepActions,
  });
  const outcome = classifyReplayOutcome({
    issues,
    requiredFindingKeys: evalCase.requiredFindingKeys,
    missingFindingKeys,
  });

  return {
    caseId: evalCase.caseId,
    reviewName: evalCase.reviewName,
    failureMode: evalCase.failureMode,
    status: issues.length === 0 ? "passed" : "failed",
    outcome,
    observedSeverity: observed.overallSeverity,
    missingFindingKeys,
    missingSignalGroups,
    missingNextStepActions,
    issues,
  };
}

export function evaluateRecurringReviewFailureHarness(input: {
  cases: ReadonlyArray<RecurringReviewFailureEvalCase>;
  observedResults: ReadonlyArray<RecurringReviewFailureEvalObservedResult>;
}): RecurringReviewFailureEvalReport {
  const observedByCaseId = new Map(
    input.observedResults.map((entry) => [entry.caseId, entry.result]),
  );
  const results = input.cases.map((evalCase) =>
    evaluateCase({
      evalCase,
      observed: observedByCaseId.get(evalCase.caseId),
    }),
  );
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.length - passed;
  const caught = results.filter((result) => result.outcome === "caught").length;
  const partialMisses = results.filter(
    (result) => result.outcome === "partial_miss",
  ).length;
  const missed = results.filter((result) => result.outcome === "missed").length;
  const overflagged = results.filter(
    (result) => result.outcome === "overflagged",
  ).length;

  return {
    status: failed > 0 ? "failed" : "passed",
    total: results.length,
    passed,
    failed,
    caught,
    partialMisses,
    missed,
    overflagged,
    results,
  };
}

export function formatRecurringReviewFailureHarnessReport(
  report: RecurringReviewFailureEvalReport,
): string {
  const lines = [
    `Recurring review-failure eval: ${report.passed} passed, ${report.failed} failed, ${report.total} total.`,
    `Replay outcomes: ${report.caught} caught, ${report.partialMisses} partial misses, ${report.missed} missed, ${report.overflagged} overflagged.`,
  ];

  for (const result of report.results) {
    const suffix =
      result.issues.length > 0 ? ` -> ${result.issues.join("; ")}` : "";
    lines.push(
      `- [${result.status}/${result.outcome}] ${result.reviewName}: ${result.failureMode}${suffix}`,
    );
  }

  return lines.join("\n");
}

export const RECURRING_REVIEW_FAILURE_EVAL_CASES = Object.freeze([
  {
    caseId: "missing-evidence-handles",
    reviewName: "Recurring failure eval - missing evidence handles",
    failureMode: "missing evidence handles",
    summary:
      "Reviewer should flag unresolved or opaque evidence handles instead of treating the packet as traceable.",
    requiredFindingKeys: ["missing-evidence-handle"],
    requiredSignalGroups: [
      ["evidence handle", "source handle"],
      ["missing", "opaque", "unresolved"],
    ],
    requiredNextStepActions: ["collect_more_evidence"],
    minimumSeverity: "medium",
  },
  {
    caseId: "stale-deterministic-inputs",
    reviewName: "Recurring failure eval - stale deterministic inputs",
    failureMode: "stale deterministic inputs",
    summary:
      "Reviewer should call out stale or drifted deterministic inputs before treating a packet as current.",
    requiredFindingKeys: ["stale-deterministic-input"],
    requiredSignalGroups: [
      ["stale", "outdated", "drift"],
      ["deterministic input", "snapshot", "baseline"],
    ],
    requiredNextStepActions: ["collect_more_evidence", "track_follow_up"],
    minimumSeverity: "medium",
  },
  {
    caseId: "repeated-command-noise",
    reviewName: "Recurring failure eval - repeated command noise",
    failureMode: "repeated command noise",
    summary:
      "Reviewer should flag command-log repetition that obscures the real verification signal.",
    requiredFindingKeys: ["command-noise-obscures-signal"],
    requiredSignalGroups: [
      ["command noise", "repeated command", "log spam"],
      ["signal", "verification evidence", "concise evidence"],
    ],
    requiredNextStepActions: ["revise_artifact"],
    minimumSeverity: "medium",
  },
  {
    caseId: "verification-wrapper-mismatch",
    reviewName: "Recurring failure eval - verification wrapper mismatch",
    failureMode: "verification-wrapper mismatch",
    summary:
      "Reviewer should catch when the wrapper claims one verification path but the cited command or output proves another.",
    requiredFindingKeys: ["verification-wrapper-mismatch"],
    requiredSignalGroups: [
      ["verification wrapper", "wrapper"],
      ["mismatch", "misaligned", "different command"],
    ],
    requiredNextStepActions: ["rerun_review", "request_caller_review"],
    minimumSeverity: "medium",
  },
  {
    caseId: "launch-evidence-regression-omission",
    reviewName: "Recurring failure eval - launch evidence regression omission",
    failureMode: "launch evidence regression omission",
    summary:
      "Reviewer should catch when a launch-outcome evidence note omits added, removed, or regressed review signals and still claims stability.",
    requiredFindingKeys: ["launch-evidence-regression-omission"],
    requiredSignalGroups: [
      ["launch outcome evidence", "evidence summary", "launch evidence note"],
      ["added", "removed", "regressed", "severity movement"],
      ["omitted", "omits", "omitting", "missing", "claims stability", "stability claim"],
    ],
    requiredNextStepActions: ["revise_artifact", "collect_more_evidence"],
    minimumSeverity: "medium",
  },
  {
    caseId: "launch-evidence-gate-overclaim",
    reviewName: "Recurring failure eval - launch evidence gate overclaim",
    failureMode: "launch evidence gate overclaim",
    summary:
      "Reviewer should reject launch-evidence notes that imply threshold pass or defended readiness when gate evidence was not provided.",
    requiredFindingKeys: ["launch-evidence-gate-overclaim"],
    requiredSignalGroups: [
      ["gate result", "gate evidence", "threshold"],
      ["not provided", "missing", "absent", "lacks", "without"],
      ["launch readiness", "defended", "overclaim"],
    ],
    requiredNextStepActions: ["request_caller_review", "collect_more_evidence"],
    minimumSeverity: "high",
  },
  {
    caseId: "bundle-truncation-hides-signals",
    reviewName: "Recurring failure eval - bundle truncation hides signals",
    failureMode: "bundle truncation hides signals",
    summary:
      "Reviewer should catch when a truncated review bundle hides material findings while the wrapper treats the shortened packet as complete.",
    requiredFindingKeys: ["bundle-truncation-hides-signals"],
    requiredSignalGroups: [
      ["bundle truncation", "truncated bundle", "truncated review bundle"],
      ["hidden", "omitted", "missing"],
      ["review signal", "evidence signal", "material finding"],
    ],
    requiredNextStepActions: ["collect_more_evidence", "revise_artifact"],
    minimumSeverity: "medium",
  },
  {
    caseId: "source-audit-evidence-path-gap",
    reviewName: "Recurring failure eval - source audit evidence path gap",
    failureMode: "source-audit evidence-path gap",
    summary:
      "Reviewer should flag when a source audit references evidence without a resolvable sanitized evidence path or caller-owned retrieval note.",
    requiredFindingKeys: ["source-audit-evidence-path-gap"],
    requiredSignalGroups: [
      ["source audit", "source-audit", "audit"],
      ["evidence path", "evidence-path", "source path"],
      ["missing", "unresolved", "not provided"],
    ],
    requiredNextStepActions: ["collect_more_evidence", "request_caller_review"],
    minimumSeverity: "medium",
  },
  {
    caseId: "unclassified-runtime-stderr",
    reviewName: "Recurring failure eval - unclassified runtime stderr",
    failureMode: "unclassified runtime stderr",
    summary:
      "Reviewer should flag runtime stderr that is recorded without an interpretation of whether it is expected, harmless, or blocking.",
    requiredFindingKeys: ["unclassified-runtime-stderr"],
    requiredSignalGroups: [
      ["runtime stderr", "stderr"],
      ["unclassified", "uninterpreted", "unresolved"],
      ["expected", "harmless", "blocking"],
    ],
    requiredNextStepActions: ["rerun_review", "request_caller_review"],
    minimumSeverity: "medium",
  },
] satisfies ReadonlyArray<RecurringReviewFailureEvalCase>);
