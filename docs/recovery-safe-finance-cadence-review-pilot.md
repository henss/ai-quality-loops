# Recovery-Safe Finance Cadence Review Pilot

This pilot defines a public-safe review shape for checking whether a finance-oriented review cadence can continue without increasing recovery load, widening authority, or flattening caveats into action language. It is generic on purpose: real financial records, thresholds, entity names, source paths, approval policy, timing commitments, and private recovery context stay in the embedding workflow.

## Classification

Output classification: proposal and artifact.

## Scout Check

No solution scout run was needed for this slice. The pilot adds no reusable tooling, dependency, adapter, client, parser, renderer, scheduler, observability surface, or automation. Local ownership is cheaper because the work is a bounded note, one synthetic example packet, and one checked review artifact on top of existing AIQL review surfaces.

## Pilot Shape

Run one analysis-only review over a synthetic or caller-sanitized cadence packet that answers a narrow question: does the proposed review rhythm preserve recovery, keep financial interpretation bounded, and stop before recommending execution, spend, or irreversible routing?

The packet should separate four things that are often collapsed:

- cadence observations
- evidence freshness or gaps
- recovery-load caveats
- caller-owned approval or action gates

The review should check whether the packet keeps those layers distinct and whether any recommendation remains reversible, deferrable, and proportional to the supplied evidence.

## Review Focus

The pilot is strongest when it checks:

- authority boundary: the packet stays analysis-only and does not imply spending, execution, escalation, or policy approval
- evidence chain: each material cadence claim points to supplied evidence labels, and missing inputs stay explicit
- uncertainty handling: the packet states what would change the cadence recommendation and what remains unknown
- scenario coverage: the packet covers at least maintain, slow, or pause-style outcomes instead of one favored path
- recommendation traceability: any next step is tied to evidence, caveats, and caller-owned approval
- output discipline: the packet stays concise and avoids private or domain-specific leakage

## Shared Boundary

AIQL can host:

- synthetic cadence packets
- generic review prompts and starter manifests
- checked example review artifacts
- generic notes about recovery-safe cadence reasoning

The embedding workflow owns:

- real financial records, account state, or budget details
- recovery context tied to a person, company, or private system
- real thresholds, alert policy, or escalation policy
- approval ownership, execution authority, and actual scheduling
- any recommendation that could trigger spend, payment, portfolio moves, filing, procurement, or communication

## Generic Extraction Question

The extraction remains generic only while the shared surface reviews synthetic or caller-sanitized cadence packets with explicit no-write, no-spend, and caller-owned approval boundaries. If a future slice needs real finance-source retrieval, threshold logic, alerting, scheduling, spending, routing, or domain-specific recommendation policy, keep that logic in the embedding repo instead of widening AIQL.
