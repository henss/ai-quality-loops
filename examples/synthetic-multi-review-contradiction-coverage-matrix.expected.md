# Multi-Review Contradiction and Coverage Matrix

This matrix is generated from sanitized AIQL batch-summary comparison data. It highlights overlap, contradiction signals, and uncovered checks without making caller-owned routing or approval decisions.

## Inputs

- Baseline: Synthetic disagreement baseline summary
- Candidate: Synthetic disagreement candidate summary

## Totals

- Rows: 6; both-covered=3; baseline-only=1; candidate-only=2; not-covered=0.
- Rows with contradiction signals: 5; uncovered checks: 3.

## Matrix

| Check | Label | Baseline | Candidate | Overlap | Signals | Severity | Findings Delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accessibility-review | Accessibility reviewer | covered | covered | both-covered | severity-improved, finding-count-changed | high -> medium | -1 |
| consistency-review | Consistency reviewer | uncovered | covered | candidate-only | missing-baseline | - -> low | - |
| deprecated-review | Deprecated reviewer | covered | uncovered | baseline-only | missing-candidate | medium -> - | - |
| evidence-review | Evidence reviewer | covered | covered | both-covered | severity-regressed, finding-count-changed | medium -> high | 1 |
| format-review | Format reviewer | failed | covered | candidate-only | status-changed, severity-unavailable | - -> low | - |
| risk-review | Risk reviewer | covered | covered | both-covered | none | low -> low | 0 |

## Notes

- `accessibility-review`: Matrix signals: severity improved, finding count changed, findings delta -1.
- `consistency-review`: Candidate produced a covered check that is absent from the baseline summary.
- `deprecated-review`: Baseline produced a covered check that is absent from the candidate summary.
- `evidence-review`: Matrix signals: severity regressed, finding count changed, findings delta 1.
- `format-review`: Matrix signals: status changed, severity unavailable, coverage failed->covered.
- `risk-review`: Covered by both summaries with no matrix-level contradiction signal.

## Boundary

The matrix is a generic artifact over comparable review summaries. Domain-specific escalation policy, reviewer weighting, and project acceptance thresholds remain caller-owned.
