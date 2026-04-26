# Synthetic Recurring Review Failure: Verification Wrapper Mismatch

This synthetic packet is analysis-only. It checks whether a reviewer notices when the wrapper summary and the cited verification command do not line up.

## Verification Note

- Wrapper claim: `pnpm verify:session` passed for the changed surface.
- Cited command: `pnpm test -- review-gate.test.ts`
- Attached interpretation: "All required repo checks passed."

## Caveat

The cited command does not match the wrapper claim. A caller-owned workflow must rerun or restate the verification step before a reviewer treats the packet as defended.

## Expected Reviewer Posture

- Flag the wrapper mismatch instead of repeating the claimed verification at face value.
- Prefer both a review rerun and a caller review boundary rather than inferring that the check already passed.
- Prefer a stable generic finding key such as `verification-wrapper-mismatch` if the issue is surfaced.
