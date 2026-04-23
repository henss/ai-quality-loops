# Reviewer Disagreement Explainer

Use this explainer when two published AIQL structured review-result artifacts cover the same target and a caller needs a bounded disagreement note instead of raw JSON diffs or repo-specific policy.

This seam exists to make reviewer deltas legible and deterministic across local or caller-owned review execution. It is not primarily a prompt-privacy feature, and it does not assume any specific remote-provider boundary.

## What The Artifact Does

- It compares exactly two published `StructuredReviewResult` artifacts for one target.
- It classifies disagreement into finding presence, severity calibration, evidence coverage, recommendation scope, and rationale wording buckets.
- It summarizes likely root-cause gaps with generic labels such as `issue_detection_gap` or `evidence_traceability_gap`.
- It formats one sponsor-facing tie-break note from sanitized result fields, generic labels, and caller-provided artifact labels.

## What The Artifact Does Not Do

- It does not assign reviewers, pick a winner, or decide whether one reviewer was "correct."
- It does not decide approval, routing, remediation ownership, publication, or deployment.
- It does not write trackers, store raw source material, or interpret private domain semantics.
- It does not cluster more than two reviewer outputs or handle same-run arbitration policy.

## Inputs

The artifact expects two already-published structured review-result contracts for the same target:

- `left`: one parsed `StructuredReviewResult`
- `right`: one parsed `StructuredReviewResult`
- optional caller-chosen labels such as `Reviewer A` and `Reviewer B`

Keep result fields public-safe or caller-sanitized before they reach this seam. Finding keys, titles, summaries, evidence labels, and provenance descriptors should stay generic enough for open-source maintenance.

## Output Shape

`adjudicateReviewerDisagreement(...)` returns structured counts and per-finding disagreement details:

- overall severity alignment
- disagreement counts by class
- likely root-cause counts
- one disagreement entry per changed, added, or removed finding

`formatReviewerDisagreementAdjudication(...)` turns that report into one Markdown note with:

- input labels
- disagreement snapshot metrics
- priority tie-break notes
- optional stable-agreement samples
- one explicit boundary reminder

## When To Use It

- Two reviewers looked at the same target and returned conflicting structured results.
- A downstream sponsor or operator needs one compact tie-break note.
- The caller already owns target selection, redaction, and any follow-up policy.

## When Not To Use It

- You only need before/after regression comparison for one reviewer output. Use `compareStructuredReviewResults(...)` instead.
- You need model-cohort comparison across batch summaries. Use `formatMultiModelDisagreementReport(...)` instead.
- You need reviewer assignment policy, quorum rules, arbitration workflows, or tracker-side remediation handling. Keep that layer in the embedding repo.

## Minimal Flow

```ts
import {
  adjudicateReviewerDisagreement,
  compareStructuredReviewResults,
  formatReviewerDisagreementAdjudication
} from "ai-quality-loops";

const adjudication = adjudicateReviewerDisagreement({
  left: reviewerAResult,
  right: reviewerBResult
});

const note = formatReviewerDisagreementAdjudication({
  inputs: {
    left: { pathLabel: "Reviewer A result" },
    right: { pathLabel: "Reviewer B result" }
  },
  comparison: compareStructuredReviewResults({
    before: reviewerAResult,
    after: reviewerBResult
  }),
  adjudication
});
```

For a checked example, compare the helper output against `examples/synthetic-reviewer-disagreement-adjudication.md`.

## Boundary Reminder

AIQL owns the deterministic comparison and the generic tie-break note shape. Embedding repos still own reviewer identity, source interpretation, threshold policy, remediation routing, and any real-world action.

## Generic-Vs-Domain-Specific Extraction Question

The remaining extraction question is narrow and explicit:

Should AIQL ever promote a reusable helper for more-than-two-reviewer arbitration or reviewer-cluster summarization, or should that stay embedding-repo policy because reviewer identity, quorum rules, and escalation semantics usually become domain-specific immediately?

For now, keep that layer outside AIQL unless a future public-safe use case proves the wider helper can remain generic.
