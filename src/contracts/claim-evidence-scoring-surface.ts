export type ClaimEvidenceScoringDimensionId =
  | "claim-proportionality"
  | "evidence-specificity"
  | "caveat-preservation"
  | "purchase-signal-discipline"
  | "authority-boundary";

export type ClaimEvidenceScoreValue = 0 | 1 | 2 | 3;

export type ClaimEvidenceFixtureEvidenceKind =
  | "directional-interview"
  | "conditional-scenario"
  | "repeated-job-note";

export type ClaimEvidenceScoringDisposition =
  | "keep-caveated"
  | "rewrite-narrower";

export interface ClaimEvidenceScoringBoundary {
  genericPurpose: string;
  allowedGenericInputs: string[];
  callerOwnedInputs: string[];
  prohibitedSharedContent: string[];
}

export interface ClaimEvidenceScoreLevel {
  score: ClaimEvidenceScoreValue;
  label: string;
  interpretation: string;
}

export interface ClaimEvidenceScoringDimension {
  id: ClaimEvidenceScoringDimensionId;
  label: string;
  reviewQuestion: string;
  highScoreSignals: string[];
  lowScoreSignals: string[];
}

export interface ClaimEvidenceFixtureEvidenceItem {
  id: string;
  kind: ClaimEvidenceFixtureEvidenceKind;
  summary: string;
  caveat: string;
}

export interface ClaimEvidenceScoringSyntheticFixture {
  id: string;
  claim: string;
  evidence: ClaimEvidenceFixtureEvidenceItem[];
  evidenceRefs: string[];
  expectedScores: Record<ClaimEvidenceScoringDimensionId, ClaimEvidenceScoreValue>;
  expectedDisposition: ClaimEvidenceScoringDisposition;
  rationale: string;
}

export interface ClaimEvidenceScoringContract {
  schemaVersion: "1";
  contract: "claim-evidence-scoring";
  boundary: ClaimEvidenceScoringBoundary;
  scoreLevels: ClaimEvidenceScoreLevel[];
  dimensions: ClaimEvidenceScoringDimension[];
  syntheticFixtures: ClaimEvidenceScoringSyntheticFixture[];
}

export const REQUIRED_CLAIM_EVIDENCE_DIMENSION_IDS: ClaimEvidenceScoringDimensionId[] =
  [
    "claim-proportionality",
    "evidence-specificity",
    "caveat-preservation",
    "purchase-signal-discipline",
    "authority-boundary",
  ];

export const REQUIRED_CLAIM_EVIDENCE_SCORE_VALUES: ClaimEvidenceScoreValue[] = [
  0, 1, 2, 3,
];

