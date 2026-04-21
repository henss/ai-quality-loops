# Synthetic Scheduling Fallback Review Context

This synthetic context file is a placeholder target for reviewing a proposal-first scheduling fallback packet. It contains no real calendar events, attendee identities, meeting titles, provider account details, local paths, hostnames, timezone history, or caller-owned operating policy.

## Intended Surface

A caller-owned workflow wants to recover gracefully when a primary schedule source is unreachable and a secondary planning system has not yet been confirmed healthy. The reviewer should treat this file as a neutral fallback-planning packet, not as proof that any real calendar, planner, or external scheduling surface is available for reads or writes.

## Evidence Items

| Label | Synthetic artifact | Draft claim | Provided support | Known caveat |
| --- | --- | --- | --- | --- |
| Evidence A | Reachability note | "Primary schedule access is unavailable right now." | A synthetic status note says the last live schedule read failed and produced no fresh availability windows. | No root cause, retry count, outage duration, or provider diagnosis is supplied. |
| Evidence B | Secondary planner note | "A fallback planner may still help." | A synthetic packet says the secondary planning surface has not been health-checked during the current session. | This is uncertainty, not proof of availability, data freshness, or write permission. |
| Evidence C | Draft recovery option | "Prepare a no-write reclaim plan first." | The packet proposes two tentative focus blocks and one deferrable meeting candidate as a draft fallback shape. | No attendee consent, timezone reconciliation, collision check, or priority approval is supplied. |
| Evidence D | Continuation rule | "Stop before external scheduling action." | The packet states the recovery slice is proposal-first and caller-owned execution remains outside AIQL. | The fixture does not decide escalation timing, approval owner, or communication routing. |

## Rubric Review

| Rubric dimension | Review finding | Severity | Caller-owned next step |
| --- | --- | --- | --- |
| Authority boundary | The packet must not turn reachability loss into permission to reschedule, cancel, message attendees, or write fallback blocks. | high | Require caller-owned approval and fresh source checks before any external scheduling action. |
| Evidence chain | Evidence A supports only an unreachable-state claim; Evidence B supports only uncertainty about a fallback planner. | high | Keep reachability and health-check evidence separate from action recommendations. |
| Fallback proportionality | Evidence C supports drafting reversible options, not asserting that the proposed blocks fit the real schedule. | medium | Phrase outcomes as candidate options pending confirmation instead of schedule decisions. |
| Uncertainty handling | Missing facts such as timezone alignment, consent, urgency, and retry posture need to stay explicit. | medium | Preserve caveats in every draft recommendation instead of collapsing them into generic caution language. |
| Continuation discipline | Evidence D is the core safety seam and should remain explicit in any shared artifact or example. | medium | Stop before live reads or writes when approval, health, or source freshness is still unknown. |
| Output discipline | The shared surface should stay generic and synthetic, with no vendor account names, meeting details, private paths, or operating notes. | low | Keep provider-specific recovery logic and private scheduling semantics in the embedding workflow. |

## Review Boundary

Flag unsupported readiness claims, missing caveats, authority overreach, weak evidence traceability, or fallback plans that imply live schedule truth without confirmation. Do not infer real availability, approve writes, decide escalation, route communications, or treat the synthetic packet as operational scheduling authority.
