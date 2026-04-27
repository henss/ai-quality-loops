# Reviewer Contract

AI Quality Loops publishes one reusable reviewer contract: the structured review-result JSON shape. Use it when a caller needs machine-readable findings from text, vision, or batch review output without moving caller policy, private source data, or routing decisions into this package.

## Public Surface

The structured review-result contract includes:

- `schemaVersion`, `workflow`, `expert`, `model`, and `summary` for the review run.
- `overallSeverity` and `findings` for deterministic checks.
- `decision.next_step_actions` as a small safe next-step taxonomy for caller-owned routing, evidence collection, reruns, or follow-up tracking without embedding domain policy.
- `decision.verdict: "abstain_request_evidence"` plus `decision.evidence_requests[]` for cases where the reviewer cannot judge a claim until the caller supplies specific missing evidence.
- `findings[].key` as an optional stable generic label for matching repeated findings across runs.
- `provenance` as sanitized descriptors, not raw URLs, local paths, account names, tracker IDs, or private source names.
- `provenance[].freshness` as an optional per-source signal for whether a note reflects a live refresh, a mirrored current-state digest, or historical context.
- `provenance[].authority` as an optional per-source signal for whether a note is the source of truth, a derived summary, or an advisory boundary reminder.
- `markdown` as sanitized human-readable review output.

Validate payloads with `validateStructuredReviewResult(...)` or the published `schemas/structured-review-result.schema.json` file.

## Synthetic Examples

- `examples/reviewer-contract-starter-kit/` is the minimal copy-ready starter kit for external contributors or embedding repos that want one reviewer-contract seam without adopting extra package-owned tooling.
- Its templates show the smallest manifest, context file, and review packet shape that still preserves caller-owned authority boundaries.
- `examples/reviewer-contract-sample-packs/` publishes three copy-ready conformance packs for reviewer implementations: one evidence-support gap, one evidence-request abstention, and one caller-owned action-boundary gap.
- Each sample pack includes a runnable manifest plus an expected structured-result fixture so contributors can tell whether mismatches are about contract shape, missing stable finding keys, missing decision actions, or lost boundary language.
- `examples/synthetic-reviewer-contract-review.manifest.json` is a runnable synthetic text-review manifest.
- `examples/synthetic-reviewer-contract-review-context.json` defines the review focus for that manifest.
- `examples/synthetic-reviewer-contract-review-context.md` is the synthetic target packet.
- `examples/synthetic-venture-concept-brief-review.manifest.json` is a runnable synthetic text-review manifest for concept-brief evidence discipline.
- Its paired synthetic context packet keeps venture framing generic and analysis-only so proof thresholds, launch decisions, prioritization, spend, and follow-up routing stay caller-owned.
- `examples/synthetic-context-pack-quality-review.manifest.json` is a synthetic context-pack quality review that keeps source retrieval, source interpretation, approval, routing, and retention caller-owned.
- Its paired synthetic context packet intentionally leaves both the research-source audit and any public-source list empty because the shared fixture uses opaque evidence labels only; source freshness, retrieval coverage, public-source selection, and approval checks remain caller-owned.
- `reviews/context-pack-quality/synthetic-context-pack-quality-packet-expert-review.md` and `reviews/context-pack-quality/json/synthetic-context-pack-quality-packet-expert-review.json` are checked-in synthetic review artifacts showing the expected public-safe verdict shape for that seam without turning the empty audit into proof that any real source check already passed.
- `examples/synthetic-temporal-anomaly-review.manifest.json` is a runnable synthetic text-review manifest for apartment-agnostic temporal anomaly packets.
- Its paired context packet keeps frame labels, zone labels, and follow-up language generic so occupancy, identity, household action, retention, and downstream routing remain caller-owned.
- `reviews/temporal-anomaly/synthetic-temporal-anomaly-packet-expert-review.md` and `reviews/temporal-anomaly/json/synthetic-temporal-anomaly-packet-expert-review.json` are checked-in synthetic review artifacts showing one promising-but-caveated anomaly lane without promoting household semantics into AIQL.
- `examples/synthetic-reviewer-contract-result.fixture.json` is a checked structured-result fixture for consumer tests.
- That fixture now demonstrates three public-safe provenance scenarios: live source-of-truth evidence, mirrored current-state evidence, and historical advisory context.

These examples demonstrate the contract only. They do not decide target selection, severity budgets, approval, remediation ownership, tracker routing, publication, deployment, retention, or real-world action.

## Starter Kit Use

For the narrowest onboarding path, start with `examples/reviewer-contract-starter-kit/`:

1. Copy the four template files into your repo.
2. Replace the packet body with caller-sanitized content and keep evidence labels generic.
3. Run `batch-review` against the copied manifest from your own repo.
4. Optionally run the copied validation script against the emitted structured JSON before adding your own schema tooling.

If you need repo-specific routing, CI budgets, or tracker writes, add them in the embedding repo instead of widening the shared reviewer-contract surface here.

## Sample Pack Conformance

Use `examples/reviewer-contract-sample-packs/` when a reviewer implementation needs a small public-safe target before it runs on caller-owned packets. The expected fixtures are not model goldens; they define the minimum structured-result shape and reviewer signals that should survive across implementations. Different prose or additional findings are fine when the stable generic finding keys, evidence labels, decision actions, provenance, and caller-owned boundary language remain clear.

Run each pack with `batch-review`, validate the emitted structured JSON with the starter-kit validation script, then compare only the stable contract signals against the checked-in `*.expected.json` fixture. Do not treat wording, finding order, or additional caveats as failures when the schema, verdict, next-step actions, stable keys, provenance labels, and caller-owned boundary language still line up.

The sample-pack surface is deliberately file-based. It does not adopt a hosted workflow runner, scheduler, dashboard, or extra validation dependency because conformance here is only a checked fixture contract; embedding repos should add their own CI or routing wrapper when they need one.

## Allowed In Shared Examples

- Generic review modes such as text, vision, or batch review.
- Synthetic target labels such as `Synthetic review packet`.
- Generic evidence labels such as `Evidence label A`.
- Stable generic finding keys such as `evidence-support-gap`.
- Safe next-step action labels such as `request_evidence`, `collect_more_evidence`, or `track_follow_up`.
- Stable generic evidence request keys such as `missing-evidence-label-c-summary`.
- Boundary statements saying policy, routing, and domain interpretation stay caller-owned.
- Sanitized provenance descriptors that are already safe for a public artifact.
- Optional provenance freshness and authority notes that use the published generic enums rather than domain-specific workflow labels.

## Rejected From Shared Examples

- Real issue keys, tracker comments, source URLs, local paths, branch names, account names, or hostnames.
- Customer, tenant, household, employee, company, or private project labels.
- Private rubric rules, approval gates, routing policy, escalation aliases, release criteria, or source-retention policy.
- Examples that imply AIQL decides publication, deployment, remediation, purchase, account action, household action, or other real-world effects.

## Promotion Test

Before adding another reviewer-contract example, ask:

Can the example operate only on synthetic or caller-sanitized review content, published AIQL contracts, and generic evidence labels while target selection, private naming, thresholds, routing, and domain interpretation remain caller-owned?

If the answer is no or uncertain, keep the example in the embedding repo or reduce it to a sanitized fixture before moving it here.
