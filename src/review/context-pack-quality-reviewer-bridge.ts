import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

export interface ContextPackQualityBridgeEvidenceHandle {
  label: string;
  sourceHandle: string;
  intendedUse: string;
  caveat?: string;
}

export interface ContextPackQualityBridgeClaim {
  claim: string;
  evidenceLabels: string[];
  caveat?: string;
}

export interface ContextPackQualityReviewerBridgeInput {
  reviewSurface: string;
  reviewGoal: string;
  evidenceHandles: ContextPackQualityBridgeEvidenceHandle[];
  claims: ContextPackQualityBridgeClaim[];
  constraints?: string[];
  knownGaps?: string[];
  continuation?: string;
  callerOwnedBoundaries?: string[];
  reviewerPosture?: string[];
}

export interface ContextPackQualityReviewerBridgeContext {
  reviewSurface: string;
  reviewFocus: string[];
  outOfScope: string[];
}

export interface ContextPackQualityReviewerBridge {
  reviewContext: ContextPackQualityReviewerBridgeContext;
  reviewPacketMarkdown: string;
}

function sanitizeText(value: string, maxLength = 220): string {
  return sanitizeReviewSurfaceValue(value, {
    maxLength,
  });
}

function sanitizeList(values: readonly string[], maxLength = 220): string[] {
  return values.map((value) => sanitizeText(value, maxLength));
}

function assertNonEmpty(value: string, fieldName: string): void {
  if (!value.trim()) {
    throw new Error(`${fieldName} must not be empty.`);
  }
}

function assertNonEmptyList<T>(
  values: readonly T[],
  fieldName: string,
): void {
  if (values.length === 0) {
    throw new Error(`${fieldName} must contain at least one entry.`);
  }
}

function validateBridgeInput(
  input: ContextPackQualityReviewerBridgeInput,
): void {
  assertNonEmpty(input.reviewSurface, "reviewSurface");
  assertNonEmpty(input.reviewGoal, "reviewGoal");
  assertNonEmptyList(input.evidenceHandles, "evidenceHandles");
  assertNonEmptyList(input.claims, "claims");

  const evidenceLabels = new Set<string>();

  for (const [index, evidenceHandle] of input.evidenceHandles.entries()) {
    assertNonEmpty(evidenceHandle.label, `evidenceHandles[${index}].label`);
    assertNonEmpty(
      evidenceHandle.sourceHandle,
      `evidenceHandles[${index}].sourceHandle`,
    );
    assertNonEmpty(
      evidenceHandle.intendedUse,
      `evidenceHandles[${index}].intendedUse`,
    );
    evidenceLabels.add(evidenceHandle.label.trim());
  }

  for (const [index, claim] of input.claims.entries()) {
    assertNonEmpty(claim.claim, `claims[${index}].claim`);
    assertNonEmptyList(claim.evidenceLabels, `claims[${index}].evidenceLabels`);

    for (const evidenceLabel of claim.evidenceLabels) {
      assertNonEmpty(evidenceLabel, `claims[${index}].evidenceLabels[]`);
      if (!evidenceLabels.has(evidenceLabel.trim())) {
        throw new Error(
          `claims[${index}] references unknown evidence label "${evidenceLabel}".`,
        );
      }
    }
  }
}

function formatBulletList(values: readonly string[]): string[] {
  return values.map((value) => `- ${value}`);
}

function formatEvidenceRegistry(
  evidenceHandles: readonly ContextPackQualityBridgeEvidenceHandle[],
): string[] {
  const lines = [
    "| Evidence label | Source handle | Intended use | Caveat |",
    "| --- | --- | --- | --- |",
  ];

  for (const evidenceHandle of evidenceHandles) {
    lines.push(
      `| ${sanitizeText(evidenceHandle.label, 120)} | \`${sanitizeText(
        evidenceHandle.sourceHandle,
        160,
      )}\` | ${sanitizeText(evidenceHandle.intendedUse)} | ${sanitizeText(
        evidenceHandle.caveat ??
          "Opaque handle only; caller-owned source resolution still determines truth, freshness, and approval.",
      )} |`,
    );
  }

  return lines;
}

