# Synthetic Reviewer Contract Packet

This synthetic packet demonstrates a public-safe target for the AIQL structured review-result contract. It contains no real tracker state, private source names, account details, user data, local paths, hostnames, screenshots, production logs, or domain policy.

## Review Goal

Check whether the packet makes supported claims while preserving caller-owned action boundaries.

## Claims

| Claim | Evidence label | Caveat |
| --- | --- | --- |
| The reviewed note identifies a repeated issue. | Evidence label A | The label is synthetic and does not represent a real source. |
| The reviewed note proposes one follow-up. | Evidence label B | The caller still owns priority, routing, and remediation. |
| The reviewed note is ready for external action. | Evidence label C | This claim is intentionally weak; the packet provides no approval, release, or routing evidence. |

## Expected Reviewer Posture

- Report unsupported or over-broad claims as findings.
- Use generic evidence labels only.
- Keep recommendations limited to caller-owned confirmation, caveats, or review preparation.
- Do not approve publication, deployment, remediation ownership, tracker routing, retention, or real-world action.