export const CLAIM_EVIDENCE_SCORING_CONTRACT: ClaimEvidenceScoringContract = {
  schemaVersion: "1",
  contract: "claim-evidence-scoring",
  boundary: {
    genericPurpose:
      "Score whether a buyer-facing claim stays proportional to supplied synthetic evidence without carrying caller-specific commercialization decisions.",
    allowedGenericInputs: [
      "synthetic claim summaries",
      "sanitized evidence labels",
      "qualitative support notes",
      "explicit caveats",
    ],
    callerOwnedInputs: [
      "real buyer identities",
      "account lists",
      "outreach plans",
      "proof thresholds",
      "pricing or spend policy",
      "publication or routing decisions",
    ],
    prohibitedSharedContent: [
      "private company names",
      "real customer data",
      "deal terms or budgets",
      "private repository paths",
      "caller-specific launch or sales policy",
    ],
  },
  scoreLevels: [
    {
      score: 0,
      label: "unsupported",
      interpretation:
        "The claim materially outruns the supplied evidence or drops a required caveat.",
    },
    {
      score: 1,
      label: "weak",
      interpretation:
        "Some evidence exists, but the claim still needs a narrower wording or stronger caveat.",
    },
    {
      score: 2,
      label: "directional",
      interpretation:
        "The claim is supportable as directional evidence when its caveats remain explicit.",
    },
    {
      score: 3,
      label: "well-bounded",
      interpretation:
        "The claim stays tightly scoped to the evidence and preserves caller-owned boundaries.",
    },
  ],
  dimensions: [
    {
      id: "claim-proportionality",
      label: "Claim proportionality",
      reviewQuestion:
        "Does the wording stay at the same strength as the supplied evidence instead of implying stronger validation?",
      highScoreSignals: [
        "Keeps directional language when support is qualitative",
        "Avoids category-level certainty from narrow observations",
      ],
      lowScoreSignals: [
        "Turns one or two inputs into broad demand language",
        "Treats exploratory evidence as proof of readiness",
      ],
    },
    {
      id: "evidence-specificity",
      label: "Evidence specificity",
      reviewQuestion:
        "Can the claim be traced to concrete synthetic evidence items instead of a vague summary blob?",
      highScoreSignals: [
        "Names which evidence items support the claim",
        "Keeps the support note specific enough to audit later",
      ],
      lowScoreSignals: [
        "Uses generic support with no evidence handle",
        "Combines unrelated evidence into one opaque justification",
      ],
    },
    {
      id: "caveat-preservation",
      label: "Caveat preservation",
      reviewQuestion:
        "Do the scoring notes keep sample, conditionality, and missing-data caveats attached to the claim?",
      highScoreSignals: [
        "Preserves sample and representativeness caveats",
        "Names missing facts that would change the claim",
      ],
      lowScoreSignals: [
        "Drops caveats in the final wording",
        "Uses generic caution language without tying it to the evidence gap",
      ],
    },
    {
      id: "purchase-signal-discipline",
      label: "Purchase-signal discipline",
      reviewQuestion:
        "Does the claim avoid implying willingness to pay, procurement readiness, or commitment when the packet only shows directional interest?",
      highScoreSignals: [
        "Separates workflow pain from purchasing intent",
        "Keeps hypothetical pilot interest distinct from commitment",
      ],
      lowScoreSignals: [
        "Conflates interest with budget or readiness",
        "Treats qualitative support as a purchase signal",
      ],
    },
    {
      id: "authority-boundary",
      label: "Authority boundary",
      reviewQuestion:
        "Does the scoring output remain analysis-only and avoid caller-owned actions such as outreach, spend, launch, or routing?",
      highScoreSignals: [
        "Keeps recommendations limited to wording and caveats",
        "Leaves follow-up decisions caller-owned",
      ],
      lowScoreSignals: [
        "Suggests outreach or publication as if already approved",
        "Turns the shared score into a go-to-market decision",
      ],
    },
  ],
  syntheticFixtures: [
    {
      id: "directional-pain-recognition",
      claim: "Several buyers recognized the workflow pain quickly.",
      evidence: [
        {
          id: "evidence-a",
          kind: "directional-interview",
          summary:
            "Four synthetic interview summaries mention similar friction around the workflow.",
          caveat: "The sample is small, curated, and not representative.",
        },
      ],
      evidenceRefs: ["evidence-a"],
      expectedScores: {
        "claim-proportionality": 2,
        "evidence-specificity": 3,
        "caveat-preservation": 3,
        "purchase-signal-discipline": 3,
        "authority-boundary": 3,
      },
      expectedDisposition: "keep-caveated",
      rationale:
        "The claim can stay if it remains directional and keeps the sample caveat attached.",
    },
    {
      id: "conditional-pilot-interest",
      claim: "A buyer would consider piloting if setup stayed lightweight.",
      evidence: [
        {
          id: "evidence-b",
          kind: "conditional-scenario",
          summary:
            "One hypothetical scenario says a pilot becomes worth considering only when setup stays low-friction.",
          caveat:
            "This is conditional interest and does not show commitment, budget, or readiness.",
        },
      ],
      evidenceRefs: ["evidence-b"],
      expectedScores: {
        "claim-proportionality": 2,
        "evidence-specificity": 3,
        "caveat-preservation": 3,
        "purchase-signal-discipline": 2,
        "authority-boundary": 3,
      },
      expectedDisposition: "keep-caveated",
      rationale:
        "The claim is usable only when the conditional and non-commitment boundary stay explicit.",
    },
    {
      id: "focused-wedge-overreach",
      claim: "The category could support a focused wedge.",
      evidence: [
        {
          id: "evidence-c",
          kind: "repeated-job-note",
          summary:
            "Two synthetic notes describe a repeated narrow job-to-be-done with similar friction.",
          caveat:
            "No market sizing, procurement path, or competitive proof is included.",
        },
      ],
      evidenceRefs: ["evidence-c"],
      expectedScores: {
        "claim-proportionality": 1,
        "evidence-specificity": 2,
        "caveat-preservation": 2,
        "purchase-signal-discipline": 1,
        "authority-boundary": 3,
      },
      expectedDisposition: "rewrite-narrower",
      rationale:
        "The evidence supports a narrow repeated pain pattern, not a category-level wedge claim.",
    },
  ],
};
