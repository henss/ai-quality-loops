# Synthetic Launch-Outcome Evidence Summary

This fixture demonstrates the compact evidence shape emitted by `formatLaunchOutcomeEvidenceSummary(...)` for a caller-owned launch outcome note. It contains no real launch names, tracker identifiers, customer data, private repository paths, source URLs, approval policy, or company-specific workflow labels.

## Inputs

- Previous review artifact: Local file path (.json file)
- Current review artifact: Local file path (.json file)

## Material Signals

- Entries: before=3, after=3, matched=2, added=1, removed=1, statusChanged=1.
- Severity movement among matched entries: improved=1, regressed=0, unchanged=0, unavailable=1.
- Finding count delta: total=-1; critical=0, high=-1, medium=1, low=-1, unknown=0.
- Gate result: pass (Review gate passed under caller-owned thresholds.)

## Evidence Notes

- `packet-review`: status failure->success; severity unavailable; findings unavailable.
- `surface-review`: status unchanged; severity high->medium (improved); findings delta=-1.
- Added `new-check`: status=success; mode=expert; severity=low; findings=1.
- Removed `removed-check`: status=success; mode=expert; severity=low; findings=1.

## Uncertainties

- 1 matched entry has unavailable severity movement, so aggregate movement is incomplete.
- This summary does not decide launch readiness, publish tracker comments, or route follow-up work.

## Boundary

AIQL can summarize sanitized review comparisons and optional gate evidence. The embedding workflow owns real source selection, launch definition, approval authority, decision labels, tracker writes, and downstream action.
