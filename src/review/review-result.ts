import type {
  StructuredReviewFinding,
  StructuredReviewProvenanceItem,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";

export type {
  StructuredReviewFinding,
  StructuredReviewProvenanceItem,
  StructuredReviewResult,
  StructuredReviewSeverity,
};

export interface StructuredReviewSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

export interface StructuredReviewResultRollup {
  overallSeverity: StructuredReviewSeverity;
  totalFindings: number;
  findingCounts: StructuredReviewSeverityCounts;
}

export type StructuredReviewDecisionVerdict =
  | "accept"
  | "accept_with_follow_up"
  | "changes_requested"
  | "blocked"
  | "process_failed";

export type StructuredReviewDecisionConfidence = "low" | "medium" | "high";

export interface StructuredReviewDecision {
  schema: "peer_review_decision_v1";
  verdict: StructuredReviewDecisionVerdict;
  confidence: StructuredReviewDecisionConfidence;
  blocking: boolean;
  max_severity: StructuredReviewSeverity;
  summary: string;
  blocking_findings: StructuredReviewFinding[];
  non_blocking_findings: StructuredReviewFinding[];
  required_before_merge: string[];
  follow_up: string[];
}

interface MarkdownSection {
  heading?: string;
  body: string;
}

const SUMMARY_HEADING_PATTERN = /^(summary|overview|overall|executive summary)$/i;
const NON_FINDING_HEADING_PATTERN =
  /^(summary|overview|overall|executive summary|strengths|positives|wins|notes?)$/i;
const SEVERITY_PATTERNS: Array<{
  severity: StructuredReviewSeverity;
  pattern: RegExp;
}> = [
  { severity: "critical", pattern: /\b(critical|blocker|severe|urgent)\b/i },
  { severity: "high", pattern: /\b(high|major|serious)\b/i },
  { severity: "medium", pattern: /\b(medium|moderate)\b/i },
  { severity: "low", pattern: /\b(low|minor|nit|small)\b/i },
];
const DECISION_BLOCK_PATTERN = /```(?:json|JSON)\s*([\s\S]*?)```/g;
const DECISION_VERDICTS: StructuredReviewDecisionVerdict[] = [
  "accept",
  "accept_with_follow_up",
  "changes_requested",
  "blocked",
  "process_failed",
];
const DECISION_CONFIDENCE_VALUES: StructuredReviewDecisionConfidence[] = [
  "low",
  "medium",
  "high",
];
const SEVERITIES: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export function stripReviewReasoningBlocks(markdown: string): string {
  return markdown
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeMarkdown(markdown: string): string {
  return stripReviewReasoningBlocks(markdown.replace(/\r\n/g, "\n"));
}

function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function stripLeadingListMarker(line: string): string {
  return line.replace(/^\s*[-*+]\s+/, "").trim();
}

function extractBulletItems(body: string): string[] {
  return body
    .split("\n")
    .map((line) => stripLeadingListMarker(line))
    .filter((line, index, lines) => {
      const originalLine = body.split("\n")[index] || "";
      return /^\s*[-*+]\s+/.test(originalLine) && Boolean(line);
    });
}

function parseSections(markdown: string): MarkdownSection[] {
  const lines = normalizeMarkdown(markdown).split("\n");
  const sections: MarkdownSection[] = [];
  let currentHeading: string | undefined;
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (currentHeading || body) {
      sections.push({ heading: currentHeading, body });
    }
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      continue;
    }

    currentBody.push(line);
  }

  flush();
  return sections.filter((section) => section.heading || section.body);
}

export function inferReviewSeverity(text: string): StructuredReviewSeverity {
  for (const entry of SEVERITY_PATTERNS) {
    if (entry.pattern.test(text)) {
      return entry.severity;
    }
  }

  return "unknown";
}

