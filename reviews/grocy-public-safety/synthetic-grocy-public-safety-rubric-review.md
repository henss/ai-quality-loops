# Synthetic Grocy Public-Safety Rubric Review

Output classification: review

## Summary

The synthetic Grocy-style packet is appropriate for AIQL as a public-safe review surface because it uses generic household artifact labels, synthetic evidence, and caller-owned action boundaries. It should remain an example and review artifact rather than become a Grocy adapter, parser, scheduler, alerting workflow, or source-resolution framework.

## Findings

| Severity | Dimension | Finding | Evidence |
| --- | --- | --- | --- |
| high | Authority boundary | The shared surface must not approve consumption, disposal, purchases, health decisions, emergency action, or real chore routing. | Evidence A, B, C, and D each support only review or confirmation language. |
| high | Evidence chain | The stock and recipe examples show how easy it is to overstate safety from incomplete household artifacts. | Evidence A lacks storage, package, recall, and dietary facts; Evidence C lacks allergy and cooking validation. |
| medium | Uncertainty handling | Missing facts need to stay explicit instead of becoming generic caveats. | The context names storage state, allergy profile, consent, purchase approval, and response-time policy as absent. |
| medium | Scenario coverage | The packet needs adverse and neutral scenarios before any caller uses the pattern with private data. | The review adds unsafe storage, allergen mismatch, false overdue chores, and unwanted reorders as countercases. |
| medium | Recommendation traceability | Reversible wording such as "review item" and "confirm list candidate" fits the evidence better than instruction language. | The caller-owned next-step column keeps thresholds and routing outside AIQL. |
| low | Output discipline | The files avoid real household data and private implementation details, but future edits should keep that boundary explicit. | The packet excludes real members, addresses, devices, accounts, product identifiers, source paths, and integration policy. |

## Public Boundary Decision

Keep the fixture generic and synthetic. AIQL can host the review surface and rubric-shaped artifact, while embedding repos own real Grocy exports, source freshness, identity redaction, alert thresholds, purchasing policy, disposal policy, health interpretation, and downstream routing.

## Generic-vs-Domain-Specific Extraction Question

No new reusable Grocy utility should be extracted from this review. The only reusable value here is the generic high-stakes rubric application pattern; Grocy-specific parsing, private source handling, and household action policy remain caller-owned unless a future public use case proves a narrow generic seam.
