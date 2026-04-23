# Local Ollama Reviewer Capability Map

This note records a public-safe capability map between the local Ollama inventory available on April 23, 2026 and the reviewer-contract surfaces that AI Quality Loops actually publishes today. It is intentionally narrower than a benchmark plan: the goal is to answer contract-fit questions with first-hand evidence, not to create a package-owned model leaderboard or routing policy.

## Classification

Output classification: artifact.

## Scout Check

No solution scout run was needed for this slice. The work adds no reusable tooling, adapter, dependency, scheduler, automation, or package-like helper. Local ownership is cheaper because the need is evidence capture and boundary clarification over existing AIQL review surfaces.

## Contract Seams In Scope

The current local-Ollama reviewer decision only needs to cover the package's existing public-safe seams:

- expert review can emit a structured review-result artifact and, when the model follows the enforced JSON prompt, a parsed `peer_review_decision_v1`
- vision review can emit a structured review-result artifact from screenshot-backed review markdown
- preflight can confirm Ollama reachability, requested model presence, browser readiness, and persona resolution
- batch summary artifacts can carry Ollama telemetry for later caller-owned gating or comparison

This note does not try to decide approval policy, acceptance thresholds, reroute logic, benchmark dashboards, or default-model economics.

## Local Evidence Snapshot

First-hand local checks on April 23, 2026 showed:

- `review-preflight --mode both --expert "UI/UX" --json` passed against `http://127.0.0.1:11434` and reported 9 installed models
- the default expert model `qwen3.5:27b` is installed and completed one live structured expert review over `examples/synthetic-reviewer-contract-review-context.md`
- the default vision model `qwen3-vl:30b` is installed and completed one live structured vision review over `examples/synthetic-zone-layout.html`
- the local Ollama inventory exposed one clearly vision-capable installed model (`qwen3-vl:30b`) and several text-capable candidates (`qwen3.5:27b`, `phi4:latest`, `gpt-oss:latest`, `gemma3:12b`, `qwen2.5-coder:32b-instruct-q4_K_M`, `deepcoder:14b-preview-q8_0`, `mightykatun/qwen2.5-math:7b`)

## Capability Map

| AIQL seam | What the seam requires | Local model evidence | Current fit |
| --- | --- | --- | --- |
| Expert structured review result with decision | Text generation, stable JSON following, parsed `peer_review_decision_v1`, Ollama telemetry | `qwen3.5:27b` completed a live `expert-review --json` run with `decisionParsed: true` and populated telemetry | Confirmed for the default expert path |
| Vision structured review result shell | Screenshot-backed image input plus markdown that AIQL can sanitize into `summary`, `findings`, and `provenance` | `qwen3-vl:30b` completed a live `vision-review --json` run and produced a structured review result | Confirmed for the default vision path |
| Vision decision-bearing contract | Same as above, plus a parseable `peer_review_decision_v1` block inside the vision markdown | The live `qwen3-vl:30b` run produced findings and summary but no parsed decision block | Not currently proven by the package default vision flow |
| Preflight contract | Reachable Ollama endpoint, installed requested models, browser, persona resolution | Live preflight succeeded for default expert and vision settings | Confirmed |
| Multi-model local choice for vision | At least two installed vision-capable candidates worth comparing | Only one clearly vision-capable installed model is present locally | No real choice surface yet |
| Multi-model local choice for expert | More than one installed text model plus a decision that depends on comparing them | Several text-capable candidates are installed, but only `qwen3.5:27b` has direct AIQL contract evidence in this slice | Inventory exists, contract-fit evidence mostly unproven |

## Main Finding

The local-Ollama-first reviewer contract is already satisfied for the current default path without adding new package code:

- text review has direct end-to-end evidence through `qwen3.5:27b`
- vision review has direct artifact-generation evidence through `qwen3-vl:30b`
- preflight already covers the operational readiness check the package needs before a run

The only material ambiguity exposed by live execution is that the vision path does not currently prove a decision-bearing contract in the same way the expert path does. That is not a model-installation problem. It is a package-surface distinction: `runExpertReview(...)` explicitly requests decision JSON in structured mode, while `runVisionReview(...)` currently depends on whatever review markdown the model happens to emit.

## What To Keep Out Of Scope

Keep the backlog unless a real reviewer-contract decision depends on more than the evidence above. In particular, do not add package-owned benchmarking, routing, model scorecards, same-run arbitration, or persistent model ledgers just because multiple local text models are installed.

## Recommended Next Step

If a real workflow later needs a stronger vision contract, take one bounded slice:

- make the vision structured path explicitly request and validate the same `peer_review_decision_v1` block that expert review already enforces

That step has immediate contract value because it closes a real asymmetry already visible in live evidence. It is cheaper and more generally reusable than benchmarking every installed text model first.

## Generic Extraction Question

The extraction remains generic while AIQL documents which installed local model classes are sufficient for each published reviewer contract and where the package itself does or does not enforce decision JSON. If a future slice needs machine-specific benchmark cohorts, sponsor scoring, routing policy, or private-domain model preferences, keep that logic in the embedding workflow unless repeated public-safe demand proves a thinner shared seam.
