# Synthetic Finance-Signal Routing Review Context

This synthetic context file is a placeholder target for a caller-owned finance-sensitive request packet. It contains no real balances, account identifiers, transaction rows, institutions, counterparties, private repository paths, or company operating notes.

## Intended Surface

A private workflow wants to route a finance-sensitive request into a bounded next step such as review, proposal, evidence summary, or blocker. The packet should preserve source handles and coarse finance signals only. The reviewer should treat this file as a neutral packet structure for checking bounded signal discipline, uncertainty, and authority boundaries, not as a source of truth about a real person, company, account, ledger, or compliance workflow.

If a caller later turns the resulting structured review output into an auditable sponsor-facing memo or a no-write sponsor-packet quality-gate check, that downstream step must still rely on sanitized review-result fields rather than treating the packet's finance labels or source handles as proof. Sponsor interpretation, sponsorship policy, tracker writes, and downstream routing remain caller-owned.

## Source Handle Semantics

The `source:*` values below are opaque, caller-owned retrieval hints. They are not proof, canonical records, package-managed storage keys, or a portable resolution schema. A caller-owned workflow must resolve, authorize, verify, and retain any underlying source content outside `ai-quality-loops`.

## Bounded Finance Signals

| Label | Bounded signal | Source handle | Proposed downstream use | Known caveat |
| --- | --- | --- | --- | --- |
| Evidence A | Budget pressure band: watchful | `source:finance-sandbox/budget-band-note-a` | Keep the packet proposal-only and avoid spend-adjacent recommendations. | The band label is caller-computed and hides the underlying thresholds and raw records. |
| Evidence B | Liquidity posture: stable with caution | `source:finance-sandbox/liquidity-posture-b` | Keep continue, slow, and stop outcomes open instead of assuming urgency or safety. | The posture label is not proof and does not expose account coverage or timing detail. |
| Evidence C | Freshness marker: older than one review cycle | `source:finance-sandbox/freshness-marker-c` | Require explicit uncertainty and avoid confident routing language. | The stale marker signals possible drift but does not explain what changed underneath. |
| Evidence D | Authority note: no spend or external routing delegated | `source:finance-sandbox/authority-boundary-d` | Keep the output limited to review, proposal, evidence summary, or blocker. | The note constrains this packet only and does not substitute for caller approval. |

## Review Boundary

Flag copied-truth risk, narrow finance labels that reveal more than necessary, unsupported routing claims, hidden threshold reconstruction, stale-signal overconfidence, and any place where the packet implies approval, spend, escalation, or execution authority. Do not infer balances, account identifiers, transaction detail, institution names, counterparty names, ownership structure, or company-specific policy from the bounded signals.
