# Synthetic Recurring Review Failure: Launch Evidence Regression Omission

This synthetic packet is analysis-only. It checks whether a reviewer notices when a launch-outcome evidence note presents a calm conclusion while omitting material comparison changes.

## Comparison Snapshot

| Signal | Observed value | Risk if omitted |
| --- | --- | --- |
| Added review entry | `new-check` arrived with one high-severity finding. | A new review concern is hidden from the launch note. |
| Severity movement | `surface-review` regressed from medium to high. | The launch note can overstate stability. |
| Removed review entry | `removed-check` disappeared from the current run. | Coverage drift is easy to miss without an explicit note. |

## Faulty Evidence Note

- "The launch-outcome evidence summary shows no material regression and only one routine refresh."
- The note does not mention the added review entry, the severity regression, or the removed coverage row.

## Expected Reviewer Posture

- Flag omitted added, removed, or regressed review signals before treating the launch evidence note as stable.
- Prefer a repair that revises the evidence note and collects the missing comparison details.
- Prefer a stable generic finding key such as `launch-evidence-regression-omission` if the issue is surfaced.
