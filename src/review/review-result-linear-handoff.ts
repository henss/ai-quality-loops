import type {
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import type { ReviewSurfaceRedactions } from "../shared/review-surface.js";
import {
  sanitizeStructuredReviewFinding,
  sanitizeStructuredReviewStringArray,
  sanitizeStructuredReviewText,
} from "./structured-review-result-sanitizer.js";

export const LINEAR_CANDIDATE_HANDOFF_SCHEMA =
  "aiql_linear_candidate_handoff_v1";

export interface LinearCandidateHandoffOptions {
  sourceLabel?: string;
  includeSeverities?: StructuredReviewSeverity[];
  defaultLabels?: string[];
  extraRedactions?: ReviewSurfaceRedactions;
}

interface LinearCandidateRecord {
  id: string;
  title: string;
  severity: StructuredReviewSeverity;
  summary: string;
  recommendation?: string;
  evidence?: string[];
  suggestedLabels: string[];
}

const DEFAULT_CANDIDATE_SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
];

const DEFAULT_LABELS = ["review-finding"];

function normalizeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "review-finding"
  );
}

function createCandidateId(
  finding: Pick<StructuredReviewFinding, "key" | "title" | "summary">,
): string {
  return normalizeSlug(finding.key || finding.title || finding.summary);
}

function dedupeCandidateId(id: string, seenIds: Map<string, number>): string {
  const count = seenIds.get(id) ?? 0;
  seenIds.set(id, count + 1);
  return count === 0 ? id : `${id}-${count + 1}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toYamlScalar(value: string | number | boolean): string {
  return JSON.stringify(value);
}

function pushYamlField(
  lines: string[],
  indent: string,
  key: string,
  value: string | number | boolean,
): void {
  lines.push(`${indent}${key}: ${toYamlScalar(value)}`);
}

function pushYamlList(lines: string[], indent: string, key: string, values: string[]): void {
  if (values.length === 0) {
    lines.push(`${indent}${key}: []`);
    return;
  }

  lines.push(`${indent}${key}:`);
  for (const value of values) {
    lines.push(`${indent}  - ${toYamlScalar(value)}`);
  }
}

function buildLinearCandidateRecords(
  result: StructuredReviewResult,
  options: LinearCandidateHandoffOptions,
): LinearCandidateRecord[] {
  const includedSeverities = new Set(
    options.includeSeverities ?? DEFAULT_CANDIDATE_SEVERITIES,
  );
  const seenIds = new Map<string, number>();
  const sanitizationOptions = { extraRedactions: options.extraRedactions };

  return result.findings
    .filter((finding) => includedSeverities.has(finding.severity))
    .map((finding) => sanitizeStructuredReviewFinding(finding, sanitizationOptions))
    .map((finding) => ({
      id: dedupeCandidateId(createCandidateId(finding), seenIds),
      title: finding.title,
      severity: finding.severity,
      summary: finding.summary,
      recommendation: finding.recommendation,
      evidence: finding.evidence,
      suggestedLabels: uniqueStrings([
        ...(options.defaultLabels ?? DEFAULT_LABELS),
        `severity:${finding.severity}`,
      ]),
    }));
}

export function renderLinearCandidateHandoffYaml(
  result: StructuredReviewResult,
  options: LinearCandidateHandoffOptions = {},
): string {
  const sanitizationOptions = { extraRedactions: options.extraRedactions };
  const candidates = buildLinearCandidateRecords(result, options);
  const lines: string[] = [];

  pushYamlField(lines, "", "schema", LINEAR_CANDIDATE_HANDOFF_SCHEMA);
  lines.push("source:");
  pushYamlField(lines, "  ", "kind", "structured_review_result");
  pushYamlField(
    lines,
    "  ",
    "label",
    sanitizeStructuredReviewText(options.sourceLabel ?? "Structured review result", sanitizationOptions),
  );
  pushYamlField(lines, "  ", "workflow", result.workflow);
  pushYamlField(lines, "  ", "expert", sanitizeStructuredReviewText(result.expert, sanitizationOptions));
  pushYamlField(lines, "  ", "model", sanitizeStructuredReviewText(result.model, sanitizationOptions));
  pushYamlField(lines, "  ", "overall_severity", result.overallSeverity);
  pushYamlField(lines, "  ", "summary", sanitizeStructuredReviewText(result.summary, sanitizationOptions));
  lines.push("policy:");
  pushYamlField(lines, "  ", "writes_to_linear", false);
  pushYamlField(lines, "  ", "creates_issues", false);
  pushYamlField(lines, "  ", "prioritization_owner", "caller");
  pushYamlField(
    lines,
    "  ",
    "boundary",
    "Candidate handoff only; downstream tracker writes and priority decisions stay caller-owned.",
  );
  lines.push("candidates:");

  if (candidates.length === 0) {
    lines[lines.length - 1] = "candidates: []";
  } else {
    for (const candidate of candidates) {
      lines.push(`  - id: ${toYamlScalar(candidate.id)}`);
      pushYamlField(lines, "    ", "title", candidate.title);
      pushYamlField(lines, "    ", "severity", candidate.severity);
      pushYamlField(lines, "    ", "summary", candidate.summary);
      if (candidate.recommendation) {
        pushYamlField(lines, "    ", "recommendation", candidate.recommendation);
      }
      pushYamlList(lines, "    ", "suggested_labels", candidate.suggestedLabels);
      if (candidate.evidence) {
        pushYamlList(
          lines,
          "    ",
          "evidence",
          sanitizeStructuredReviewStringArray(candidate.evidence, sanitizationOptions),
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
}
