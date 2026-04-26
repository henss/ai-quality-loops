# Evidence Request Abstention Packet

## Review Goal

Check whether the reviewer can abstain when the packet does not include enough evidence to judge the main claim.

## Claims

| Claim | Evidence label | Caveat |
| --- | --- | --- |
| The packet has enough support to decide the main claim. | Evidence label A | The label is synthetic shorthand, not source truth. |
| Evidence label C contains the decisive source summary. | Evidence label C | The summary is intentionally omitted from this sample. |
| Follow-up remains caller-owned. | Evidence label B | The caller owns retrieval, freshness checks, and routing. |

## Expected Reviewer Posture

- Do not accept or reject the main claim from Evidence label C alone.
- Emit an abstain-and-request-evidence decision with a concrete evidence request.
- Ask for a sanitized source summary and caller-owned freshness note only.
- Keep approval, routing, remediation ownership, publication, retention, and external action caller-owned.
