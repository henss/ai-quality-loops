# Local Review Model Economics Benchmark Proposal

This note defines a public-safe proposal for benchmarking local review-model economics on fixed pack sets without turning AIQL into a benchmark runner, routing controller, or cost-policy layer. It is generic on purpose: real pack contents, sponsor priorities, machine inventory, budget thresholds, approval policy, and model-routing decisions stay in the embedding workflow.

## Classification

Output classification: proposal and artifact.

## Scout Check

No solution scout run was needed for this slice. The proposal adds no reusable tooling, dependency, adapter, client, parser, renderer, scheduler, observability surface, or automation. Local ownership is cheaper because the immediate need is decision framing over already-published AIQL review artifacts, not a new benchmark framework.

## Current Evidence

AIQL already emits most of the public-safe fields needed for a bounded local-model economics readout:

- batch-review summary entries include per-review `durationMs`
- batch-review summary entries can include `ollamaTelemetry.totalDurationMs`, `loadDurationMs`, `promptEvalCount`, `promptEvalDurationMs`, `evalCount`, and `evalDurationMs`
- `batch-review --run-ledger-output` can bind one published summary to a stable same-fixture fingerprint plus caller-owned pack and run labels
- `review-gate` can enforce explicit prompt-eval budgets from published batch summaries
- `batch-review-compare` and `formatMultiModelDisagreementReport(...)` can compare two published summary artifacts for changed findings, severity movement, and prompt-eval deltas
- `batch-review-ledger-diff` can compare two published ledgers while rejecting fixture drift before the diff is interpreted

Those seams are useful, but they are still narrower than a full fixed-pack economics benchmark. They compare two published runs and highlight disagreement, yet they do not produce a multi-cohort benchmark readout that combines repeated-run latency, prompt-volume proxy, consistency, and caller-owned usefulness judgment across several local model configurations.

## Proposed Benchmark Shape

When a concrete routing or budget decision depends on it, run a caller-owned benchmark over one fixed pack set and a small number of in-bounds local model configurations.

The benchmark should stay narrow:

- reuse one checked batch-review manifest or other fixed pack definition across all cohorts
- keep the pack public-safe or caller-sanitized
- run each cohort enough times to expose obvious instability, not to build a broad evaluation framework
- record only published artifact fields plus a small caller-owned usefulness verdict

## Minimum Fields

Record the following in the caller-owned benchmark note, sheet, or outcome artifact:

- pack label
- cohort label such as model id or local configuration label
- run count
- succeeded and failed review counts
- aggregate wall-clock review duration from summary `durationMs`
- aggregate prompt-eval count as the primary local cost proxy
- aggregate eval count or eval duration when available
- disagreement or severity-regression counts versus the chosen baseline summary
- a short caller-owned usefulness verdict such as `cheap_default_candidate`, `higher_trust_candidate`, or `not_worth_defaulting`

## Decision Rule

Do not promote this into package code just because the telemetry exists. Keep the backlog unless a real decision depends on it, such as:

- choosing a default local review model
- choosing whether a higher-trust cohort is worth its extra local compute cost
- setting an explicit prompt-eval or run-time budget for a repeatable review workflow

If that trigger appears, the first bounded slice should still avoid framework expansion. Start with a caller-owned benchmark readout built from existing batch summaries and comparison artifacts. Only consider a shared AIQL helper if repeated open-source-safe use cases need the same artifact shape.

## Shared Boundary

AIQL can host:

- generic guidance for fixed-pack benchmarking using existing batch-review artifacts
- public-safe examples that reference only sanitized pack labels and model cohort labels
- generic disagreement and prompt-eval comparison helpers that stay approval-neutral

The embedding workflow owns:

- real pack selection, pack contents, and redaction policy
- model-routing policy and sponsor thresholds
- machine-specific runtime conditions such as memory pressure, warmup strategy, and concurrency
- usefulness scoring, acceptance policy, and final model choice
- any benchmark dashboard, scheduler, tracker write, or budget decision

## Generic Extraction Question

The extraction remains generic only while AIQL describes how to compare fixed packs using already-published summary artifacts and caller-owned judgments. If a future slice needs same-run multi-model arbitration, benchmark orchestration, persistent cost ledgers, machine normalization, sponsor scoring, or routing policy, keep that logic in the embedding workflow unless repeated public-safe demand proves a thinner shared seam.
