import type {
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import { sanitizeReviewSurfaceValue, type ReviewSurfaceRedactions } from "../shared/review-surface.js";
import { normalizeStructuredReviewFindingKey } from "./review-result-comparison.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

const FINDING_CONSENSUS_ORDER = [
  "unanimous",
  "majority",
  "split",
  "single-reviewer",
] as const;

export type CrossReviewConsensusLevel =
  | "unanimous"
  | "majority"
  | "split"
  | "single-reviewer";

export interface CrossReviewConsensusInputArtifact {
  label: string;
  result: StructuredReviewResult;
}

export interface CrossReviewConsensusFindingSnapshot {
  reviewLabel: string;
  title: string;
  summary: string;
  severity: StructuredReviewSeverity;
  recommendation?: string;
  evidence?: string[];
  reviewFindingCount: number;
}

export interface CrossReviewConsensusFinding {
  key: string;
  title: string;
  presentReviewCount: number;
  missingReviewCount: number;
  presenceConsensus: CrossReviewConsensusLevel;
  severityConsensus: {
    level: CrossReviewConsensusLevel;
    selectedSeverity: StructuredReviewSeverity;
    counts: Record<StructuredReviewSeverity, number>;
  };
  wordingConsensus: CrossReviewConsensusLevel;
  recommendationConsensus: CrossReviewConsensusLevel;
  evidenceConsensus: CrossReviewConsensusLevel;
  findings: CrossReviewConsensusFindingSnapshot[];
}

export interface CrossReviewConsensusComparison {
  reviewCount: number;
  findingCount: number;
  overallSeverity: {
    level: CrossReviewConsensusLevel;
    selectedSeverity: StructuredReviewSeverity;
    counts: Record<StructuredReviewSeverity, number>;
  };
  counts: {
    findingPresence: Record<CrossReviewConsensusLevel, number>;
    findingSeverity: Record<CrossReviewConsensusLevel, number>;
    wording: Record<CrossReviewConsensusLevel, number>;
    recommendation: Record<CrossReviewConsensusLevel, number>;
    evidence: Record<CrossReviewConsensusLevel, number>;
  };
  findings: CrossReviewConsensusFinding[];
}

export interface CrossReviewConsensusReport {
  inputs: Array<{
    label: string;
  }>;
  comparison: CrossReviewConsensusComparison;
}

export interface FormatCrossReviewConsensusReportOptions {
  title?: string;
  maxFindingNotes?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

interface IndexedFinding {
  snapshot: CrossReviewConsensusFindingSnapshot;
  normalizedSummary: string;
  normalizedRecommendation: string;
  normalizedEvidence: string;
}

function createEmptySeverityCounts(): Record<StructuredReviewSeverity, number> {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
}

function createEmptyConsensusCounts(): Record<CrossReviewConsensusLevel, number> {
  return {
    unanimous: 0,
    majority: 0,
    split: 0,
    "single-reviewer": 0,
  };
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#~]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEvidence(evidence?: string[]): string[] {
  return (evidence || []).map((item) => item.trim()).filter(Boolean).sort();
}

function severityRank(severity: StructuredReviewSeverity): number {
  return REVIEW_SEVERITY_ORDER.indexOf(severity);
}

function compareFindingSnapshots(left: IndexedFinding, right: IndexedFinding): number {
  return (
    severityRank(left.snapshot.severity) - severityRank(right.snapshot.severity) ||
    left.snapshot.title.localeCompare(right.snapshot.title) ||
    left.snapshot.summary.localeCompare(right.snapshot.summary)
  );
}

function buildIndexedFinding(
  reviewLabel: string,
  findings: StructuredReviewFinding[],
): Map<string, IndexedFinding[]> {
  const grouped = new Map<string, IndexedFinding[]>();

  for (const finding of findings) {
    const indexedFinding: IndexedFinding = {
      snapshot: {
        reviewLabel,
        title: finding.title.trim(),
        summary: finding.summary.trim(),
        severity: finding.severity,
        recommendation: finding.recommendation?.trim() || undefined,
        evidence: normalizeEvidence(finding.evidence),
        reviewFindingCount: 1,
      },
      normalizedSummary: normalizeComparableText(finding.summary),
      normalizedRecommendation: normalizeComparableText(finding.recommendation || ""),
      normalizedEvidence: normalizeEvidence(finding.evidence).join(" | "),
    };
    const key = normalizeStructuredReviewFindingKey(finding);
    const current = grouped.get(key) || [];
    current.push(indexedFinding);
    grouped.set(key, current);
  }

  for (const group of grouped.values()) {
    group.sort(compareFindingSnapshots);
    const reviewFindingCount = group.length;
    for (const item of group) {
      item.snapshot.reviewFindingCount = reviewFindingCount;
    }
  }

  return grouped;
}

function selectRepresentativeFinding(group: IndexedFinding[]): IndexedFinding {
  return [...group].sort(compareFindingSnapshots)[0] as IndexedFinding;
}

function selectConsensusLevel(input: {
  alignedCount: number;
  population: number;
}): CrossReviewConsensusLevel {
  if (input.population <= 1) {
    return "single-reviewer";
  }

  if (input.alignedCount >= input.population) {
    return "unanimous";
  }

  if (input.alignedCount > input.population / 2) {
    return "majority";
  }

  return "split";
}

function selectDominantSeverity(
  counts: Record<StructuredReviewSeverity, number>,
): StructuredReviewSeverity {
  return [...REVIEW_SEVERITY_ORDER].sort((left, right) => {
    return counts[right] - counts[left] || severityRank(left) - severityRank(right);
  })[0] as StructuredReviewSeverity;
}

function compareConsensusLevels(
  left: CrossReviewConsensusLevel,
  right: CrossReviewConsensusLevel,
): number {
  return (
    FINDING_CONSENSUS_ORDER.indexOf(left) - FINDING_CONSENSUS_ORDER.indexOf(right)
  );
}

function sanitizeLabel(
  value: string,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength: 120,
    extraRedactions,
  });
}

