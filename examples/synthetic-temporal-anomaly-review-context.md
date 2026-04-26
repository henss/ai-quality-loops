# Synthetic Temporal Anomaly Review Packet

This synthetic packet demonstrates an apartment-agnostic temporal anomaly lane for AIQL. It uses generic frame labels, synthetic zone references, and caller-sanitized evidence notes only. It contains no real room names, raw images, capture paths, timestamps tied to a household, device identifiers, resident details, map data, or private implementation notes.

## Review Goal

Check whether the packet describes a temporal anomaly carefully enough to stay reusable in the shared AIQL surface.

## Packet Summary

The packet compares two synthetic frames and one caller note:

| Label | Synthetic evidence note | Intended use | Known caveat |
| --- | --- | --- | --- |
| Frame A | `Zone alpha outline remains clear and static.` | Baseline synthetic frame for temporal comparison. | The note does not expose a raw capture, room identity, or private scene truth. |
| Frame B | `Zone alpha now contains one new unlabeled shape near the walkway edge.` | Candidate anomaly frame for generic review. | The note does not prove identity, cause, or persistence beyond this synthetic pair. |
| Evidence note C | `Caller summary says the pair may justify a follow-up review for temporal drift.` | Bounded analyst note about a possible anomaly lane. | The note is advisory only and does not authorize alerting or action. |

## Claims To Review

| Claim | Evidence label | Caveat |
| --- | --- | --- |
| The packet captures one generic temporal anomaly worth follow-up review. | Frame A, Frame B, Evidence note C | This claim should stay limited to a synthetic anomaly description. |
| The packet proves a person entered the space between frames. | Frame B | This claim is intentionally too strong; the packet has no identity or occupancy evidence. |
| The packet is ready for automated household action. | Evidence note C | This claim is intentionally unsupported; the shared surface must remain caller-gated and analysis-only. |

## Expected Reviewer Posture

- Flag any jump from generic temporal change to occupancy, identity, or intent.
- Keep recommendations limited to caller-owned evidence collection, caveat repair, or follow-up tracking.
- Prefer stable generic finding keys when the same temporal evidence or authority gap could recur.
- Do not approve notifications, home-control actions, retention changes, or real-world household action.
