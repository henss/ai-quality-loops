# Synthetic Blocker Clarification Review Context

This synthetic context file is a placeholder target for one caller-owned blocker clarification packet. It contains no real product names, repository names, issue keys, account names, customer names, domain-specific terms, private implementation notes, or company-specific escalation rules.

## Intended Surface

A private workflow wants to hand a disputed product blocker into AIQL for bounded clarification review before any caller-owned team decides whether the concern remains a blocker, becomes a caveat, or needs a deeper evidence pass. The shared packet exposes only opaque source handles, sanitized summaries of dispute positions, and explicit clarification questions. The reviewer should treat this file as a neutral packet structure for checking trust-safe blocker framing, evidence-scope discipline, and no-write boundaries, not as a source of truth about a real product or organization.

## Source Handle Semantics

The `source:*` values below are opaque caller-owned retrieval hints. They are not proof, canonical records, package-managed identifiers, or a portable resolution scheme. A caller-owned workflow must resolve, authorize, verify, and retain any underlying source material outside `ai-quality-loops`.

## Caller-Owned Authority Note

This packet is clarification-only. It may suggest gaps such as `scope-clarification-missing`, `blocker-threshold-overclaim`, `evidence-scope-mismatch`, or `private-detail-leak-risk`, but it cannot decide whether the blocker stands, approve release timing, assign remediation, prioritize roadmap work, escalate externally, or mutate any tracker or queue. Any downstream interpretation, threshold decision, or execution remains caller-owned outside `ai-quality-loops`.

## Blocker Clarification Packet

| Label | Source handle | Sanitized dispute note | Clarification question | Allowed next-step use | Known caveat |
| --- | --- | --- | --- | --- | --- |
| Evidence A | `source:blocker-lab/redacted-position-a` | One side says the product claim may fail because the supporting evidence summary blends two different usage scenarios into one blocker statement. | Are both sides discussing the same scenario scope, or is one blocker statement compressing distinct contexts? | Keep the next step limited to scope clarification before deciding whether a blocker exists. | The note does not establish whether either scenario actually happens in production. |
| Evidence B | `source:blocker-lab/redacted-position-b` | Another side says the concern is real but the current packet mixes evidence about user harm, rollout timing, and implementation effort without separating which part is disputed. | Which exact dimension is blocking: user harm risk, readiness confidence, or implementation feasibility? | Split one broad blocker label into narrower clarification questions if the evidence spans multiple dimensions. | The summary is qualitative and does not prove that any one dimension crosses a blocker threshold. |
| Evidence C | `source:blocker-lab/redacted-review-c` | A prior review excerpt says the strongest evidence is second-hand and may be missing the caveat that no direct reproduction artifact was attached. | Does the packet clearly mark which evidence is first-hand, second-hand, or missing direct reproduction? | Add caveats or request a deeper evidence pass before treating the note as blocker-strength support. | The excerpt does not show whether a reproduction artifact exists elsewhere. |
| Evidence D | `source:blocker-lab/redacted-operator-d` | An operator note says the shared packet should stay generic and should not restate product internals while asking for blocker clarification. | Do any labels, summaries, or shorthand reveal private implementation details or team-specific semantics? | Redact or generalize packet wording before sharing the clarification review surface. | The note constrains wording only and does not determine blocker severity. |
| Evidence E | `source:blocker-lab/redacted-policy-e` | A policy note says the clarification packet must stop before release approval, roadmap commitment, or outbound messaging. | Does every suggested next step remain reversible and caller-owned? | Keep outputs limited to clarification, caveats, deeper review, or classified blocker carry-forward. | The note constrains this packet only and does not substitute for downstream approval. |

## Review Boundary

Flag copied-truth risk, unresolved scope compression, blocker-threshold overclaim, evidence classification gaps, private-detail reconstruction, and any place where the packet sounds as if one side already won the dispute. Do not infer underlying product names, repository state, launch timing, customer impact, internal roles, or execution authority from the packet.
