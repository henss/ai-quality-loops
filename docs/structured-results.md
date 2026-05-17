# Structured Results

Structured results are the public contract for reusable AIQL review output. They let callers validate, compare, and gate review findings without scraping Markdown or copying private workflow policy into this package.

In the portfolio strategy, this contract is AIQL's core durable surface: local-first review artifacts that downstream repos can validate, compare, gate, and archive. It is not a hosted eval dashboard, hosted observability trace, or replacement for LangSmith, Braintrust, Langfuse, or similar tools.

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
- Hosted trace storage, dashboards, prompt-management workflows, broad eval experiment history, and model observability decisions unless a caller explicitly adopts a third-party tool at the artifact boundary.

## Public Fixtures

- `examples/synthetic-reviewer-contract-result.fixture.json` validates the base structured review-result shape.
- `examples/synthetic-structured-result-golden-diff-before.fixture.json` and `examples/synthetic-structured-result-golden-diff-after.fixture.json` validate deterministic before/after comparison.
- `examples/synthetic-structured-result-golden-diff.expected.json` stores the expected comparison plus the before/after fixture provenance for `compareStructuredReviewResults(...)`, and `examples/synthetic-structured-result-golden-diff.expected.md` locks the compact text output for the improved comparison.
- `examples/synthetic-structured-result-golden-regression-before.fixture.json` and `examples/synthetic-structured-result-golden-regression-after.fixture.json` document a deterministic failing/regressed comparison.
- `examples/synthetic-structured-result-golden-regression.expected.json` stores the expected regression comparison plus the before/after fixture provenance, and `examples/synthetic-structured-result-golden-regression.expected.md` locks the compact text output for that failing comparison.
- `examples/synthetic-review-output-evidence-diff-before.fixture.json` and `examples/synthetic-review-output-evidence-diff-after.fixture.json` isolate an evidence-only comparison delta.
- `examples/synthetic-review-output-evidence-diff.expected.json` stores the expected comparison plus the before/after fixture provenance, and `examples/synthetic-review-output-evidence-diff.expected.md` locks the compact text output for that evidence-only delta.
- `examples/synthetic-compact-evidence-pack-diff-before.fixture.json` and `examples/synthetic-compact-evidence-pack-diff-after.fixture.json` isolate a compact evidence-pack comparison delta.
- `examples/synthetic-compact-evidence-pack-diff.expected.json` stores the expected comparison plus the before/after fixture provenance, and `examples/synthetic-compact-evidence-pack-diff.expected.md` locks the compact text output for that evidence-pack delta.
- `examples/synthetic-temporal-anomaly-diff-before.fixture.json` and `examples/synthetic-temporal-anomaly-diff-after.fixture.json` isolate an apartment-agnostic temporal anomaly comparison delta using synthetic frames and generic zones only.
- `examples/synthetic-temporal-anomaly-diff.expected.json` stores the expected comparison plus the before/after fixture provenance, and `examples/synthetic-temporal-anomaly-diff.expected.md` locks the compact text output for that improved anomaly comparison.

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

## Sponsor-Packet Handoff Gate

Use `validateReviewResultSponsorPacketHandoff(...)` when one structured review result is about to become a sponsor memo plus backlog-candidate handoff and the caller wants an explicit public-safe quality gate before routing:

```ts
import {
  formatReviewSponsorMemo,
  renderLinearCandidateHandoffYaml,
  validateReviewResultSponsorPacketHandoff
} from "ai-quality-loops";

const handoffGate = validateReviewResultSponsorPacketHandoff(reviewResult);
if (!handoffGate.ok) {
  throw handoffGate.error;
}

const memo = formatReviewSponsorMemo(reviewResult);
const candidateYaml = renderLinearCandidateHandoffYaml(reviewResult);
```

The gate remains deliberately limited:

- It reads only one published `StructuredReviewResult`.
- It checks that the result has at least one candidate-worthy finding at the configured severities.
- It requires actionable recommendations and evidence labels for those findings by default.
- It treats missing explicit decisions, rerun-required reviews, and evidence-collection-required reviews as handoff-quality failures instead of inferring readiness.
- It does not decide sponsorship, priority, ownership, tracker writes, or domain-specific routing.

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

Use the golden-diff fixtures when you need both sides of the comparison story without inventing private examples: the `golden-diff` pack shows one successful/improved comparison, and the `golden-regression` pack shows one failing/regressed comparison over the same public-safe contract.

The compact evidence-diff fixture stays generic only while the comparison consumes already-published structured review results with sanitized evidence labels. If a future workflow needs source-handle resolution, evidence ranking, or approval thresholds, keep that layer in the embedding repo instead of widening AIQL.

The compact evidence-pack fixture follows the same boundary: it covers only before/after comparison over already-published structured review results with synthetic evidence labels. If a future workflow needs packet assembly, source resolution, or private evidence semantics, keep that layer in the embedding repo instead of widening AIQL.

The temporal anomaly fixture follows the same boundary: it covers only public-safe before/after comparison over already-published structured review results with synthetic frames, generic zones, and no private household facts. If a future workflow needs raw imagery, room identity, resident inference, alert policy, or retention semantics, keep that layer in the embedding repo instead of widening AIQL.

The remaining extraction question is whether any future single-target pass/fail gate over these comparison artifacts would stay generic enough for open-source maintenance. AIQL currently stops at deterministic comparison output and leaves budgets, policy thresholds, and accept/reject decisions caller-owned.

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

Use `docs/reviewer-disagreement-explainer.md` when a downstream consumer needs the artifact-focused boundary, usage test, and explicit generic-vs-domain-specific extraction question for this seam.

## Escalation Signal Classification

Use `classifyReviewEscalationSignals(...)` when a caller wants one generic list of notable review-output signals without hard-coding verdict, severity, and next-step interpretation in multiple wrappers:

```ts
import { classifyReviewEscalationSignals } from "ai-quality-loops";

const report = classifyReviewEscalationSignals(reviewResult);
```

The classifier is intentionally narrow:

- It reads only the published `StructuredReviewResult` contract.
- It emits generic signal ids for severe findings, blocking or failed decisions, and caller-review or evidence-collection next steps.
- It does not assign owners, mutate trackers, decide whether a queue should be escalated, or map signals to domain-specific policy.
- If a workflow needs issue creation, escalation aliases, approval thresholds, release policy, or private-domain routing, keep that layer in the embedding repo.
