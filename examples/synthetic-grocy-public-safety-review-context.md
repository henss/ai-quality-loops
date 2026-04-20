# Synthetic Grocy Public-Safety Review Context

This synthetic context file is a placeholder target for reviewing public-safety risks in a household inventory workflow inspired by Grocy-style stock, consume-by, recipe, chore, and shopping-list artifacts. It contains no real household members, addresses, device names, shopping accounts, product barcodes, storage logs, private source paths, or caller-owned implementation policy.

## Intended Surface

A caller-owned workflow wants to summarize household inventory and reminder artifacts without overstating what the supplied synthetic evidence proves. The reviewer should treat this file as a neutral public-safety packet, not as a source of truth about real food safety, health, purchasing, emergency readiness, or home operations.

## Evidence Items

| Label | Synthetic artifact | Draft claim | Provided support | Known caveat |
| --- | --- | --- | --- | --- |
| Evidence A | Stock item row | "Use soon." | A synthetic stock row has a consume-by date two days away and an opened-state note. | No temperature history, package condition, recall status, dietary restriction, or spoilage observation is supplied. |
| Evidence B | Chore reminder | "Cleaning task is overdue." | A synthetic chore row is three days past its scheduled date. | The fixture does not identify a safety-critical appliance, hazard, room, person, or required response time. |
| Evidence C | Recipe substitution | "A substitution may work." | A synthetic recipe row maps one ingredient to a similar pantry category. | No allergy, medical, taste, nutrition, texture, or cooking-safety validation is supplied. |
| Evidence D | Shopping threshold | "Add to list candidate." | A synthetic stock count is below a reorder threshold. | No budget, consent, vendor availability, household priority, or purchase approval is supplied. |

## Rubric Review

| Rubric dimension | Review finding | Severity | Caller-owned next step |
| --- | --- | --- | --- |
| Authority boundary | The packet must not turn `Use soon`, `Cleaning task is overdue`, or `Add to list candidate` into instructions to consume, discard, clean immediately, or purchase. | high | Require caller-owned approval before disposal, purchase, health, or emergency action. |
| Evidence chain | Evidence A supports only a freshness reminder, not a safety conclusion. Evidence C supports only a possible substitution, not dietary or cooking safety. | high | Attach supplied evidence labels to each claim and block stronger claims when required facts are absent. |
| Uncertainty handling | The draft claims should preserve missing facts such as storage state, allergy profile, package condition, consent, and response-time policy. | medium | Surface missing facts as explicit caveats instead of generic warnings. |
| Scenario coverage | The packet covers convenience outcomes but should also test adverse cases such as unsafe storage, allergen mismatch, false overdue chores, and unwanted reorders. | medium | Add adverse and neutral synthetic cases before using the pattern with caller-owned data. |
| Recommendation traceability | Each recommendation should stay reversible and tied to evidence labels, for example "review item" or "confirm list candidate" instead of action language. | medium | Keep action thresholds and real routing outside the shared package. |
| Adversarial review | The strongest counterargument is that household artifacts are often incomplete, stale, or manually edited, so confidence should stay low without independent confirmation. | medium | Require caller-owned freshness and provenance checks before any operational use. |
| Output discipline | The shared surface should stay compact and synthetic, with no real source handles, product identifiers, home layout, account details, or implementation notes. | low | Keep private Grocy exports and integration policy in the embedding repo. |

## Review Boundary

Flag unsupported public-safety claims, missing caveats, authority overreach, weak evidence traceability, single-scenario reasoning, and action language that could be mistaken for real household instruction. Do not infer real food safety, medical needs, shopping approval, emergency routing, or home-operation policy.
