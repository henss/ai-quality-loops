# Single Reviewer Versus Consensus Classification

This note classifies when a caller can usually rely on one AIQL reviewer output and when a consensus or tie-break pass is worth the extra local review cost. It stays inside AIQL's public surface: synthetic fixtures, structured review results, batch-summary comparisons, and local-Ollama-first execution. It does not add routing automation, reviewer assignment policy, approval thresholds, or private-domain assumptions.

## Classification

Output classification: proposal and artifact.

## Scout Check

No solution scout run was needed for this slice. The deliverable is a one-off decision readout over existing AIQL fixtures and docs. It adds no reusable tooling, helper API, adapter, scheduler, parser, renderer, dependency, or workflow automation.

## Evidence Inputs

- `docs/local-reviewer-capability-economics-pilot.md`
- `docs/reviewer-disagreement-explainer.md`
- `docs/reviewer-calibration-benchmark.md`
- `examples/synthetic-cross-review-consensus-report.md`
- `reviews/local-reviewer-capability-economics-pilot/qwen-vs-phi4-comparison.json`
- `reviews/local-reviewer-capability-economics-pilot/qwen-vs-gpt-oss-comparison.json`

## Result Table

| Evidence slice | Observed signal | Classification | Reason |
| --- | --- | --- | --- |
| Fixed reviewer-contract pack, `qwen3.5:27b` baseline versus `phi4:latest` candidate | Both runs returned structured results, but severity moved `medium` to `low` and total findings moved `2` to `1`. | Single reviewer only when the caller accepts the chosen reviewer's calibration; otherwise run consensus or tie-break. | The outputs are contract-fit but not equivalent enough to treat any single successful reviewer as interchangeable. |
| Fixed reviewer-contract pack, `qwen3.5:27b` baseline versus `gpt-oss:latest` candidate | Baseline succeeded; candidate status changed to `failure` with unavailable structured severity. | Do not use consensus with the failing reviewer; exclude or repair the reviewer first. | Consensus cannot rescue a reviewer that fails the structured contract on the fixed pack. |
| Synthetic three-reviewer consensus report | One finding group is unanimous, one is majority, and one is single-reviewer-only. | Single reviewer is reasonable for stable unanimous/majority finding families; consensus is useful for split or single-reviewer-only findings. | Consensus adds value when finding presence, wording, or recommendation scope is unstable across reviewers. |
| Reviewer calibration benchmark fixture | The passing synthetic reviewer scores `30/30`; the under-sensitive reviewer scores `25/30` and misses a verification signal. | Single reviewer is reasonable after calibration pass; consensus is preferred before relying on an uncalibrated or failed reviewer. | Calibration is the cheapest generic guard against under-sensitive single-reviewer output. |

## Recommendation

Use one reviewer when all of these are true:

- The reviewer is contract-fit on the relevant structured result surface.
- The reviewer passed a comparable synthetic calibration or fixed-pack check.
- The review is advisory, reversible, and low-to-medium impact.
- Prior comparable runs do not show material drift in status, finding presence, severity, evidence coverage, or recommendation scope.
- The caller only needs a compact review artifact, not quorum, arbitration, approval, or routing policy.

Use consensus, disagreement adjudication, or a caller-owned tie-break when any of these are true:

- Comparable reviewer outputs disagree on status, finding presence, severity, evidence coverage, recommendation scope, or action boundary.
- A candidate reviewer fails the structured contract; remove or repair it before considering it part of consensus.
- The output may affect public release, irreversible action, spend, safety, compliance, production behavior, or other caller-owned trust boundaries.
- The reviewer has not passed calibration on a comparable public-safe fixture.
- The result contains split or single-reviewer-only findings that would materially change the caller's next step.

## Boundary

AIQL can provide the structured review contract, fixed public-safe fixtures, deterministic comparison artifacts, calibration scoring, and compact disagreement or consensus readouts. The embedding workflow owns target selection, model choice, reviewer weighting, quorum rules, acceptance thresholds, escalation, tracker writes, and any real-world action.

## Generic-Vs-Domain-Specific Extraction Question

The remaining extraction question is whether AIQL should ever host a tiny classification helper that consumes existing comparison summaries and emits `single_reviewer_ok`, `tie_break_recommended`, or `consensus_required`. That remains generic only if it is purely artifact-based and approval-neutral. If thresholds depend on sponsor risk, domain policy, private evidence semantics, or operational routing, keep the classifier in the embedding workflow.
