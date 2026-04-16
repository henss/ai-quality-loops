# SMARTSEER-Safe Shared Review Seam Scout

This source-list-only scout records the OPS-858 proposal for a reusable review seam that can support public AIQL adopters, SMARTSEER-style reuse, and private embedding repos without reading or describing private implementation. It uses only repository-local public surfaces and generic downstream labels.

## Classification

Packet output: investigation and proposal.

No implementation path was chosen. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, agent infrastructure, adapter, review loop, extraction tool, observability, scheduling, memory/context surface, or package-like code.

## Source List Reviewed

- `README.md`
- `src/index.ts`
- `docs/capture-review-adapter-contract.md`
- `docs/adoption-pressure-matrix.md`
- `docs/public-private-utility-boundary-review.md`
- `docs/smartseer-safe-review-utility-boundary-inventory.md`
- `examples/ci-review-gate-check.md`

No private implementation, Jira content, client data, product-specific workflow, or company-specific source was read.

## Existing Safe Seam

The reusable seam is already present as a composition of public AIQL primitives:

- generic review execution through `expert-review`, `vision-review`, and `batch-review`
- structured review contracts for individual results, batch summaries, and batch summary comparisons
- explicit gates through `review-gate` with caller-owned budgets
- comparison reporting through `batch-review-compare`
- caller-supplied redactions through `defineReviewSurfaceRedactions(...)`
- capture handoff through the manifest-shaped adapter contract, where the embedding repo owns target selection, raw artifacts, retention, private labels, and action routing

This is enough for a SMARTSEER-safe shared review path when the embedding repo supplies only sanitized inputs, placeholder labels, explicit budgets, and caller-owned policy.

## Proposal

Do not add a new public helper for OPS-858. The safest shared path is a documentation-backed composition pattern:

1. The embedding repo emits a generic `BatchReviewManifest` with sanitized target labels.
2. AIQL runs `batch-review` and writes structured review artifacts.
3. Optional before/after checks use `batch-review-compare --json`.
4. `review-gate` enforces explicit caller-owned thresholds.
5. Any ticket creation, release decision, escalation, or domain interpretation stays outside AIQL.

If this setup repeats in another sanitized downstream adoption, the next public AIQL slice should be a documentation-only comparison-gate recipe with placeholder paths and budgets. It should not become a CLI wrapper unless repeated adoption proves that the missing piece is generic command wiring rather than private policy.

## Extraction Question

The remaining generic-vs-domain-specific question is:

Can the repeated review need be expressed as a generic manifest plus structured review contracts, caller-owned redactions, caller-owned budgets, and sanitized evidence labels, with no private target selection, workflow names, policy thresholds, action routing, or domain interpretation in AIQL?

If yes, document the composition as a public recipe. If no or uncertain, keep the wrapper in the embedding repo and pass only sanitized review inputs through AIQL.

## Continuation

Recommended action: monitor one real sanitized downstream adoption before adding package code.

The downside of waiting is low because the current public surface already supports the safe composition. The downside of acting now is higher: a convenience wrapper could accidentally encode private workflow shape, naming, budgets, or routing as open-source defaults.
