# Synthetic Finance-Signal Routing Review

Output classification: review

## Summary

The synthetic finance-signal routing packet is appropriate for AIQL as a public-safe review surface because it keeps source handles opaque, keeps finance-sensitive context at coarse signal level, and limits the next step to advisory outputs such as review, proposal, evidence summary, or blocker. It should remain a generic routing-check artifact rather than become a finance-state model, source resolver, threshold engine, or routing controller.

## Findings

| Severity | Dimension | Finding | Evidence |
| --- | --- | --- | --- |
| high | Source-handle boundary | The shared surface must preserve source handles as opaque retrieval hints and must not let summary text act as a substitute for the withheld finance sources. | Evidence A through D reference only caller-owned handles and bounded labels. |
| high | Authority boundary | Routing output must stay no-write and caller-owned; budget or liquidity labels cannot become permission to spend, escalate, route externally, or alter a real review cadence. | Evidence D constrains the allowed next-step class to advisory outcomes. |
| medium | Signal discipline | Finance-sensitive signals should stay coarse enough to avoid reconstructing balances, account coverage, transaction history, or institution-specific state from the shared packet. | Evidence A and B use band and posture labels instead of raw values or account detail. |
| medium | Freshness handling | A stale signal must reduce confidence and keep uncertainty explicit rather than being flattened into a confident routing recommendation. | Evidence C marks the packet as older than one review cycle. |
| medium | Continuation framing | The packet is strongest when it keeps continue, stop, and bounded follow-up options open rather than implying one default path from incomplete finance signals. | Evidence B and C support advisory branching, not a single mandated route. |
| low | Open-source boundary | The fixture stays generic and synthetic, but future edits should avoid institution names, policy labels, company roles, or finance vocabulary that narrows the shared surface toward one private domain. | The packet excludes real records, entities, approval owners, and routing systems. |

## Public Boundary Decision

Keep the review surface generic and advisory. AIQL can host source-handle-based routing review examples that preserve bounded finance signals, while embedding workflows own source resolution, threshold policy, routing authority, scheduling, approval, and any irreversible or external action.

## Generic-vs-Domain-Specific Extraction Question

No reusable helper should be extracted from this slice yet. The reusable value is the generic review pattern for packets that combine opaque source handles with coarse finance signals and strict authority boundaries. If future work needs source resolution, signal normalization, threshold comparison, alerting, or routing policy, that logic belongs in the embedding repo instead of the shared package.