export function createStructuredReviewSeverityCounts(): StructuredReviewSeverityCounts {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDecisionString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`review_decision.${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readDecisionStringArray(value: unknown, field: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`review_decision.${field} must be an array of strings.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function readDecisionSeverity(value: unknown, field: string): StructuredReviewSeverity {
  if (SEVERITIES.includes(value as StructuredReviewSeverity)) {
    return value as StructuredReviewSeverity;
  }

  throw new Error(
    `review_decision.${field} must be one of ${SEVERITIES.join(", ")}.`,
  );
}

function readDecisionFinding(value: unknown, index: number): StructuredReviewFinding {
  if (!isRecord(value)) {
    throw new Error(`review_decision finding ${index} must be an object.`);
  }

  return {
    title: readDecisionString(value.title, `findings[${index}].title`),
    summary: readDecisionString(value.summary, `findings[${index}].summary`),
    severity: readDecisionSeverity(value.severity, `findings[${index}].severity`),
    recommendation:
      value.recommendation === undefined
        ? undefined
        : readDecisionString(value.recommendation, `findings[${index}].recommendation`),
    evidence: readDecisionStringArray(value.evidence, `findings[${index}].evidence`),
  };
}

function readDecisionFindings(value: unknown, field: string): StructuredReviewFinding[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`review_decision.${field} must be an array.`);
  }

  return value.map((item, index) => readDecisionFinding(item, index));
}

function parseReviewDecision(value: unknown): StructuredReviewDecision {
  if (!isRecord(value)) {
    throw new Error("review_decision must be an object.");
  }

  if (value.schema !== "peer_review_decision_v1") {
    throw new Error('review_decision.schema must equal "peer_review_decision_v1".');
  }

  if (!DECISION_VERDICTS.includes(value.verdict as StructuredReviewDecisionVerdict)) {
    throw new Error(`review_decision.verdict must be one of ${DECISION_VERDICTS.join(", ")}.`);
  }

  if (
    !DECISION_CONFIDENCE_VALUES.includes(
      value.confidence as StructuredReviewDecisionConfidence,
    )
  ) {
    throw new Error(
      `review_decision.confidence must be one of ${DECISION_CONFIDENCE_VALUES.join(", ")}.`,
    );
  }

  if (typeof value.blocking !== "boolean") {
    throw new Error("review_decision.blocking must be a boolean.");
  }

  const decision = {
    schema: "peer_review_decision_v1",
    verdict: value.verdict as StructuredReviewDecisionVerdict,
    confidence: value.confidence as StructuredReviewDecisionConfidence,
    blocking: value.blocking,
    max_severity: readDecisionSeverity(value.max_severity, "max_severity"),
    summary: readDecisionString(value.summary, "summary"),
    blocking_findings: readDecisionFindings(value.blocking_findings, "blocking_findings"),
    non_blocking_findings: readDecisionFindings(
      value.non_blocking_findings,
      "non_blocking_findings",
    ),
    required_before_merge: readDecisionStringArray(
      value.required_before_merge,
      "required_before_merge",
    ),
    follow_up: readDecisionStringArray(value.follow_up, "follow_up"),
  } satisfies StructuredReviewDecision;

  validateReviewDecisionConsistency(decision);
  return decision;
}

function validateReviewDecisionConsistency(decision: StructuredReviewDecision): void {
  const accepts = decision.verdict === "accept" || decision.verdict === "accept_with_follow_up";
  if (accepts && decision.blocking) {
    throw new Error("Accepted review decisions cannot be blocking.");
  }

  if (
    accepts &&
    (decision.max_severity === "critical" || decision.max_severity === "high")
  ) {
    throw new Error("Accepted review decisions cannot declare high or critical max_severity.");
  }

  if (!decision.blocking && decision.blocking_findings.length > 0) {
    throw new Error("Non-blocking review decisions cannot include blocking findings.");
  }

  if (decision.verdict === "accept" && decision.required_before_merge.length > 0) {
    throw new Error("Accepted review decisions cannot require before-merge work.");
  }
}

export function extractStructuredReviewDecision(
  markdown: string,
): StructuredReviewDecision | undefined {
  const normalized = normalizeMarkdown(markdown);
  for (const match of normalized.matchAll(DECISION_BLOCK_PATTERN)) {
    const rawJson = match[1]?.trim();
    if (!rawJson) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (!isRecord(parsed) || !("review_decision" in parsed)) {
        continue;
      }

      return parseReviewDecision(parsed.review_decision);
    } catch {
      continue;
    }
  }

  return undefined;
}

function pickFindingTitle(text: string, fallbackTitle: string): string {
  const stripped = stripLeadingListMarker(text)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
  const titleMatch = stripped.match(/^([^:.-]{3,120})[:.-]\s+/);

  if (titleMatch) {
    return titleMatch[1].trim();
  }

  if (stripped.length <= 80) {
    return stripped;
  }

  return fallbackTitle;
}

