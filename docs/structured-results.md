# Structured Results

Structured results are the public contract for reusable AIQL review output. They let callers validate, compare, and gate review findings without scraping Markdown or copying private workflow policy into this package.

## Use This Contract For

- Checking whether a review emitted valid JSON.
- Comparing one review result against a later result.
- Adjudicating two reviewer outputs over one target when a caller needs a deterministic tie-break note.
- Feeding caller-owned CI or local gates with finding counts and severities.
- Building downstream summaries from sanitized finding titles, summaries, recommendations, evidence labels, and provenance descriptors.

## Keep Caller-Owned

- Target selection and source retrieval.
- Private redaction rules and private examples.
- Severity budgets and acceptance thresholds.
- Tracker routing, remediation ownership, publication decisions, deployment decisions, retention policy, and real-world action.

## Public Fixtures

- `examples/synthetic-reviewer-contract-result.fixture.json` validates the base structured review-result shape.
- `examples/synthetic-structured-result-golden-diff-before.fixture.json` and `examples/synthetic-structured-result-golden-diff-after.fixture.json` validate deterministic before/after comparison.
- `examples/synthetic-structured-result-golden-diff.expected.json` is the expected output from `compareStructuredReviewResults(...)`.

The fixtures use generic evidence labels and synthetic review packets only. Replace them in embedding repos only with caller-sanitized data.

## Validation

Use the package helper when code already imports AIQL:

```ts
import { validateStructuredReviewResult } from "ai-quality-loops";

const validation = validateStructuredReviewResult(reviewResultJson);
if (!validation.ok) {
  throw validation.error;
}
```

Use the schema file when a wrapper validates outside TypeScript:

```text
schemas/structured-review-result.schema.json
```

## Comparison

Use `compareStructuredReviewResults(...)` when a caller needs deterministic single-target before/after comparison:

```ts
import { compareStructuredReviewResults } from "ai-quality-loops";

const comparison = compareStructuredReviewResults({
  before: previousReviewResult,
  after: currentReviewResult
});
```

The comparison groups findings by `findings[].key` when present, then by normalized title or summary. Use stable generic keys when repeated runs may reword the same finding. Do not put private source names, issue IDs, URLs, paths, account identifiers, or policy labels in keys.

## Reviewer Disagreement Adjudication

Use `adjudicateReviewerDisagreement(...)` plus `formatReviewerDisagreementAdjudication(...)` when two published structured review results cover the same target and a caller needs one bounded sponsor-facing tie-break note:

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

The adjudication seam remains public-safe and deliberately limited:

- It works only from two already-published structured review-result artifacts.
- It uses deterministic field-level differences to bucket disagreement into finding presence, severity, evidence, recommendation, and wording.
- It helps a caller summarize likely root-cause gaps and tie-break questions without deciding approval, routing, or remediation policy.
- If a workflow needs reviewer assignment policy, same-run orchestration, multi-review clustering, or tracker writes, keep that layer in the embedding repo.
