# Public/Private Utility Boundary Review

This review records a bounded devil's-advocate check for whether shared AI Quality Loops surfaces should stay in the public package, split into caller-owned adapters, or defer until adoption pressure is stronger. It is intentionally domain-neutral and does not name private repositories, customer data, company workflows, or domain-specific implementation details.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks for independent boundary recommendations and explicitly stops before resolving critique, creating follow-ups, or widening the public surface. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, helper package, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, or agent infrastructure.

## Evidence Reviewed

- `README.md` already frames AIQL as a generic local review package and keeps policy decisions caller-owned.
- `docs/capture-review-adapter-contract.md` already defines the key split: AIQL owns manifest validation, review execution, sanitized artifacts, and structured contracts; embedding adapters own capture selection, raw images, domain semantics, retention, and action routing.
- `docs/adoption-pressure-matrix.md` already suppresses new public surfaces when evidence is weak or inference-led, especially scaffold commands, private image-review wrappers, and orchestrator-specific helpers.
- `src/index.ts` exports a broad but still review-centered surface: review runners, manifest planning, preflight, result contracts, gates, comparison helpers, redaction helpers, screenshot capture, and Ollama primitives.

## Boundary Recommendations

| Candidate | Recommendation | Reason |
| --- | --- | --- |
| Existing review runners, manifest contracts, result schemas, gates, comparison reports, preflight checks, redaction helpers, and screenshot primitives | Keep public | These are reusable review primitives with generic inputs and explicit caller-owned policy. |
| Capture selection, raw capture storage, retention policy, private entity naming, customer or domain labels, action routing, and repo-specific escalation thresholds | Split into embedding repos | These choices carry domain semantics and can leak private assumptions through names, prompts, logs, manifests, or examples. |
| New scaffold command for starter manifests | Defer | Current examples and CI recipe are enough; a scaffold could encode repo-local naming or policy defaults before repeated generic adoption proves the shape. |
| Additional manifest-preview CLI | Defer | The programmatic execution-plan surface and `vision-preview --manifest` cover the current generic need without expanding the public command set. |
| Concept-review, packet-review, or orchestrator-specific helper | Split or defer | Existing `expert-review` can run text critique generically. Any helper that understands tracker packets, approval states, or project routing belongs outside AIQL until a domain-neutral contract emerges. |
| Venture claim-risk checker | Split | AIQL can supply generic evidence, uncertainty, adversarial review, and authority-boundary dimensions. Venture-specific claim categories, legal-adjacent cautions, reputation thresholds, buyer-facing readiness, proof standards, and escalation policy belong in the embedding repo. |
| Private image-review wrapper example | Split | The generic adapter contract is sufficient. A wrapper example would likely teach private capture semantics through labels, paths, or routing assumptions. |
| Comparison-driven CI regression recipe | Defer, monitor | This is the strongest generic candidate because `batch-review-compare --json` and `review-gate --batch-comparison` already exist. Promote only after repeated setup friction appears in more than one downstream adoption. |
| Domain-specific high-stakes review injections | Split | AIQL can own synthetic contract shape and validation. Domain facts, thresholds, approval authority, and execution policy must remain caller-owned. |

## Devil's-Advocate Findings

1. The current package is close to a broad review framework boundary because it exports runners, planning, gates, schemas, and screenshot utilities. That is acceptable only while each surface remains explicit, local, and caller-configured.
2. The biggest leakage path is not code logic; it is examples, manifest names, context files, output paths, redaction defaults, and convenience wrappers that normalize one private workflow as a public default.
3. Caller-provided `extraRedactions` is the right public seam for private identifiers, but it should not become a dumping ground for domain knowledge in this repo. Project-local rule bundles should live with the embedding repo.
4. Any future automation that picks targets, schedules reviews, interprets findings, opens tickets, approves deltas, or chooses budgets crosses from generic review utility into workflow policy.

## Extraction Question

Before moving a helper into AIQL, require a yes answer to this question:

Can the helper be described as operating on generic review inputs and published AIQL contracts, with all target choice, private naming, raw artifacts, policy thresholds, routing, and domain interpretation provided by the caller?

If the answer is no or uncertain, keep the helper private, write a caller-owned adapter, or defer the extraction until repeated generic adoption evidence exists.

For venture or claim-risk review, the answer is currently uncertain-to-no: the reusable part is already covered by the high-stakes rubric contract, while the risk taxonomy and action thresholds are policy. A safe caller-owned checker should inject those private rules at the embedding boundary and pass only sanitized claim text, evidence labels, and generic review results through AIQL.

## Next Bounded Slice

Do not add a new public utility from this review alone. The next useful slice is to monitor one real downstream adoption that uses `batch-review-compare --json` plus `review-gate --batch-comparison`; if the same comparison-gate setup repeats, add a documentation-only CI regression recipe with placeholder paths and caller-owned budgets. The downside of waiting is small because the current command surface already supports the flow, while premature promotion risks publicizing private policy defaults.
