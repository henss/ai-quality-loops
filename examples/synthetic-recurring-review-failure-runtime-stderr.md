# Synthetic Recurring Review Failure: Unclassified Runtime Stderr

This synthetic packet is analysis-only. It checks whether a reviewer notices when a review run records runtime stderr without explaining whether it is expected, harmless, or blocking.

## Verification Note

- Command result: review command exited successfully.
- Runtime stderr: a model-runtime warning was emitted during generation.
- Attached interpretation: not recorded.
- Wrapper claim: "The review completed successfully and is ready to reuse."

## Caveat

The successful exit is not enough to classify the stderr. A caller-owned workflow must record whether the warning is expected, harmless, or blocking, or rerun the review before treating the output as defended.

## Expected Reviewer Posture

- Flag the unclassified runtime stderr instead of treating the successful exit as complete evidence.
- Prefer both a rerun and a caller review boundary when the stderr interpretation is missing.
- Prefer a stable generic finding key such as `unclassified-runtime-stderr` if the issue is surfaced.
