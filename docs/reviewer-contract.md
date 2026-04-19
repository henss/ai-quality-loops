# Reviewer Contract Synthetic Example

This note defines the public-safe reviewer-contract example for AI Quality Loops. It is intentionally synthetic: it does not include real tracker state, private repository paths, customer data, account names, product details, release policy, or company-specific workflow labels.

## Classification

Packet output: artifact and proposal.

No new reusable tooling was added. The build-vs-buy scout check is not applicable because this session only adds a documentation note and a synthetic contract fixture; it does not add a shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Public Contract Surface

The reusable reviewer contract is the existing structured review-result shape:

- `schemaVersion`, `workflow`, `expert`, `model`, and `summary` identify the review run without exposing raw source names.
- `overallSeverity` and `findings` provide deterministic fields for downstream checks.
- `findings[].key` is optional. Use it only when a reviewer or wrapper can provide a stable generic label for the same issue across repeated runs without embedding private names, paths, URLs, account identifiers, tracker IDs, or domain policy.
- `provenance` contains sanitized descriptors only, such as generic source labels, not raw URLs, local paths, or private capture names.
- `markdown` preserves human-readable review output after the same review-surface sanitization has been applied.

The package already validates this shape with `validateStructuredReviewResult(...)` and the published `schemas/structured-review-result.schema.json` artifact.

## Synthetic Fixture

Use `examples/synthetic-reviewer-contract-result.fixture.json` when a consumer needs a public-safe example payload. The fixture demonstrates a text review over a made-up review packet with generic findings, synthetic evidence labels, and caller-owned action boundaries.

The fixture is deliberately not a workflow recipe. It should not teach how to select targets, route findings, approve changes, open tickets, retain evidence, or map review output to domain action. Those choices stay in the embedding repo.

## Boundary Rules

Allowed in the shared example:

- generic review modes such as text, vision, or batch summary review
- synthetic target labels such as "Synthetic review packet"
- generic evidence labels such as "Evidence label A"
- caller-owned boundary statements that say policy, routing, and domain interpretation stay outside AIQL
- sanitized provenance descriptors that are already safe to show in a public artifact

Rejected from the shared example:

- real issue keys, tracker comments, source URLs, local paths, or branch names
- customer, account, tenant, household, employee, or company-specific labels
- private rubric rules, approval gates, routing policy, escalation aliases, or release criteria
- examples that imply AIQL should decide publication, deployment, remediation, or real-world action

## Extraction Question

Before adding another reviewer-contract example or helper, ask:

Can the example operate only on synthetic or caller-sanitized review content, published AIQL contracts, and generic evidence labels, while target selection, private naming, policy thresholds, routing, and domain interpretation remain caller-owned?

If the answer is no or uncertain, keep the example in the embedding repo or reduce it to a sanitized fixture before moving it into AIQL.
