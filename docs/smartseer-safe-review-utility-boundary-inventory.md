# SMARTSEER-Safe Review Utility Boundary Inventory

This inventory records the OPS-693 boundary decision for review utilities that may be reused across public AIQL adopters and private embedding repos. It uses only synthetic examples and generic caller labels; it does not document private workflows, customer data, product details, source paths, tracker states, or company-specific implementation.

## Classification

Packet output: proposal and artifact update.

No implementation path was chosen. The safe deliverable is a reusable boundary inventory that future agents can consult before promoting review helpers into the public package. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Existing Public Surface

AIQL already exposes the generic pieces needed for SMARTSEER-safe review composition:

- `expert-review`, `vision-review`, `batch-review`, `review-gate`, `review-compare`, and `batch-review-compare` operate on caller-supplied targets and explicit budgets.
- `BatchReviewManifest`, structured review results, batch summaries, comparison reports, and JSON schema helpers provide published contract surfaces without private policy.
- `HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT` covers authority boundaries, evidence chains, uncertainty handling, scenario coverage, recommendation traceability, adversarial review, and output discipline with synthetic fixtures.
- `defineReviewSurfaceRedactions(...)` lets callers inject private redaction rules without converting those rules into AIQL defaults.
- `docs/capture-review-adapter-contract.md` keeps capture selection, raw artifacts, retention, domain semantics, and action routing in the embedding repo.
- `docs/redaction-boundary-checks-private-policy-split.md` records the redaction-boundary split: generic sanitization stays public, while private rule bundles, field semantics, and policy bindings stay caller-owned.

## Boundary Inventory

| Candidate review utility | Public AIQL boundary | Caller-owned boundary | Decision |
| --- | --- | --- | --- |
| High-impact analysis rubric | Keep the generic rubric dimensions, parser, validator, schema, and synthetic fixtures. | Domain facts, approval gates, proof thresholds, execution policy, source routing, and real entity identifiers. | Keep public as-is; add only synthetic dimension-shape improvements when repeated generic use proves a gap. |
| Claim or recommendation risk review | Generic evidence traceability, uncertainty, authority-boundary, and adversarial-review prompts can reuse `expert-review` plus the high-stakes rubric. | Risk taxonomy, reputation thresholds, legal-adjacent posture, buyer context, customer impact labels, and action recommendations. | Split. Compose caller-owned rules over AIQL contracts instead of adding a package-level checker. |
| Capture or image review adapter | Manifest shape, vision review execution, sanitized provenance, structured findings, and gateable summaries. | Capture selection, raw image handling, retention, private labels, naming, and finding-to-action mapping. | Split. Use the adapter contract; do not publish private wrapper examples. |
| Review regression gate | `batch-review-compare --json`, `review-gate --batch-comparison`, explicit severity budgets, and sanitized input labels. | Baseline selection, budget values, escalation behavior, approval authority, and release policy. | Monitor. A documentation-only recipe is safe if repeated adoption friction appears; no new helper yet. |
| Packet, tracker, or workflow critique helper | Generic text review over sanitized content with caller-selected persona and optional structured output. | Tracker schema, issue state, routing policy, project labels, approval states, and coordination comments. | Split or defer. Use `expert-review` from the embedding repo until a domain-neutral contract emerges. |
| Persona or prompt presets for private domains | Universal personas and generic prompt-library loading. | Private personas, domain terms, escalation aliases, and source-specific redactions. | Split. Keep private prompt libraries in embedding repos. |
| Result interpretation and ticket creation | Structured findings, severity rollups, comparisons, and explicit gate violations. | Whether a finding opens a ticket, blocks a release, pages someone, or changes real-world state. | Split. AIQL can report; callers decide. |
| Redaction-boundary checks | Generic sanitization of URLs, paths, data URIs, contact links, error summaries, metadata labels, and caller-supplied extra redaction bundles. | Private rule literals, customer field semantics, policy labels, escalation thresholds, and action routing. | Split. Keep built-in checks generic; keep private policy bindings in embedding repos. |

## Promotion Test

Before moving another review helper into AIQL, require a yes answer to all of these questions:

- Can it operate only on generic review inputs, sanitized evidence excerpts, and published AIQL contracts?
- Are all private names, source paths, raw artifacts, policy thresholds, and routing decisions supplied by the caller?
- Can examples use placeholders or synthetic fixtures without teaching a private workflow?
- Does the helper avoid choosing targets, approving actions, opening tickets, scheduling reviews, or interpreting findings as domain decisions?
- Would two unrelated adopters need the same shape without sharing private labels or policy?

If any answer is no or uncertain, keep the helper in the embedding repo, document the caller-owned adapter contract, or defer promotion until repeated generic adoption evidence exists.

## Recommended Next Slice

Do not add a new public review utility from OPS-693 alone. The next useful slice is to watch one downstream adoption of comparison-driven review gating with placeholder manifests and caller-owned budgets. If the setup repeats, add a documentation-only recipe that references `batch-review-compare --json` and `review-gate --batch-comparison` without adding policy defaults. The downside of waiting is low because the current command surface already supports the workflow; premature promotion risks turning private review policy into public package behavior.
