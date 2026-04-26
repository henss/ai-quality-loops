# Synthetic Recurring Review Failure: Stale Deterministic Inputs

This synthetic packet is analysis-only. It checks whether a reviewer notices when a deterministic input bundle is older than the packet that depends on it.

## Snapshot Notes

| Input | Freshness marker | Claimed use | Caveat |
| --- | --- | --- | --- |
| Comparison baseline | Older than one review cycle | Used as if it still reflects the current packet. | The baseline may have drifted since the current packet was prepared. |
| Deterministic command summary | Generated before the current edit pass | Used to justify a confidence claim. | The summary does not confirm that the current packet still matches the snapshot. |

## Expected Reviewer Posture

- Flag stale, drift-prone deterministic inputs before treating the packet as current.
- Ask for refreshed evidence instead of filling in certainty from the older snapshot.
- Track follow-up so the caller verifies the refreshed input stays current after repair.
- Prefer a stable generic finding key such as `stale-deterministic-input` if the issue is surfaced.
