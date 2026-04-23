# Synthetic Recurring Review Failure: Missing Evidence Handles

This synthetic packet is analysis-only. It exists to check whether a reviewer notices that the packet cites evidence labels without a usable evidence handle boundary.

## Claimed Situation

| Claim | Evidence label | Evidence handle | Caveat |
| --- | --- | --- | --- |
| The packet has enough traceability to support one bounded recommendation. | Evidence label A | Intentionally omitted | The shared packet names the label but does not include a caller-owned source handle. |
| A follow-up note said the same support gap appeared before. | Evidence label B | `source:recurring-eval/summary-b` | The handle is opaque and still needs caller-owned retrieval. |

## Expected Reviewer Posture

- Flag that the first claim lacks an evidence handle and should not be treated as traceable.
- Keep any request to resolve or store the missing handle caller-owned.
- Prefer a stable generic finding key such as `missing-evidence-handle` if the issue is surfaced.
