# Synthetic Recurring Review Failure: Source Audit Evidence Path Gap

This synthetic packet is analysis-only. It checks whether a reviewer notices when a source audit claims traceability but leaves the sanitized evidence path unresolved.

## Source Audit Excerpt

| Source label | Audit note | Evidence path |
| --- | --- | --- |
| Evidence label A | Freshness checked by caller-owned workflow. | `synthetic://evidence/a` |
| Evidence label B | Cited as supporting the launch note. | Not provided |
| Evidence label C | Requires caller retrieval before reuse. | unresolved |

## Faulty Evidence Claim

- "All source-audit evidence paths are attached and ready for downstream review."
- The packet does not include a caller-owned retrieval note for the missing or unresolved evidence paths.

## Expected Reviewer Posture

- Flag the missing source-audit evidence path instead of accepting the traceability claim.
- Prefer both evidence collection and caller review before the packet is reused.
- Prefer a stable generic finding key such as `source-audit-evidence-path-gap` if the issue is surfaced.
