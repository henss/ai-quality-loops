# Starter Reviewer Contract Packet

Replace this file with a caller-sanitized packet from your own repository. Keep the packet generic enough that it can be reviewed without exposing private system names, private user data, local paths, raw screenshots, tracker state, or domain-specific approval policy.

## Review Goal

Check whether the packet makes supported claims while preserving caller-owned action boundaries.

## Claims

| Claim | Evidence label | Caveat |
| --- | --- | --- |
| The packet identifies one repeated concern. | Evidence label A | The label is caller-supplied shorthand, not portable proof by itself. |
| The packet proposes one bounded follow-up. | Evidence label B | The caller still owns priority, routing, and remediation. |
| The packet is ready for an external action. | Evidence label C | This claim stays intentionally weak until the caller adds explicit approval, release, or routing evidence. |

## Expected Reviewer Posture

- Report unsupported or over-broad claims as findings.
- Keep evidence references generic and caller-sanitized.
- Prefer stable generic finding keys only when the same boundary could recur across runs.
- Limit recommendations to caveats, evidence collection, reruns, or follow-up tracking.
- Do not approve publication, deployment, remediation ownership, tracker routing, retention, or real-world action.
