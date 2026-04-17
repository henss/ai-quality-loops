# Launch-Outcome Evidence Summarization Fit Review

This review records the OPS-850 fit decision for compact launch-outcome evidence summarization over AI Quality Loops review outputs. It intentionally uses synthetic and metadata-only examples, and does not document private repositories, tracker internals, company workflows, source paths, customer data, launch plans, or domain-specific implementation details.

## Classification

Packet output: review and proposal.

No package implementation path was chosen. The packet asks whether compact launch-outcome evidence summarization belongs in AIQL or should remain caller-owned. Because this review considered a reusable review capability, the required build-vs-buy scout was run:

```bash
pnpm solution:scout -- --category review --capability "compact launch outcome evidence summarization" --boundary public
```

The scout returned `evaluate_registry_candidate` with AIQL as the registry candidate and no live npm candidates. That supports evaluating this package boundary, not adding a new private helper or external dependency.

## Evidence Reviewed

- `README.md` already positions `batch-review`, `batch-review-compare --json`, and `review-gate --batch-comparison` as generic review-output surfaces with caller-owned policy.
- `docs/adoption-pressure-matrix.md` suppresses new package surfaces until repeated generic adoption proves that existing commands and documented recipes are insufficient.
- `docs/public-private-utility-boundary-review.md` warns that private policy often leaks through names, default paths, labels, thresholds, routing, and convenience wrappers.
- `docs/context-pack-quality-checks-fit-review.md` records the safe split where AIQL reviews caller-provided artifacts while source authority, freshness, and action routing stay outside the package.
- `examples/synthetic-launch-outcome-evidence-summary.md` provides a synthetic fixture shape for compact evidence without naming real launches, trackers, private repos, customers, or internal workflows.

## Fit Decision

AIQL is a good fit for producing and validating generic review-output evidence that can support a launch outcome summary, but not for deciding launch outcomes, selecting sources, interpreting tracker state, or routing follow-up work.

The safe shared role is a compact, caller-readable summary over published AIQL artifacts: batch summary counts, comparison deltas, gate violations, changed result keys, and sanitized evidence labels. The embedding system must own launch definitions, source selection, stale-context policy, decision thresholds, approval authority, tracker updates, and any final shared/private/defer classification.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Compact evidence summary recipe | Allow as documentation | A generic recipe can tell callers how to condense AIQL JSON outputs into material signals, validation evidence, and unresolved questions without encoding launch policy. |
| Synthetic launch-outcome fixture | Allow | A fixture with placeholder result keys and sanitized labels helps reviewers test the shape without private launch details. |
| New `launch-outcome-summary` CLI or package helper | Defer | The existing comparison and gate contracts already expose the raw material. A helper would risk baking in private decision labels, thresholds, or tracker semantics before repeated generic adoption proves a missing contract. |
| Shared/private/defer classification logic | Keep outside AIQL | Those labels depend on embedding-repo strategy, source authority, ownership, and escalation policy. AIQL can summarize evidence; callers decide the classification. |
| Tracker comments, launcher prompts, scheduling, or routing | Reject for AIQL | These are workflow automation concerns and can expose private implementation details through labels, paths, and action defaults. |
| Real launch examples | Reject | Public examples must use synthetic targets, placeholder result keys, and sanitized evidence descriptors only. |

## Suggested Review Shape

A safe caller-owned summarizer can read AIQL outputs and produce a concise Markdown artifact with:

- source artifact labels, using sanitized path labels instead of raw paths
- material review deltas from `batch-review-compare --json`
- gate result and explicit caller-owned thresholds from `review-gate --batch-comparison --json`
- changed or added result keys that explain why the outcome changed
- a short uncertainty section for missing rollups, unavailable severity, stale inputs, or absent validation
- an explicit boundary statement that the embedding repo owns launch readiness and tracker action

The summary should avoid rereading raw review markdown unless a compact JSON artifact does not contain enough evidence. When raw rereads are necessary, the caller should record why the JSON contract was insufficient and keep private source details redacted before the text reaches AIQL.

## Extraction Question

Before adding any launch-outcome summarization helper to AIQL, require a yes answer to this question:

Can the helper operate only on published AIQL JSON contracts, sanitized evidence labels, and caller-provided thresholds, while launch definitions, source authority, tracker state, decision labels, approval policy, and follow-up routing remain outside AIQL?

If the answer is no or uncertain, keep the summarizer in the embedding system and use AIQL only for review outputs, comparisons, gates, and documentation-only examples.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral compaction format for AIQL review artifacts, or whether the missing value is actually launch policy, tracker semantics, source selection, or decision routing. If repeated sanitized usage proves the format gap, add a documentation-only recipe first. Promote code only after a second generic adopter shows that the same contract shape cannot be handled by `batch-review-compare --json`, `review-gate --batch-comparison --json`, and a caller-owned Markdown template.

## Next Bounded Slice

Do not add a new public utility from OPS-850 alone. The next useful slice is one downstream trial that creates a compact outcome note from `batch-review-compare --json` and `review-gate --batch-comparison --json` using the synthetic fixture shape. The value is lower review waste and fewer broad raw rereads; the downside of waiting is low because existing AIQL contracts already expose the material signals, while premature helper extraction risks turning private launch policy into public package behavior.
