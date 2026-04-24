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

- `examples/reviewer-contract-starter-kit/` is the minimal copy-ready starter kit for external contributors or embedding repos that want one reviewer-contract seam without adopting extra package-owned tooling.
- Its templates show the smallest manifest, context file, and review packet shape that still preserves caller-owned authority boundaries.
- `examples/synthetic-reviewer-contract-review.manifest.json` is a runnable synthetic text-review manifest.
- `examples/synthetic-reviewer-contract-review-context.json` defines the review focus for that manifest.
- `examples/synthetic-reviewer-contract-review-context.md` is the synthetic target packet.
- `examples/synthetic-venture-concept-brief-review.manifest.json` is a runnable synthetic text-review manifest for concept-brief evidence discipline.
- Its paired synthetic context packet keeps venture framing generic and analysis-only so proof thresholds, launch decisions, prioritization, spend, and follow-up routing stay caller-owned.
- `examples/synthetic-context-pack-quality-review.manifest.json` is a synthetic context-pack quality review that keeps source retrieval, source interpretation, approval, routing, and retention caller-owned.
- Its paired synthetic context packet intentionally leaves both the research-source audit and any public-source list empty because the shared fixture uses opaque evidence labels only; source freshness, retrieval coverage, public-source selection, and approval checks remain caller-owned.
- `reviews/context-pack-quality/synthetic-context-pack-quality-packet-expert-review.md` and `reviews/context-pack-quality/json/synthetic-context-pack-quality-packet-expert-review.json` are checked-in synthetic review artifacts showing the expected public-safe verdict shape for that seam without turning the empty audit into proof that any real source check already passed.
- `examples/synthetic-reviewer-contract-result.fixture.json` is a checked structured-result fixture for consumer tests.

These examples demonstrate the contract only. They do not decide target selection, severity budgets, approval, remediation ownership, tracker routing, publication, deployment, retention, or real-world action.

## Starter Kit Use

For the narrowest onboarding path, start with `examples/reviewer-contract-starter-kit/`:

1. Copy the four template files into your repo.
2. Replace the packet body with caller-sanitized content and keep evidence labels generic.
3. Run `batch-review` against the copied manifest from your own repo.
4. Optionally run the copied validation script against the emitted structured JSON before adding your own schema tooling.

If you need repo-specific routing, CI budgets, or tracker writes, add them in the embedding repo instead of widening the shared reviewer-contract surface here.

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
