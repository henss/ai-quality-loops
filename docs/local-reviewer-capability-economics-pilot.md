# Local Reviewer Capability And Economics Pilot

This note records a first-hand local-Ollama pilot over one fixed synthetic pack on April 24, 2026. It stays inside AIQL's published review surface: one checked manifest shape, one synthetic packet, existing batch summaries, and comparison artifacts. It does not add routing policy, benchmark automation, persistent scorecards, or private-domain assumptions.

## Classification

Output classification: artifact.

## Scout Check

No solution scout run was needed for this slice. The work adds no reusable tooling, dependency, adapter, scheduler, parser, renderer, or automation. Local ownership is cheaper because the deliverable is one bounded evidence readout built from existing AIQL review commands and artifacts.

## Fixed Pack And Cohorts

- Fixed synthetic pack: `examples/synthetic-reviewer-contract-review-context.md` with `examples/synthetic-reviewer-contract-review-context.json`
- Batch surface: one-entry manifests under `reviews/local-reviewer-capability-economics-pilot/*.manifest.json`
- Persona: `Efficiency`, which resolves to the checked-in `REPOSITORY & AI EFFICIENCY SPECIALIST` persona in `personas/universal.md`
- Cohorts:
  - `qwen3.5:27b`
  - `phi4:latest`
  - `gpt-oss:latest`

## Live Capability Snapshot

`ollama list` and `review-preflight` confirmed that all three text cohorts were installed locally and that the fixed pack context resolved successfully. The meaningful capability difference appeared only at execution time:

| Cohort | Preflight | Structured decision parsed | Batch status | Practical fit |
| --- | --- | --- | --- | --- |
| `qwen3.5:27b` | Pass | Yes | Success | Contract-fit baseline |
| `phi4:latest` | Pass | Yes | Success | Contract-fit candidate |
| `gpt-oss:latest` | Pass | No | Failure | Not contract-fit for this seam |

`gpt-oss:latest` is the important negative result. It passed reachability, model-presence, persona, and context checks, but still failed the actual expert-review contract because the structured path did not emit a valid `peer_review_decision_v1` object.

## Economics Snapshot

This is a single-run pilot, not a stable benchmark. The numbers below are still useful for bounding the immediate tradeoff on this exact pack:

| Cohort | Wall-clock `durationMs` | `loadDurationMs` | `promptEvalCount` | `evalCount` | Output chars | Structured result |
| --- | --- | --- | --- | --- | --- | --- |
| `qwen3.5:27b` | 8,556 | 179 | 1,016 | 334 | 1,437 | 2 findings, overall severity `medium` |
| `phi4:latest` | 21,915 | 17,128 | 956 | 174 | 795 | 1 finding, overall severity `low` |
| `gpt-oss:latest` | 53,593 | unavailable | unavailable | unavailable | 0 | failure before structured result |

The narrow economics readout is:

- `phi4:latest` used slightly fewer prompt-eval tokens than `qwen3.5:27b` on this pack, but it was much slower overall because cold-load time dominated the run.
- `qwen3.5:27b` was materially faster and produced the richer structured result on the same packet.
- `gpt-oss:latest` consumed the most wall-clock time while failing the contract entirely, so it is not a viable default candidate for this seam.

## Comparison Readout

The stored comparison artifacts keep the public-safe contract shape:

- `reviews/local-reviewer-capability-economics-pilot/qwen-vs-phi4-comparison.json`
- `reviews/local-reviewer-capability-economics-pilot/qwen-vs-gpt-oss-comparison.json`

If the same pilot is rerun later, prefer storing each cohort execution as a same-fixture run ledger first and diffing those ledgers with `batch-review-ledger-diff` so pack identity remains explicit before interpreting the comparison.

Those reports show:

- `phi4:latest` improved severity from `medium` to `low` and reduced the total finding count by one versus the `qwen3.5:27b` baseline
- `gpt-oss:latest` changed status from `success` to `failure`, leaving severity unavailable

That means the economics readout cannot be separated from capability on this pack. The cheaper prompt-eval candidate also looked less sensitive to the synthetic packet's explicit external-action-readiness issue, and the third candidate never satisfied the contract.

## Pilot Verdict

For this one fixed synthetic pack, `qwen3.5:27b` remains the best local default among the tested cohorts.

- `qwen3.5:27b`: `cheap_default_candidate`
  Value: fastest successful run and the strongest issue capture on this packet.
- `phi4:latest`: `not_worth_defaulting`
  Value: contract-fit, but slower in wall-clock time and less sensitive on the pack's main readiness issue.
- `gpt-oss:latest`: `not_contract_fit`
  Value: preflight-clean but execution-invalid for the structured expert-review seam.

This is enough evidence for a bounded pilot conclusion. It is not enough evidence to publish a general model leaderboard, set sponsor thresholds, or treat one low-severity output as proof that the baseline was too strict.

## Recommended Next Step

Do not expand AIQL into a benchmark runner from this result alone. If a real model-choice decision later matters, rerun the same fixed-pack method with:

- at least one warm-cache repeat per successful cohort
- one caller-owned usefulness rubric outside AIQL
- the same published batch summary and comparison surfaces

Until that decision exists, the cheapest safe posture is to keep `qwen3.5:27b` as the local default for this reviewer-contract seam.

## Generic Extraction Question

The remaining extraction question is whether a future repeated open-source-safe need justifies one thin helper that tabulates cohort summaries into a compact Markdown pilot readout. That remains generic only if the helper consumes existing batch-summary artifacts plus caller-supplied cohort labels, while pack selection, run scheduling, usefulness scoring, and routing stay outside AIQL.
