# Synthetic Scheduling Fallback Review

Output classification: review

## Summary

The synthetic scheduling fallback packet is appropriate for AIQL as a public-safe review surface because it stays proposal-first, uses opaque evidence labels, and explicitly stops before live scheduling reads or writes. It should remain a generic example and review artifact rather than become a calendar adapter, planner client, retry controller, health-check workflow, or scheduling automation layer.

## Findings

| Severity | Dimension | Finding | Evidence |
| --- | --- | --- | --- |
| high | Authority boundary | The shared surface must not convert an unreachable primary source into permission to reschedule, cancel, notify attendees, or write fallback blocks. | Evidence A and D support only a no-write recovery posture. |
| high | Evidence chain | The packet correctly distinguishes source unreachability from fallback-system readiness, and future edits must keep those claims separate. | Evidence A shows a failed live read; Evidence B shows missing health confirmation rather than fallback availability. |
| medium | Fallback proportionality | Draft focus blocks and a deferrable meeting candidate fit the evidence only as reversible options, not as real schedule truth. | Evidence C supplies a draft fallback shape without consent, conflict, or timezone confirmation. |
| medium | Uncertainty handling | The most important missing facts are retry posture, urgency, timezone alignment, attendee consent, and approval ownership. | The context names each of these as absent and should keep them explicit in any downstream packet. |
| medium | Continuation discipline | The review is strongest when it recommends candidate next steps and then stops before live reads or writes. | Evidence D keeps execution caller-owned and prevents AIQL from implying operational authority. |
| low | Output discipline | The files stay generic and synthetic, but future edits should avoid vendor account labels, meeting metadata, and private scheduling notes. | The packet excludes real calendar data, account details, local paths, hostnames, and provider-specific policy. |

## Public Boundary Decision

Keep the fixture generic and no-write. AIQL can host the review surface for proposal-first fallback packets, while embedding workflows own real schedule retrieval, health checks, vendor integrations, account state, retry policy, approval, communication routing, and any external scheduling mutation.

## Generic-vs-Domain-Specific Extraction Question

No new scheduling helper should be extracted from this pilot yet. The reusable value is the generic review pattern for unreachable-source fallback packets that need evidence separation, caveat preservation, and no-write continuation discipline. Provider-specific diagnostics, recovery policy, and execution logic remain caller-owned unless repeated public use cases prove a narrow generic seam.
