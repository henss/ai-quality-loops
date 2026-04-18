# External Devil's-Advocate Product-Fit Packet

This OPS-977 packet is a private, read-only reviewer brief for testing whether AI Quality Loops product-fit breadth is real user leverage or internal architecture churn. It is written for an external or alternate-model reviewer without exposing private repositories, tracker details, company workflows, customer data, real artifacts, or domain-specific implementation details.

## Classification

Packet output: artifact and proposal.

No implementation path was chosen. The build-vs-buy scout check is not applicable because this session adds only a one-off review packet and no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory/context surface, connector client, parser/renderer framework, supply-chain tooling, or package-like code.

## Reviewer Boundary

The reviewer may inspect only public-safe AIQL surfaces:

- `README.md` for the package mission, command surface, and caller-owned policy split.
- `docs/adoption-pressure-matrix.md` for current product-pressure candidates and suppression reasons.
- `docs/public-private-utility-boundary-review.md` for the keep/split/defer boundary recommendation.
- `docs/review-adapter-boundary-matrix.md` for adapter read, emit, retain, and ownership boundaries.
- `docs/reviewer-contract.md` for the synthetic structured review-result contract example.
- `examples/README.md` and synthetic fixtures only when the reviewer needs examples of public-safe manifests or results.

The reviewer must not inspect or request private repositories, real local runtime artifacts, tracker comments beyond this packet's OPS-977 summary, production data, real screenshots, customer or account context, branch history outside this repo, or any artifact that would require explaining a private workflow.

## Tool Privacy Rules

Allowed tools are read-only summarization and critique over the public-safe files above. The reviewer may produce Markdown findings, a recommendation, and clarifying questions.

Disallowed actions:

- external sends, public posts, package publication, issue creation, branch creation, pull requests, or tracker mutation
- command execution against private repos or runtime paths
- requests for real customer, household, finance, company, or product implementation details
- inferring private policy from sanitized examples
- proposing new AIQL public APIs unless the recommendation includes repeated generic adoption evidence and a caller-owned boundary

If the reviewer believes private context is necessary, the correct output is a classified blocker: missing external information or needs Stefan, not a request to broaden access.

## Evidence Snapshot

AIQL already has broad reusable review primitives: expert review, vision review, batch manifests, structured review results, comparison reports, review gates, preflight checks, redaction helpers, screenshot capture, and JSON contracts. The public package is strongest when it stays at generic review execution and reporting.

Existing boundary notes repeatedly suppress new package surfaces when evidence is inference-led. They keep target selection, private naming, raw artifact handling, retention, policy thresholds, routing, and domain interpretation in embedding repos.

The current breadth candidates are mostly advisory review recipes or synthetic fixtures, not proven missing code. Examples include concept review, claim-risk review, context-pack review, packet verification-command review, creative support review, sanitized social-evidence review, launch-outcome summarization, and adapter boundary review.

## Devil's-Advocate Questions

1. Which current AIQL surfaces would a non-private adopter actually use without learning portfolio-specific workflow habits?
2. Which candidate reviews are just different prompts over the same existing `expert-review`, structured result, comparison, and gate surfaces?
3. Where does Stefan attention improve measurably, rather than shifting private curation work into a public package?
4. Which proposed helpers would become public policy by accident through names, examples, defaults, output paths, budgets, or routing labels?
5. What repeated adoption evidence would justify a new public helper instead of a documentation-only recipe or caller-owned adapter?
6. Which surfaces should be deleted, deferred, or merged because they mostly preserve internal momentum rather than external user value?

## Review Output Contract

Return a concise Markdown review with these sections:

- `Verdict`: one of `keep_breadth`, `narrow_to_existing_surfaces`, `defer_new_surfaces`, or `block_for_missing_evidence`.
- `Top findings`: up to five findings ordered by product-fit risk.
- `Surface recommendations`: keep, split, defer, merge, or remove for each candidate the reviewer discusses.
- `Stefan leverage`: one paragraph on what actually saves Stefan attention.
- `Privacy boundary`: any leakage risk or confirmation that the packet stayed public-safe.
- `Generic-vs-domain-specific extraction question`: the one decision that must remain explicit before implementation.

The reviewer should treat absence of repeated generic adoption evidence as a reason to defer new public surface area, not as an invitation to invent one.

## Initial Recommendation To Challenge

Default recommendation: do not add a new AIQL package surface from OPS-977 alone. Use the external devil's-advocate review to decide whether the current breadth is worth keeping as documentation and synthetic examples, or whether future work should narrow around proven primitives: structured review results, manifest review execution, comparison reports, gate checks, and caller-owned adapter boundaries.

The strongest useful follow-up would be a read-only external review over the public-safe files listed above. The downside of waiting is low because existing AIQL commands already support the generic review workflows; the risk of moving now is normalizing private decision policy as open-source behavior.

## Explicit Extraction Question

Before implementation, answer this:

Can the proposed reusable surface operate only on generic review inputs, published AIQL contracts, synthetic examples, and caller-owned policy injections, while all target selection, private context, thresholds, action routing, retention, and domain interpretation remain outside AIQL?

If the answer is no or uncertain, the work belongs in an embedding repo, a documentation-only recipe, or the backlog until repeated generic adoption evidence exists.