function formatSeverityCounts(
  counts: Record<StructuredReviewSeverity, number>,
): string {
  return REVIEW_SEVERITY_ORDER.map(
    (severity) => `${severity}=${counts[severity]}`,
  ).join(", ");
}

function formatFindingConsensusNote(
  finding: CrossReviewConsensusFinding,
  extraRedactions?: ReviewSurfaceRedactions,
): string {
  const detailNotes = finding.findings
    .map((item) => {
      return `  - ${sanitizeLabel(item.reviewLabel, extraRedactions)}: severity=${item.severity}; summary=${sanitizeLabel(item.summary, extraRedactions)}`;
    })
    .join("\n");

  return [
    `- \`${sanitizeLabel(finding.title, extraRedactions)}\`: presence=${finding.presenceConsensus} (${finding.presentReviewCount}/${finding.presentReviewCount + finding.missingReviewCount}); severity=${finding.severityConsensus.selectedSeverity} (${finding.severityConsensus.level}); wording=${finding.wordingConsensus}; recommendation=${finding.recommendationConsensus}; evidence=${finding.evidenceConsensus}.`,
    detailNotes,
  ].join("\n");
}

export function compareCrossReviewConsensus(input: {
  reviews: CrossReviewConsensusInputArtifact[];
}): CrossReviewConsensusComparison {
  if (input.reviews.length < 2) {
    throw new Error("Cross-review consensus comparison requires at least two reviews.");
  }

  const reviewMaps = input.reviews.map((review) => ({
    label: review.label,
    overallSeverity: review.result.overallSeverity,
    findings: buildIndexedFinding(review.label, review.result.findings),
  }));
  const allKeys = new Set<string>();

  for (const review of reviewMaps) {
    for (const key of review.findings.keys()) {
      allKeys.add(key);
    }
  }

  const findingPresenceCounts = createEmptyConsensusCounts();
  const findingSeverityCounts = createEmptyConsensusCounts();
  const wordingCounts = createEmptyConsensusCounts();
  const recommendationCounts = createEmptyConsensusCounts();
  const evidenceCounts = createEmptyConsensusCounts();
  const overallSeverityCounts = createEmptySeverityCounts();
  const findings: CrossReviewConsensusFinding[] = [];

  for (const review of reviewMaps) {
    overallSeverityCounts[review.overallSeverity] += 1;
  }

  for (const key of [...allKeys].sort()) {
    const perReviewFindings = reviewMaps
      .map((review) => {
        const grouped = review.findings.get(key);
        if (!grouped || grouped.length === 0) {
          return undefined;
        }

        return selectRepresentativeFinding(grouped);
      })
      .filter((item): item is IndexedFinding => item !== undefined);

    const presentReviewCount = perReviewFindings.length;
    const missingReviewCount = reviewMaps.length - presentReviewCount;
    const presenceConsensus = selectConsensusLevel({
      alignedCount: presentReviewCount,
      population: reviewMaps.length,
    });
    const severityCounts = createEmptySeverityCounts();
    const wordingCountsByValue = new Map<string, number>();
    const recommendationCountsByValue = new Map<string, number>();
    const evidenceCountsByValue = new Map<string, number>();

    for (const finding of perReviewFindings) {
      severityCounts[finding.snapshot.severity] += 1;
      wordingCountsByValue.set(
        finding.normalizedSummary,
        (wordingCountsByValue.get(finding.normalizedSummary) || 0) + 1,
      );
      recommendationCountsByValue.set(
        finding.normalizedRecommendation,
        (recommendationCountsByValue.get(finding.normalizedRecommendation) || 0) + 1,
      );
      evidenceCountsByValue.set(
        finding.normalizedEvidence,
        (evidenceCountsByValue.get(finding.normalizedEvidence) || 0) + 1,
      );
    }

    const dominantSeverity = selectDominantSeverity(severityCounts);
    const severityConsensus = selectConsensusLevel({
      alignedCount: severityCounts[dominantSeverity],
      population: presentReviewCount,
    });
    const wordingConsensus = selectConsensusLevel({
      alignedCount: Math.max(...wordingCountsByValue.values()),
      population: presentReviewCount,
    });
    const recommendationConsensus = selectConsensusLevel({
      alignedCount: Math.max(...recommendationCountsByValue.values()),
      population: presentReviewCount,
    });
    const evidenceConsensus = selectConsensusLevel({
      alignedCount: Math.max(...evidenceCountsByValue.values()),
      population: presentReviewCount,
    });
    const title = perReviewFindings[0]?.snapshot.title || key;

    findingPresenceCounts[presenceConsensus] += 1;
    findingSeverityCounts[severityConsensus] += 1;
    wordingCounts[wordingConsensus] += 1;
    recommendationCounts[recommendationConsensus] += 1;
    evidenceCounts[evidenceConsensus] += 1;

    findings.push({
      key,
      title,
      presentReviewCount,
      missingReviewCount,
      presenceConsensus,
      severityConsensus: {
        level: severityConsensus,
        selectedSeverity: dominantSeverity,
        counts: severityCounts,
      },
      wordingConsensus,
      recommendationConsensus,
      evidenceConsensus,
      findings: perReviewFindings.map((finding) => finding.snapshot),
    });
  }

  findings.sort((left, right) => {
    return (
      compareConsensusLevels(left.presenceConsensus, right.presenceConsensus) ||
      compareConsensusLevels(left.severityConsensus.level, right.severityConsensus.level) ||
      severityRank(left.severityConsensus.selectedSeverity) -
        severityRank(right.severityConsensus.selectedSeverity) ||
      left.title.localeCompare(right.title) ||
      left.key.localeCompare(right.key)
    );
  });

  const overallSelectedSeverity = selectDominantSeverity(overallSeverityCounts);

  return {
    reviewCount: input.reviews.length,
    findingCount: findings.length,
    overallSeverity: {
      level: selectConsensusLevel({
        alignedCount: overallSeverityCounts[overallSelectedSeverity],
        population: input.reviews.length,
      }),
      selectedSeverity: overallSelectedSeverity,
      counts: overallSeverityCounts,
    },
    counts: {
      findingPresence: findingPresenceCounts,
      findingSeverity: findingSeverityCounts,
      wording: wordingCounts,
      recommendation: recommendationCounts,
      evidence: evidenceCounts,
    },
    findings,
  };
}

