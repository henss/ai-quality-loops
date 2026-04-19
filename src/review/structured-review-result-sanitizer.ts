import type {
  StructuredReviewFinding,
  StructuredReviewProvenanceItem,
} from "../contracts/json-contracts.js";
import {
  sanitizeReviewSurfaceValue,
  type ReviewSurfaceRedactions,
} from "../shared/review-surface.js";
import type { StructuredReviewDecision } from "./review-result.js";

const STRUCTURED_RESULT_TEXT_MAX_LENGTH = Number.MAX_SAFE_INTEGER;

export interface StructuredReviewResultSanitizationOptions {
  extraRedactions?: ReviewSurfaceRedactions;
}

export function sanitizeStructuredReviewText(
  value: string,
  options: StructuredReviewResultSanitizationOptions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: STRUCTURED_RESULT_TEXT_MAX_LENGTH,
    extraRedactions: options.extraRedactions,
  });
}

export function sanitizeStructuredReviewStringArray(
  values: string[],
  options: StructuredReviewResultSanitizationOptions,
): string[] {
  return values.map((value) => sanitizeStructuredReviewText(value, options));
}

export function sanitizeStructuredReviewFinding(
  finding: StructuredReviewFinding,
  options: StructuredReviewResultSanitizationOptions,
): StructuredReviewFinding {
  return {
    key:
      finding.key === undefined
        ? undefined
        : sanitizeStructuredReviewText(finding.key, options),
    title: sanitizeStructuredReviewText(finding.title, options),
    summary: sanitizeStructuredReviewText(finding.summary, options),
    severity: finding.severity,
    recommendation:
      finding.recommendation === undefined
        ? undefined
        : sanitizeStructuredReviewText(finding.recommendation, options),
    evidence:
      finding.evidence === undefined
        ? undefined
        : sanitizeStructuredReviewStringArray(finding.evidence, options),
  };
}

export function sanitizeStructuredReviewFindings(
  findings: StructuredReviewFinding[],
  options: StructuredReviewResultSanitizationOptions,
): StructuredReviewFinding[] {
  return findings.map((finding) => sanitizeStructuredReviewFinding(finding, options));
}

export function sanitizeStructuredReviewDecision(
  decision: StructuredReviewDecision,
  options: StructuredReviewResultSanitizationOptions,
): StructuredReviewDecision {
  return {
    schema: decision.schema,
    verdict: decision.verdict,
    confidence: decision.confidence,
    blocking: decision.blocking,
    max_severity: decision.max_severity,
    summary: sanitizeStructuredReviewText(decision.summary, options),
    blocking_findings: sanitizeStructuredReviewFindings(
      decision.blocking_findings,
      options,
    ),
    non_blocking_findings: sanitizeStructuredReviewFindings(
      decision.non_blocking_findings,
      options,
    ),
    required_before_merge: sanitizeStructuredReviewStringArray(
      decision.required_before_merge,
      options,
    ),
    follow_up: sanitizeStructuredReviewStringArray(decision.follow_up, options),
  };
}

export function sanitizeStructuredReviewProvenance(
  provenance: StructuredReviewProvenanceItem[],
  options: StructuredReviewResultSanitizationOptions,
): StructuredReviewProvenanceItem[] {
  return provenance.map((item) => ({
    label: sanitizeStructuredReviewText(item.label, options),
    value: sanitizeStructuredReviewText(item.value, options),
  }));
}
