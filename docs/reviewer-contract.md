# Reviewer Contract

AI Quality Loops publishes one reusable reviewer contract: the structured review-result JSON shape. Use it when a caller needs machine-readable findings from text, vision, or batch review output without moving caller policy, private source data, or routing decisions into this package.

## Public Surface

The structured review-result contract includes:

- `schemaVersion`, `workflow`, `expert`, `model`, and `summary` for the review run.
- `overallSeverity` and `findings` for deterministic checks.
- `decision.next_step_actions` as a small safe next-step taxonomy for caller-owned routing, evidence collection, reruns, or follow-up tracking without embedding domain policy.
- `findings[].key` as an optional stable generic label for matching repeated findings across runs.
- `provenance` as sanitized descriptors, not raw URLs, local paths, account names, tracker IDs, or private source names.
- `markdown` as sanitized human-readable review output.

Validate payloads with `validateStructuredReviewResult(...)` or the published `schemas/structured-review-result.schema.json` file.

## Synthetic Examples

- `examples/synthetic-reviewer-contract-review.manifest.json` is a runnable synthetic text-review manifest.
- `examples/synthetic-reviewer-contract-review-context.json` defines the review focus for that manifest.
- `examples/synthetic-reviewer-contract-review-context.md` is the synthetic target packet.
- `examples/synthetic-context-pack-quality-review.manifest.json` is a synthetic context-pack quality review that keeps source retrieval, source interpretation, approval, routing, and retention caller-owned.
- Its paired synthetic context packet intentionally leaves any research-source audit empty because the shared fixture uses opaque evidence labels only; source freshness, retrieval coverage, and approval checks remain caller-owned.
- `examples/synthetic-reviewer-contract-result.fixture.json` is a checked structured-result fixture for consumer tests.

These examples demonstrate the contract only. They do not decide target selection, severity budgets, approval, remediation ownership, tracker routing, publication, deployment, retention, or real-world action.

## Allowed In Shared Examples

- Generic review modes such as text, vision, or batch review.
- Synthetic target labels such as `Synthetic review packet`.
- Generic evidence labels such as `Evidence label A`.
- Stable generic finding keys such as `evidence-support-gap`.
- Safe next-step action labels such as `collect_more_evidence` or `track_follow_up`.
- Boundary statements saying policy, routing, and domain interpretation stay caller-owned.
- Sanitized provenance descriptors that are already safe for a public artifact.

## Rejected From Shared Examples

- Real issue keys, tracker comments, source URLs, local paths, branch names, account names, or hostnames.
- Customer, tenant, household, employee, company, or private project labels.
- Private rubric rules, approval gates, routing policy, escalation aliases, release criteria, or source-retention policy.
- Examples that imply AIQL decides publication, deployment, remediation, purchase, account action, household action, or other real-world effects.

## Promotion Test

Before adding another reviewer-contract example, ask:

Can the example operate only on synthetic or caller-sanitized review content, published AIQL contracts, and generic evidence labels while target selection, private naming, thresholds, routing, and domain interpretation remain caller-owned?

If the answer is no or uncertain, keep the example in the embedding repo or reduce it to a sanitized fixture before moving it here.
