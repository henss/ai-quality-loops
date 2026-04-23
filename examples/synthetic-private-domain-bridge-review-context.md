# Synthetic Private-Domain Bridge Review Context

This synthetic context file is a placeholder target for one caller-owned private-lane bridge packet. It contains no real source contents, repository names, tracker IDs, account names, customer data, company terms, hostnames, or private implementation notes.

## Intended Surface

A private workflow wants to hand one bounded review lane into AIQL through a caller-owned adapter. The bridge packet exposes only opaque source handles, redacted evidence notes, and reusable finding candidates. The reviewer should treat this file as a neutral packet structure for checking boundary discipline, finding reuse, and no-write semantics, not as a source of truth about a real project or private system.

## Source Handle Semantics

The `source:*` values below are opaque, caller-owned retrieval hints. They are not proof, canonical records, package-managed identifiers, or a portable resolution scheme. A caller-owned workflow must resolve, authorize, verify, and retain any underlying source content outside `ai-quality-loops`.

## Bridge Packet

| Label | Source handle | Redacted evidence note | Reusable finding candidate | Proposed downstream use | Known caveat |
| --- | --- | --- | --- | --- | --- |
| Evidence A | `source:bridge-lab/redacted-review-a` | A sanitized note says the same failure mode appeared in two adapter-reviewed packets, but omits lane names, repo paths, and actor details. | Missing caveat boundary on reused adapter finding. | Consider one generic follow-up note for adapter consumers. | The note is not proof and does not show whether the repeated pattern came from one domain or several. |
| Evidence B | `source:bridge-lab/redacted-decision-b` | A redacted decision summary says one reviewer needed a clearer explanation of what remained caller-owned after the bridge handoff. | Caller-owned authority note is underspecified. | Consider tightening the public-safe bridge packet template. | The summary is qualitative and does not establish whether the underlying decision was correct. |
| Evidence C | `source:bridge-lab/redacted-output-c` | A sanitized artifact excerpt says one reusable finding title stayed generic enough to compare across runs. | Generic finding key is reuse-ready. | Consider keeping stable finding keys in the shared result. | The excerpt does not prove that every finding in the packet is equally portable. |
| Evidence D | `source:bridge-lab/redacted-policy-d` | A redacted policy note says the bridge output must stop before queue writes or priority assignment. | No-write bridge boundary must remain explicit. | Keep AIQL output advisory and caller-owned. | The note constrains this packet only and does not substitute for downstream approval. |

## Review Boundary

Flag copied-truth risk, private-detail reconstruction, unsupported reuse claims, overconfident authority language, and any place where the bridge packet treats redacted evidence as stronger than the supplied support. Do not infer underlying domain names, repository state, issue ownership, company policy, or execution authority from the bridge packet.
