import type {
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { ReviewSurfaceRedactions } from "../shared/review-surface.js";
import {
  sanitizeStructuredReviewDecision,
  sanitizeStructuredReviewFinding,
  sanitizeStructuredReviewProvenance,
  sanitizeStructuredReviewText,
} from "./structured-review-result-sanitizer.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

const DEFAULT_FINDING_LIMIT = 3;
const DEFAULT_PROVENANCE_LIMIT = 3;
const DEFAULT_QUESTION_LIMIT = 4;
const DEFAULT_INCLUDED_SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
];

export interface FormatReviewSponsorMemoOptions {
  title?: string;
  sourceLabel?: string;
  maxFindingNotes?: number;
  maxProvenanceNotes?: number;
  maxOpenQuestions?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

function compareSeverity(
  left: StructuredReviewSeverity,
  right: StructuredReviewSeverity,
): number {
  return REVIEW_SEVERITY_ORDER.indexOf(left) - REVIEW_SEVERITY_ORDER.indexOf(right);
}

function prioritizeFindings(
  result: StructuredReviewResult,
  extraRedactions?: ReviewSurfaceRedactions,
): StructuredReviewFinding[] {
  const options = { extraRedactions };
  if (result.decision) {
    const decision = sanitizeStructuredReviewDecision(result.decision, options);
    return [...decision.blocking_findings, ...decision.non_blocking_findings].filter((finding) =>
      DEFAULT_INCLUDED_SEVERITIES.includes(finding.severity),
    );
  }

  return result.findings
    .map((finding) => sanitizeStructuredReviewFinding(finding, options))
    .filter((finding) => DEFAULT_INCLUDED_SEVERITIES.includes(finding.severity))
    .sort((left, right) => compareSeverity(left.severity, right.severity));
}

function formatSponsorPosture(result: StructuredReviewResult): string {
  const decision = result.decision;
  if (decision) {
    switch (decision.verdict) {
      case "accept":
        return "Sponsor posture: approve as reviewed.";
      case "accept_with_follow_up":
        return "Sponsor posture: approve, but keep the listed follow-up work visible until it closes.";
      case "changes_requested":
        return "Sponsor posture: hold sponsorship until the requested changes are complete.";
      case "blocked":
        return decision.blocking
          ? "Sponsor posture: pause sponsorship and request caller review before proceeding."
          : "Sponsor posture: pause sponsorship until the missing evidence is collected.";
      case "process_failed":
        return "Sponsor posture: do not sponsor yet; rerun or repair the review first.";
    }
  }

  switch (result.overallSeverity) {
    case "critical":
    case "high":
      return "Sponsor posture: hold sponsorship until the highest-severity findings are addressed or explicitly accepted by the caller.";
    case "medium":
      return "Sponsor posture: sponsor only with explicit follow-up ownership for the remaining findings.";
    case "low":
      return "Sponsor posture: sponsorship can proceed if the caller accepts the residual low-severity risk.";
    case "unknown":
      return "Sponsor posture: treat the review as incomplete evidence until the caller confirms the residual risk.";
  }
}

function formatConfidence(result: StructuredReviewResult): string {
  return result.decision
    ? `Reviewer confidence: ${result.decision.confidence}.`
    : "Reviewer confidence: not provided in the structured review result.";
}

function formatPracticalDecision(result: StructuredReviewResult): string {
  return `Practical decision: ${result.decision?.summary ?? result.summary}`;
}

function dedupeQuestions(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildOpenQuestions(
  result: StructuredReviewResult,
  prioritizedFindings: StructuredReviewFinding[],
  limit: number,
  extraRedactions?: ReviewSurfaceRedactions,
): string[] {
  const options = { extraRedactions };
  const questions: string[] = [];
  const decision = result.decision
    ? sanitizeStructuredReviewDecision(result.decision, options)
    : undefined;

  for (const item of decision?.required_before_merge ?? []) {
    questions.push(`What is the caller plan for: ${item}?`);
  }

  for (const item of decision?.follow_up ?? []) {
    questions.push(`Who owns the follow-up for: ${item}?`);
  }

  if ((decision?.next_step_actions ?? []).includes("collect_more_evidence")) {
    questions.push("What additional evidence is still needed before sponsorship can proceed?");
  }

  if ((decision?.next_step_actions ?? []).includes("rerun_review")) {
    questions.push("What changed enough to justify rerunning the review?");
  }

  for (const finding of prioritizedFindings) {
    if (questions.length >= limit) {
      break;
    }

    if (finding.recommendation) {
      questions.push(`Has the caller completed the recommended action for ${finding.title}?`);
      continue;
    }

    if (finding.severity === "critical" || finding.severity === "high") {
      questions.push(`What resolution plan addresses ${finding.title}?`);
    }
  }

  return dedupeQuestions(questions).slice(0, limit);
}

function formatFindingNote(finding: StructuredReviewFinding): string {
  const summary = finding.summary.replace(/[.?!]+$/, "");
  const evidence =
    finding.evidence && finding.evidence.length > 0
      ? ` Evidence: ${finding.evidence.join("; ")}.`
      : "";
  const recommendation = finding.recommendation
    ? ` Recommendation: ${finding.recommendation.replace(/[.?!]+$/, "")}.`
    : "";

  return `- ${finding.title} (${finding.severity}): ${summary}.${recommendation}${evidence}`;
}

function formatProvenanceNote(label: string, value: string): string {
  return `- ${label}: ${value}`;
}

export function formatReviewSponsorMemo(
  result: StructuredReviewResult,
  options: FormatReviewSponsorMemoOptions = {},
): string {
  const title = options.title ?? "Sponsor Memo";
  const sourceLabel = sanitizeStructuredReviewText(
    options.sourceLabel ?? "Structured review result",
    { extraRedactions: options.extraRedactions },
  );
  const findingLimit = options.maxFindingNotes ?? DEFAULT_FINDING_LIMIT;
  const provenanceLimit = options.maxProvenanceNotes ?? DEFAULT_PROVENANCE_LIMIT;
  const questionLimit = options.maxOpenQuestions ?? DEFAULT_QUESTION_LIMIT;
  const prioritizedFindings = prioritizeFindings(result, options.extraRedactions);
  const provenance = sanitizeStructuredReviewProvenance(result.provenance, {
    extraRedactions: options.extraRedactions,
  });
  const openQuestions = buildOpenQuestions(
    result,
    prioritizedFindings,
    questionLimit,
    options.extraRedactions,
  );
  const lines = [
    `# ${title}`,
    "",
    "This memo summarizes one sanitized AIQL reviewer output for a caller-owned sponsorship decision. It does not approve, decline, route, or write downstream state on its own.",
    "",
    "## Inputs",
    "",
    `- Review artifact: ${sourceLabel}`,
    `- Workflow: ${sanitizeStructuredReviewText(result.workflow, { extraRedactions: options.extraRedactions })}`,
    `- Expert: ${sanitizeStructuredReviewText(result.expert, { extraRedactions: options.extraRedactions })}`,
    `- Model: ${sanitizeStructuredReviewText(result.model, { extraRedactions: options.extraRedactions })}`,
    `- Overall severity: ${result.decision?.max_severity ?? result.overallSeverity}`,
    "",
    "## Sponsor Decision",
    "",
    `- ${formatSponsorPosture(result)}`,
    `- ${formatConfidence(result)}`,
    `- ${formatPracticalDecision({
      ...result,
      summary: sanitizeStructuredReviewText(result.summary, {
        extraRedactions: options.extraRedactions,
      }),
      decision: result.decision
        ? sanitizeStructuredReviewDecision(result.decision, {
            extraRedactions: options.extraRedactions,
          })
        : undefined,
    })}`,
    "",
    "## Evidence Pointers",
    "",
    ...(prioritizedFindings.length > 0
      ? prioritizedFindings
          .slice(0, findingLimit)
          .map((finding) => formatFindingNote(finding))
      : ["- No sponsor-relevant finding notes were derived from the structured review result."]),
    ...(prioritizedFindings.length > findingLimit
      ? [
          `- ${prioritizedFindings.length - findingLimit} additional finding${
            prioritizedFindings.length - findingLimit === 1 ? " was" : "s were"
          } omitted by the memo limit.`,
        ]
      : []),
    ...provenance
      .slice(0, provenanceLimit)
      .map((item) => formatProvenanceNote(item.label, item.value)),
    ...(provenance.length > provenanceLimit
      ? [
          `- ${provenance.length - provenanceLimit} additional provenance note${
            provenance.length - provenanceLimit === 1 ? " was" : "s were"
          } omitted by the memo limit.`,
        ]
      : []),
    "",
    "## Open Questions",
    "",
    ...(openQuestions.length > 0
      ? openQuestions.map((question) => `- ${question}`)
      : ["- No extra sponsor questions were derived beyond the structured review summary."]),
    "",
    "## Boundary",
    "",
    "AIQL can format sanitized reviewer output into a compact sponsor-facing memo. The embedding workflow still owns real approval authority, private source interpretation, tracker writes, and downstream action.",
  ];

  return `${lines.join("\n")}\n`;
}
