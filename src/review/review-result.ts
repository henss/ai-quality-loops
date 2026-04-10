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

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").trim();
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
  const findings = extractStructuredReviewFindings(input.markdown);

  return {
    schemaVersion: "1",
    workflow: input.workflow,
    expert: input.expert,
    model: input.model,
    summary: extractStructuredReviewSummary(input.markdown),
    overallSeverity: summarizeStructuredReviewSeverity(findings),
    findings,
    provenance: input.provenance,
    markdown: normalizeMarkdown(input.markdown),
  };
}
