# Synthetic Multi-Model Disagreement Report

This report is generated from sanitized AIQL batch-summary comparison data. It is a caller-owned triage template for model-cohort disagreement, not an approval or routing decision.

## Inputs

- Baseline model cohort: Synthetic disagreement baseline summary
- Candidate model cohort: Synthetic disagreement candidate summary

## Disagreement Snapshot

- Compared entries: matched=4; changed=3; unchanged=1.
- Cohort-only entries: candidate-only=1; baseline-only=1.
- Severity movement across matched entries: improved=1, regressed=1, unchanged=1, unavailable=1.
- Finding count delta: total=0; critical=0, high=0, medium=0, low=0, unknown=0.
- Prompt eval delta: total=55; added=125; unavailable=0.

## Priority Disagreements

- `evidence-review`: status unchanged; severity medium->high (regressed); findings delta=1.
- `format-review`: status failure->success; severity unavailable; findings unavailable.

## Other Differences

- `accessibility-review`: status unchanged; severity high->medium (improved); findings delta=-1.
- Only in candidate `consistency-review`: status=success; mode=expert; severity=low; findings=1.
- Only in baseline `deprecated-review`: status=success; mode=expert; severity=medium; findings=1.

## Stable Agreement

- `risk-review`: status unchanged; severity low->low (unchanged); findings delta=0.

## Uncertainties

- 1 matched entry has unavailable severity movement, so disagreement severity is only partially observed.
- This template highlights disagreement signals only; caller-owned triage still decides acceptance, routing, thresholds, and follow-up.

## Boundary

This template assumes disagreement is expressed through two comparable published batch summaries. If a workflow needs same-run multi-model arbitration, reviewer clustering, or approval policy, keep that domain-specific layer outside AIQL or promote it only after a separate generic-boundary decision.
