# Context-Pack Quality Checks Fit Review

This review records the OPS-848 fit decision for using AI Quality Loops to assess source-centric context packs. It intentionally uses synthetic and metadata-only examples, and does not document private repositories, customer data, company workflows, source paths, tracker internals, or domain-specific implementation details.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks whether AIQL is the right shared surface for context-pack quality checks and ownership recommendations. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` frames AIQL as a local review package that keeps policy decisions caller-owned.
- `docs/capture-review-adapter-contract.md` already defines a safe split where AIQL reviews generic targets while embedding adapters own capture selection, domain semantics, retention, and action routing.
- `docs/adoption-pressure-matrix.md` suppresses new package surfaces until repeated generic adoption pressure proves the same shape.
- `docs/public-private-utility-boundary-review.md` warns that leakage usually enters through examples, manifest names, paths, labels, redaction defaults, and convenience wrappers rather than through core review logic.
- `docs/smartseer-safe-review-utility-boundary-inventory.md` records the existing guidance for synthetic, open-source-safe review utility boundaries.

## Fit Decision

AIQL is a good fit for reviewing sanitized context-pack artifacts, but not for building, storing, refreshing, or authoritatively interpreting the packs.

The safe shared role is a generic review layer over caller-provided artifacts: text review, structured findings, severity rollups, evidence traceability, uncertainty checks, provenance hygiene, and before/after comparisons. The embedding system must own source selection, source authority, freshness rules, pack assembly, truth reconciliation, retention, routing, and any decision that treats a context pack as operational state.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Metadata-only context-pack review target | Keep as caller-provided input | AIQL can review sanitized summaries, source lists, coverage notes, and reviewer prompts through existing text review and batch review flows. |
| Context-pack quality rubric | Split | AIQL can own generic dimensions such as source traceability, staleness risk, contradiction handling, missing-evidence flags, and authority-boundary clarity. The embedding system owns domain-specific pass/fail thresholds, source trust policy, escalation rules, and freshness expectations. |
| Context-pack fixture examples | Allow only synthetic examples | Examples may use placeholder sources, generic document titles, synthetic snippets, and made-up metadata. They must not include private source paths, internal project names, customer facts, real tracker state, or company-specific workflow labels. |
| Pack assembly, source discovery, deduplication, and refresh scheduling | Keep outside AIQL | These are context infrastructure concerns, not review primitives. Adding them would turn AIQL toward memory or orchestration infrastructure. |
| Truth-store or canonical-knowledge behavior | Reject for AIQL | AIQL should judge whether a caller-provided pack is reviewable, traceable, and risk-aware; it must not become the authoritative store for source truth. |
| New `context-pack-review` CLI or package helper | Defer | Existing `expert-review`, `batch-review`, structured result schemas, and comparison gates can exercise the review without a new public command. Promote only if repeated sanitized adopters prove the same generic wrapper is missing. |

## Suggested Review Shape

A safe caller-owned context-pack check can be represented as a normal text review target. The input should be a sanitized Markdown or JSON artifact with:

- a short purpose statement for the pack
- synthetic or metadata-only source descriptors
- coverage notes and known omissions
- conflict or staleness notes
- the caller-owned freshness and authority assumptions summarized without private labels

The reviewer prompt should ask for generic quality findings: unsupported claims, missing source links, stale or conflicting evidence, ambiguous source authority, excessive inference, and places where the pack appears to become a shadow truth store.

## Extraction Question

Before moving any context-pack helper into AIQL, require a yes answer to this question:

Can the helper operate only on caller-provided, sanitized review artifacts and published AIQL contracts, while all source discovery, source authority, freshness policy, pack assembly, domain interpretation, routing, and truth-store decisions remain outside AIQL?

If the answer is no or uncertain, keep the helper in the embedding system and call AIQL only as a generic review engine.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral rubric wording for source traceability, staleness risk, contradiction handling, and authority-boundary clarity. If repeated sanitized usage proves that gap, add a documentation-only recipe or synthetic contract test first; do not add a builder, scheduler, memory adapter, or source registry.

## Next Bounded Slice

Do not add a new public utility from OPS-848 alone. The next useful slice is a synthetic recipe that runs `expert-review` or `batch-review` against a metadata-only context-pack fixture if a downstream adopter actually repeats the setup. The downside of waiting is low because current AIQL text review surfaces already support the check, while premature promotion risks making private context infrastructure look like public package behavior.
