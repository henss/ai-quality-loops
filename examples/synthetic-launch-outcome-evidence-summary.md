# Synthetic Launch-Outcome Evidence Summary

This fixture demonstrates a compact evidence shape for a caller-owned launch outcome note. It contains no real launch names, tracker identifiers, customer data, private repository paths, source URLs, approval policy, or company-specific workflow labels.

## Inputs

- Previous review artifact: Local file path (.json file)
- Current review artifact: Local file path (.json file)
- Comparison artifact: Local file path (.json file)
- Gate artifact: Local file path (.json file)

## Material Signals

- Entries: before=3, after=3, matched=2, added=1, removed=1, statusChanged=1.
- Severity movement among matched entries: improved=1, regressed=0, unchanged=0, unavailable=1.
- Finding count delta: total=-1; critical=0, high=-1, medium=1, low=-1, unknown=0.
- Gate result: pass under caller-owned thresholds.

## Evidence Notes

- `surface-review`: severity improved from high to medium after one high finding was removed.
- `packet-review`: status changed from failure to success, but severity remained unavailable because the source artifact had no structured rollup.
- `new-check`: added as a synthetic review entry with one low finding that does not exceed caller-owned thresholds.

## Uncertainties

- One matched entry has unavailable severity, so the caller should not claim complete risk reduction from aggregate movement alone.
- The gate threshold is caller-owned and cannot be inferred from this fixture.
- This summary does not decide launch readiness, publish tracker comments, or route follow-up work.

## Boundary

AIQL can provide sanitized review summaries, comparison deltas, and gate evidence. The embedding repo owns the real source selection, launch definition, approval authority, decision labels, and any downstream action.