function formatClaimsTable(
  claims: readonly ContextPackQualityBridgeClaim[],
): string[] {
  const lines = [
    "| Claim | Evidence labels | Caveat |",
    "| --- | --- | --- |",
  ];

  for (const claim of claims) {
    lines.push(
      `| ${sanitizeText(claim.claim)} | ${sanitizeList(
        claim.evidenceLabels,
        120,
      )
        .map((label) => `\`${label}\``)
        .join(", ")} | ${sanitizeText(
        claim.caveat ??
          "Handle presence alone does not prove completeness, retrieval quality, or downstream readiness.",
      )} |`,
    );
  }

  return lines;
}

export function createContextPackQualityReviewerBridge(
  input: ContextPackQualityReviewerBridgeInput,
): ContextPackQualityReviewerBridge {
  validateBridgeInput(input);

  const reviewSurface = sanitizeText(input.reviewSurface, 160);
  const reviewGoal = sanitizeText(input.reviewGoal);
  const constraints = sanitizeList(input.constraints ?? []);
  const knownGaps = sanitizeList(input.knownGaps ?? []);
  const continuation = input.continuation
    ? sanitizeText(input.continuation)
    : null;
  const callerOwnedBoundaries = sanitizeList(input.callerOwnedBoundaries ?? []);
  const reviewerPosture = sanitizeList(input.reviewerPosture ?? []);

  const reviewContext: ContextPackQualityReviewerBridgeContext = {
    reviewSurface,
    reviewFocus: [
      "Check whether the context pack gives a downstream reviewer enough bounded evidence to run one review without broad rediscovery.",
      "Flag missing or ambiguous source handles, unsupported completeness claims, weak retrieval usefulness, and over-broad readiness language.",
      "Treat source handles as opaque caller-owned retrieval hints, not copied truth, portable resolution schemas, or proof that freshness and approval checks already happened.",
      "Check that evidence quality remains explicit even though the bridge omits copied source contents and keeps source interpretation caller-owned.",
      "Keep source resolution, freshness checks, public-source selection, approval, routing, and retention caller-owned.",
    ],
    outOfScope: [
      "Resolving the underlying sources, reconstructing private source contents, or inferring hidden tracker state from opaque handles.",
      "Approving publication, deployment, remediation ownership, priority, scheduling, routing, or other real-world action.",
      "Treating handle presence, omitted public-source surfaces, or caller-written summaries as proof that source freshness, retrieval coverage, or approval already passed.",
    ],
  };

  const reviewPacketMarkdown = [
    `# ${reviewSurface}`,
    "",
    "This caller-owned bridge packet is designed for one bounded AIQL pack-quality review. It uses opaque source handles and scoped claims only, so the shared review surface can assess completeness and evidence discipline without copying canonical source truth.",
    "",
    "## Review Goal",
    "",
    reviewGoal,
    "",
    "## Evidence Registry",
    "",
    ...formatEvidenceRegistry(input.evidenceHandles),
    "",
    "## Claims To Review",
    "",
    ...formatClaimsTable(input.claims),
    "",
    "## Required Caller-Owned Surfaces",
    "",
    "| Pack surface | Status | Caveat |",
    "| --- | --- | --- |",
    "| Research-source audit | Caller-owned outside this bridge. | The bridge does not claim that freshness, coverage, or approval checks already happened. |",
    "| Public-source list | Caller-owned outside this bridge. | Opaque handles do not imply that any public-safe source list was copied into this packet. |",
    "",
    "## Constraints",
    "",
    ...formatBulletList(
      constraints.length > 0
        ? constraints
        : [
            "Keep source resolution, source freshness, public-source selection, approval, routing, and retention caller-owned.",
            "Do not treat handle presence as proof of downstream readiness or action authority.",
          ],
    ),
    "",
    "## Known Gaps",
    "",
    ...formatBulletList(
      knownGaps.length > 0
        ? knownGaps
        : [
            "This bridge packet omits copied source excerpts and private domain truth by design.",
            "A caller-owned workflow must still verify whether each handle resolves to current source truth before any downstream action.",
          ],
    ),
    "",
    "## Caller-Owned Boundary",
    "",
    ...formatBulletList(
      callerOwnedBoundaries.length > 0
        ? callerOwnedBoundaries
        : [
            "AIQL can review pack quality only; it does not become the source of truth, memory layer, tracker mirror, or routing authority.",
            "Any follow-up prioritization, tracker mutation, or execution decision remains caller-owned outside ai-quality-loops.",
          ],
    ),
    "",
    "## Expected Reviewer Posture",
    "",
    ...formatBulletList(
      reviewerPosture.length > 0
        ? reviewerPosture
        : [
            "Report missing evidence handles, ambiguous handle-to-claim coverage, copied-truth risk, and unsupported readiness claims as findings.",
            "Treat the omitted research-source audit and public-source list as boundary reminders, not hidden proof that external checks already passed.",
            "Keep recommendations limited to pack-quality fixes, caller-owned confirmation, and boundary clarification.",
          ],
    ),
    ...(continuation
      ? ["", "## Continuation", "", continuation]
      : []),
  ].join("\n");

  return {
    reviewContext,
    reviewPacketMarkdown,
  };
}
