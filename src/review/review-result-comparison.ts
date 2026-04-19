import type {
  StructuredReviewFinding,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";

const REVIEW_SEVERITY_ORDER: StructuredReviewSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
];

export type StructuredReviewSeverityDirection =
  | "improved"
  | "regressed"
  | "unchanged";

export type StructuredReviewFindingChangeField =
  | "title"
  | "summary"
  | "severity"
  | "recommendation"
  | "evidence";

export interface StructuredReviewFindingSnapshot {
  key: string;
  title: string;
  summary: string;
  severity: StructuredReviewSeverity;
  recommendation?: string;
  evidence?: string[];
}

export interface StructuredReviewFindingComparison {
  key: string;
  title: string;
  before: StructuredReviewFindingSnapshot;
  after: StructuredReviewFindingSnapshot;
  changedFields: StructuredReviewFindingChangeField[];
  severityChange: {
    before: StructuredReviewSeverity;
    after: StructuredReviewSeverity;
    direction: StructuredReviewSeverityDirection;
  };
}

export interface StructuredReviewResultComparison {
  overallSeverityChange: {
    before: StructuredReviewSeverity;
    after: StructuredReviewSeverity;
    direction: StructuredReviewSeverityDirection;
  };
  counts: {
    beforeFindings: number;
    afterFindings: number;
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    severityMovement: Record<StructuredReviewSeverityDirection, number>;
  };
  added: StructuredReviewFindingSnapshot[];
  removed: StructuredReviewFindingSnapshot[];
  changed: StructuredReviewFindingComparison[];
  unchanged: StructuredReviewFindingComparison[];
}

interface IndexedFinding {
  groupKey: string;
  detailKey: string;
  snapshot: StructuredReviewFindingSnapshot;
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#~]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionalText(value?: string): string {
  return value ? value.trim() : "";
}

function normalizeEvidence(evidence?: string[]): string[] {
  return (evidence || [])
    .map((item) => item.trim())
    .filter(Boolean);
}

function severityRank(severity: StructuredReviewSeverity): number {
  return REVIEW_SEVERITY_ORDER.indexOf(severity);
}

function compareSeverityDirection(
  before: StructuredReviewSeverity,
  after: StructuredReviewSeverity,
): StructuredReviewSeverityDirection {
  const beforeRank = severityRank(before);
  const afterRank = severityRank(after);

  if (afterRank < beforeRank) {
    return "regressed";
  }

  if (afterRank > beforeRank) {
    return "improved";
  }

  return "unchanged";
}

export function normalizeStructuredReviewFindingKey(
  finding: Pick<StructuredReviewFinding, "key" | "title" | "summary">,
): string {
  const normalizedExplicitKey = normalizeComparableText(finding.key || "");
  const normalizedTitle = normalizeComparableText(finding.title);
  const normalizedSummary = normalizeComparableText(finding.summary);

  if (normalizedExplicitKey) {
    return normalizedExplicitKey;
  }

  if (normalizedTitle) {
    return normalizedTitle;
  }

  return normalizedSummary || "finding";
}

function createFindingSnapshot(
  finding: StructuredReviewFinding,
): StructuredReviewFindingSnapshot {
  return {
    key: normalizeStructuredReviewFindingKey(finding),
    title: finding.title.trim(),
    summary: finding.summary.trim(),
    severity: finding.severity,
    recommendation: normalizeOptionalText(finding.recommendation) || undefined,
    evidence: normalizeEvidence(finding.evidence),
  };
}

function createIndexedFinding(finding: StructuredReviewFinding): IndexedFinding {
  const snapshot = createFindingSnapshot(finding);
  const normalizedSummary = normalizeComparableText(snapshot.summary);

  return {
    groupKey: snapshot.key,
    detailKey: `${snapshot.key}::${normalizedSummary}`,
    snapshot,
  };
}

function compareIndexedFindings(a: IndexedFinding, b: IndexedFinding): number {
  return (
    a.detailKey.localeCompare(b.detailKey) ||
    a.snapshot.summary.localeCompare(b.snapshot.summary) ||
    a.snapshot.title.localeCompare(b.snapshot.title)
  );
}

function groupFindings(
  findings: StructuredReviewFinding[],
): Map<string, IndexedFinding[]> {
  const groups = new Map<string, IndexedFinding[]>();

  for (const finding of findings.map(createIndexedFinding)) {
    const currentGroup = groups.get(finding.groupKey) || [];
    currentGroup.push(finding);
    groups.set(finding.groupKey, currentGroup);
  }

  for (const group of groups.values()) {
    group.sort(compareIndexedFindings);
  }

  return groups;
}