function extractRecommendation(text: string): string | undefined {
  const match = text.match(
    /\b(?:recommendation|fix|next step|action)\s*:\s*(.+)$/i,
  );
  return match?.[1]?.trim();
}

function extractEvidence(text: string): string[] | undefined {
  const match = text.match(/\bevidence\s*:\s*(.+)$/i);
  if (!match?.[1]) {
    return undefined;
  }

  const evidence = match[1]
    .split(/[;,]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return evidence.length > 0 ? evidence : undefined;
}

export function extractStructuredReviewSummary(markdown: string): string {
  const sections = parseSections(markdown);

  for (const section of sections) {
    if (section.heading && SUMMARY_HEADING_PATTERN.test(section.heading)) {
      const paragraph = toParagraphs(section.body)[0];
      if (paragraph) {
        return paragraph;
      }
    }
  }

  for (const section of sections) {
    const paragraph = toParagraphs(section.body).find(
      (entry) => !/^\s*[-*+]\s+/.test(entry),
    );
    if (paragraph) {
      return paragraph;
    }
  }

  return normalizeMarkdown(markdown);
}

export function extractStructuredReviewFindings(
  markdown: string,
): StructuredReviewFinding[] {
  const sections = parseSections(markdown);
  const findings: StructuredReviewFinding[] = [];

  for (const section of sections) {
    const heading = section.heading?.trim();
    const body = section.body.trim();
    const bullets = extractBulletItems(body);
    const isSummarySection = heading
      ? NON_FINDING_HEADING_PATTERN.test(heading)
      : false;

    if (bullets.length > 0 && !isSummarySection) {
      for (const bullet of bullets) {
        const title = pickFindingTitle(bullet, heading || "Finding");
        findings.push({
          title,
          summary: bullet,
          severity: inferReviewSeverity(bullet),
          recommendation: extractRecommendation(bullet),
          evidence: extractEvidence(bullet),
        });
      }
      continue;
    }

    if (heading && !isSummarySection) {
      const paragraphs = toParagraphs(body);
      const summary = paragraphs[0];

      if (summary) {
        findings.push({
          title: heading,
          summary,
          severity: inferReviewSeverity(`${heading} ${summary}`),
          recommendation: extractRecommendation(body),
          evidence: extractEvidence(body),
        });
      }
    }
  }

  if (findings.length > 0) {
    return findings;
  }

  return extractBulletItems(markdown).map((bullet) => ({
    title: pickFindingTitle(bullet, "Finding"),
    summary: bullet,
    severity: inferReviewSeverity(bullet),
    recommendation: extractRecommendation(bullet),
    evidence: extractEvidence(bullet),
  }));
}

export function summarizeStructuredReviewSeverity(
  findings: StructuredReviewFinding[],
): StructuredReviewSeverity {
  const order: StructuredReviewSeverity[] = [
    "critical",
    "high",
    "medium",
    "low",
    "unknown",
  ];

  for (const severity of order) {
    if (findings.some((finding) => finding.severity === severity)) {
      return severity;
    }
  }

  return "unknown";
}

export function summarizeStructuredReviewFindingCounts(
  findings: StructuredReviewFinding[],
): StructuredReviewSeverityCounts {
  const counts = createStructuredReviewSeverityCounts();

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}

export function summarizeStructuredReviewResultRollup(
  result: Pick<StructuredReviewResult, "overallSeverity" | "findings">,
): StructuredReviewResultRollup {
  return {
    overallSeverity: result.overallSeverity,
    totalFindings: result.findings.length,
    findingCounts: summarizeStructuredReviewFindingCounts(result.findings),
  };
}

export function buildStructuredReviewResult(input: {
  workflow: "expert" | "vision";
  expert: string;
  model: string;
  markdown: string;
  provenance: StructuredReviewProvenanceItem[];
}): StructuredReviewResult {
  const decision = extractStructuredReviewDecision(input.markdown);
  const findings = decision
    ? [...decision.blocking_findings, ...decision.non_blocking_findings]
    : extractStructuredReviewFindings(input.markdown);

  return {
    schemaVersion: "1",
    workflow: input.workflow,
    expert: input.expert,
    model: input.model,
    summary: extractStructuredReviewSummary(input.markdown),
    overallSeverity: decision?.max_severity ?? summarizeStructuredReviewSeverity(findings),
    findings,
    decision,
    provenance: input.provenance,
    markdown: normalizeMarkdown(input.markdown),
  };
}
