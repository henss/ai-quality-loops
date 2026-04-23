# Sanitized Private-Domain Bridge Lab for AIQL Adapters

This lab defines a public-safe review shape for proving that one caller-owned private lane can bridge into AI Quality Loops without moving raw source truth, private labels, or domain routing into the shared package. It is generic on purpose: real source contents, adapter-specific policy, queue writes, project semantics, approval rules, and private implementation notes stay in the embedding workflow.

## Classification

Output classification: artifact.

## Scout Check

No solution scout run was needed for this slice. The lab adds no reusable tooling, dependency, adapter client, parser, renderer, scheduler, observability surface, or automation. Local ownership is cheaper because the work is a bounded note, one synthetic bridge packet, and one checked review artifact on top of existing AIQL review surfaces.

## Lab Shape

Run one analysis-only review over a synthetic or caller-sanitized bridge packet that answers a narrow question: can a caller-owned adapter emit only opaque source handles, redacted evidence snippets, and reusable finding candidates while keeping private-domain interpretation and downstream action outside AIQL?

The packet should keep four layers separate:

- source handles that stay opaque and caller-owned
- redacted evidence notes that summarize only what the shared reviewer needs
- reusable finding candidates that stay generic enough for open-source maintenance
- caller-owned authority notes that prevent the bridge output from implying execution, routing, or approval

The review should check whether the bridge packet preserves those layers and whether any recommendation remains reversible, bounded, and explicit about what still belongs to the embedding workflow.

## Review Focus

The lab is strongest when it checks:

- source-handle opacity: the packet treats handles as retrieval hints, not proof or package-owned records
- redacted evidence discipline: each bridge claim stays supported without reconstructing private details
- reusable finding hygiene: proposed findings remain generic, prefer stable generic keys only when they remain portable across runs, and avoid private labels, repository names, project semantics, or company-specific routing
- authority boundary: the bridge output stays analysis-only and does not imply queue writes, prioritization, merge decisions, or external action
- open-source fit: the shared artifact remains useful as a public example without leaking the original domain

## One Checked Lab Run

The checked synthetic bridge example in `examples/synthetic-private-domain-bridge-review.*` is the reference lab slice for this repo. It now makes the caller-owned authority note explicit and uses stable generic finding keys only where the labels remain reusable without private naming. The matching checked review artifacts under `reviews/private-domain-bridge/` show the bridge as an analysis-only seam, not an adapter implementation or downstream routing surface.

## Shared Boundary

AIQL can host:

- synthetic bridge packets
- generic review prompts and starter manifests
- checked example review artifacts
- generic notes about source-handle, redaction, and reusable-finding boundaries

The embedding workflow owns:

- raw source retrieval, authorization, and retention
- private redaction policy and domain interpretation
- real adapter wiring, queue writes, or execution routing
- real project names, repository facts, issue state, and approval policy
- any decision that would change downstream priority, ownership, or live system state

## Generic Extraction Question

The extraction remains generic only while the shared surface reviews a caller-sanitized bridge packet whose inputs are opaque source handles plus bounded redacted evidence and whose outputs are reusable findings with stable generic keys, no writes, no project authority, and no private identifiers. If a future slice needs source resolution, project-specific prioritization, private policy, adapter orchestration, or downstream mutation, keep that logic in the embedding repo instead of widening AIQL.