function detectChangedFields(
  before: StructuredReviewFindingSnapshot,
  after: StructuredReviewFindingSnapshot,
): StructuredReviewFindingChangeField[] {
  const changedFields: StructuredReviewFindingChangeField[] = [];

  if (before.title !== after.title) {
    changedFields.push("title");
  }

  if (before.summary !== after.summary) {
    changedFields.push("summary");
  }

  if (before.severity !== after.severity) {
    changedFields.push("severity");
  }

  if ((before.recommendation || "") !== (after.recommendation || "")) {
    changedFields.push("recommendation");
  }

  if (
    JSON.stringify(before.evidence || []) !== JSON.stringify(after.evidence || [])
  ) {
    changedFields.push("evidence");
  }

  return changedFields;
}

function compareFindingPair(
  before: StructuredReviewFindingSnapshot,
  after: StructuredReviewFindingSnapshot,
): StructuredReviewFindingComparison {
  return {
    key: before.key,
    title: after.title || before.title,
    before,
    after,
    changedFields: detectChangedFields(before, after),
    severityChange: {
      before: before.severity,
      after: after.severity,
      direction: compareSeverityDirection(before.severity, after.severity),
    },
  };
}

function consumeMatchedPairs(input: {
  beforeGroup: IndexedFinding[];
  afterGroup: IndexedFinding[];
}): {
  matched: Array<{
    before: StructuredReviewFindingSnapshot;
    after: StructuredReviewFindingSnapshot;
  }>;
  remainingBefore: StructuredReviewFindingSnapshot[];
  remainingAfter: StructuredReviewFindingSnapshot[];
} {
  const remainingAfter = [...input.afterGroup];
  const matched: Array<{
    before: StructuredReviewFindingSnapshot;
    after: StructuredReviewFindingSnapshot;
  }> = [];
  const remainingBefore: StructuredReviewFindingSnapshot[] = [];

  for (const beforeEntry of input.beforeGroup) {
    const exactMatchIndex = remainingAfter.findIndex(
      (afterEntry) => afterEntry.detailKey === beforeEntry.detailKey,
    );

    if (exactMatchIndex >= 0) {
      const [matchedAfter] = remainingAfter.splice(exactMatchIndex, 1);
      matched.push({
        before: beforeEntry.snapshot,
        after: matchedAfter.snapshot,
      });
      continue;
    }

    remainingBefore.push(beforeEntry.snapshot);
  }

  while (remainingBefore.length > 0 && remainingAfter.length > 0) {
    const before = remainingBefore.shift();
    const after = remainingAfter.shift();

    if (before && after) {
      matched.push({
        before,
        after: after.snapshot,
      });
    }
  }

  return {
    matched,
    remainingBefore,
    remainingAfter: remainingAfter.map((entry) => entry.snapshot),
  };
}

export function compareStructuredReviewResults(input: {
  before: StructuredReviewResult;
  after: StructuredReviewResult;
}): StructuredReviewResultComparison {
  const beforeGroups = groupFindings(input.before.findings);
  const afterGroups = groupFindings(input.after.findings);
  const groupKeys = new Set([
    ...beforeGroups.keys(),
    ...afterGroups.keys(),
  ]);
  const added: StructuredReviewFindingSnapshot[] = [];
  const removed: StructuredReviewFindingSnapshot[] = [];
  const changed: StructuredReviewFindingComparison[] = [];
  const unchanged: StructuredReviewFindingComparison[] = [];
  const severityMovement = {
    improved: 0,
    regressed: 0,
    unchanged: 0,
  } satisfies Record<StructuredReviewSeverityDirection, number>;

  for (const groupKey of [...groupKeys].sort()) {
    const beforeGroup = beforeGroups.get(groupKey) || [];
    const afterGroup = afterGroups.get(groupKey) || [];
    const { matched, remainingBefore, remainingAfter } = consumeMatchedPairs({
      beforeGroup,
      afterGroup,
    });

    for (const pair of matched) {
      const comparison = compareFindingPair(pair.before, pair.after);
      severityMovement[comparison.severityChange.direction] += 1;

      if (comparison.changedFields.length === 0) {
        unchanged.push(comparison);
      } else {
        changed.push(comparison);
      }
    }

    removed.push(...remainingBefore);
    added.push(...remainingAfter);
  }

  added.sort((a, b) => a.key.localeCompare(b.key) || a.title.localeCompare(b.title));
  removed.sort((a, b) => a.key.localeCompare(b.key) || a.title.localeCompare(b.title));
  changed.sort((a, b) => a.key.localeCompare(b.key) || a.title.localeCompare(b.title));
  unchanged.sort(
    (a, b) => a.key.localeCompare(b.key) || a.title.localeCompare(b.title),
  );

  return {
    overallSeverityChange: {
      before: input.before.overallSeverity,
      after: input.after.overallSeverity,
      direction: compareSeverityDirection(
        input.before.overallSeverity,
        input.after.overallSeverity,
      ),
    },
    counts: {
      beforeFindings: input.before.findings.length,
      afterFindings: input.after.findings.length,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
      severityMovement,
    },
    added,
    removed,
    changed,
    unchanged,
  };
}