export function formatCrossReviewConsensusReport(
  report: CrossReviewConsensusReport,
  options: FormatCrossReviewConsensusReportOptions = {},
): string {
  const title = options.title || "Cross-Review Consensus Report";
  const maxFindingNotes = options.maxFindingNotes ?? 8;
  const findingNotes = report.comparison.findings
    .slice(0, maxFindingNotes)
    .map((finding) => formatFindingConsensusNote(finding, options.extraRedactions));
  const omittedFindingCount = report.comparison.findings.length - findingNotes.length;
  const lines = [
    `# ${title}`,
    "",
    "This report summarizes consensus across published sanitized AIQL structured review results for one caller-owned target. It does not assign approval authority, reviewer weighting, or downstream routing.",
    "",
    "## Inputs",
    "",
    ...report.inputs.map(
      (input) => `- ${sanitizeLabel(input.label, options.extraRedactions)}`,
    ),
    "",
    "## Consensus Snapshot",
    "",
    `- Reviews compared: ${report.comparison.reviewCount}.`,
    `- Unique finding groups: ${report.comparison.findingCount}.`,
    `- Overall severity consensus: ${report.comparison.overallSeverity.selectedSeverity} (${report.comparison.overallSeverity.level}); ${formatSeverityCounts(report.comparison.overallSeverity.counts)}.`,
    `- Finding presence consensus: unanimous=${report.comparison.counts.findingPresence.unanimous}, majority=${report.comparison.counts.findingPresence.majority}, split=${report.comparison.counts.findingPresence.split}, single-reviewer=${report.comparison.counts.findingPresence["single-reviewer"]}.`,
    `- Finding severity consensus: unanimous=${report.comparison.counts.findingSeverity.unanimous}, majority=${report.comparison.counts.findingSeverity.majority}, split=${report.comparison.counts.findingSeverity.split}, single-reviewer=${report.comparison.counts.findingSeverity["single-reviewer"]}.`,
    `- Wording consensus: unanimous=${report.comparison.counts.wording.unanimous}, majority=${report.comparison.counts.wording.majority}, split=${report.comparison.counts.wording.split}, single-reviewer=${report.comparison.counts.wording["single-reviewer"]}.`,
    `- Recommendation consensus: unanimous=${report.comparison.counts.recommendation.unanimous}, majority=${report.comparison.counts.recommendation.majority}, split=${report.comparison.counts.recommendation.split}, single-reviewer=${report.comparison.counts.recommendation["single-reviewer"]}.`,
    `- Evidence consensus: unanimous=${report.comparison.counts.evidence.unanimous}, majority=${report.comparison.counts.evidence.majority}, split=${report.comparison.counts.evidence.split}, single-reviewer=${report.comparison.counts.evidence["single-reviewer"]}.`,
    "",
    "## Findings",
    "",
    ...(findingNotes.length > 0
      ? findingNotes
      : ["- No findings were available across the compared reviews."]),
    ...(omittedFindingCount > 0
      ? [
          `- ${omittedFindingCount} additional finding entr${
            omittedFindingCount === 1 ? "y was" : "ies were"
          } omitted by the note limit.`,
        ]
      : []),
    "",
    "## Boundary",
    "",
    "AIQL can compare published structured review results and expose where several reviewers converge or diverge on one target. Reviewer selection, weighting, arbitration thresholds, approval policy, and any real-world action remain caller-owned.",
  ];

  return `${lines.join("\n")}\n`;
}
