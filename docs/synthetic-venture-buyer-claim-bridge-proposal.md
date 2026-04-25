# Synthetic Venture-Brief to Buyer-Claim Bridge Proposal

This note defines a public-safe proposal for piloting one AIQL buyer-claim review pack that starts from synthetic venture-brief material without turning AIQL into a venture workflow controller, acceptance-policy layer, or private-domain packet factory. It is generic on purpose: real buyer records, source notes, prioritization, outreach, spend, approval, and downstream routing stay in the embedding workflow.

## Classification

Output classification: proposal and artifact.

## Scout Check

No solution scout run was needed for this slice. The proposal adds no reusable tooling, dependency, adapter, client, parser, renderer, scheduler, observability surface, or automation. Local ownership is cheaper because the immediate gap is an acceptance contract between already-published synthetic review seams, not a new package capability.

## Current Repo Fit

AIQL already publishes the two reusable public-safe seams that this pilot needs:

- `examples/synthetic-venture-concept-brief-review.manifest.json` for reviewing whether a concept brief overstates readiness or evidence support
- `examples/synthetic-buyer-claim-caveat-review.manifest.json` for reviewing whether buyer-interest claims outrun the supplied evidence and caveats

Those examples are intentionally separate. The venture brief seam checks concept framing and readiness discipline. The buyer-claim seam checks buyer-interest proportionality. Neither seam decides when findings from the first are acceptable input for the second.

This repo now also publishes `examples/synthetic-venture-buyer-claim-review.manifest.json` as a document-first bridge packet. It is intentionally narrow: the packet demonstrates the caller-owned translation seam, but it still does not decide whether a real caller should promote one sentence, run outreach, or act on the output.

## Missing Bridge Contract

The packet gap is not core AIQL review capability. The gap is one explicit caller-owned acceptance contract that answers:

- which venture-brief findings may be carried forward into a buyer-claim packet
- what minimum caveats must survive that translation
- what evidence classes remain directional versus action-supporting
- what stop condition prevents the bridge from implying launch, outreach, spend, account creation, or publication readiness

Without that contract, a new combined synthetic pack would mostly invent workflow authority instead of demonstrating a bounded shared seam.

## Proposed Pilot Shape

Keep the pilot proposal-only and caller-owned:

1. Run the existing synthetic venture concept brief review as the upstream framing check.
2. Allow only non-readiness, caveated buyer-interest statements to be copied into a downstream buyer-claim packet.
3. Run the existing synthetic buyer-claim caveat review on that translated packet.
4. Treat any surviving buyer claim as directional analysis only, not as authorization for outreach or execution.

The bridge should stay document-first. The published runnable packet is enough for one pilot because it exercises the translation seam without adding a package command, manifest generator, or package-owned workflow adapter. Do not add those layers unless repeated public-safe demand proves that the bridge itself is reusable beyond one caller-owned pilot.

## Minimum Caller-Owned Acceptance Contract

Before a caller promotes one venture-brief statement into a buyer-claim packet, require all of the following:

- the statement is evidence-linked and still traceable through generic labels only
- the statement remains explicitly qualitative, directional, or conditional where the evidence is qualitative, directional, or conditional
- any readiness, launch, spend, fundraising, outreach, account, procurement, or publication language has been removed or converted into a caveat
- the packet states that AIQL is reviewing claim proportionality, not deciding whether the venture is real, investable, or ready to act on
- the caller still owns proof thresholds, source verification, source freshness, and downstream routing

If one of those conditions is missing, stop at the venture-brief result and keep the bridge out of scope.

## Shared Boundary

AIQL can host:

- the separate synthetic venture-brief and buyer-claim review seams that already exist
- public-safe proposal notes describing how a caller may chain those seams
- checked synthetic artifacts that remain analysis-only and do not encode caller policy

The embedding workflow owns:

- selection of the actual brief or synthetic brief variant
- the acceptance contract that decides whether a venture-brief sentence is eligible for buyer-claim review
- any mapping from review findings to source truth, buyer records, or operating priorities
- any decision that changes outreach, spend, launch timing, account creation, publication, or other real-world action

## Generic Extraction Question

The extraction remains generic while AIQL publishes separate review seams plus one runnable synthetic bridge packet that keeps translation rules explicit and caller-owned. If a future slice needs automatic packet translation, acceptance heuristics, review chaining, source promotion, or venture-specific routing, keep that logic in the embedding workflow unless repeated public-safe demand proves a thinner shared seam.
