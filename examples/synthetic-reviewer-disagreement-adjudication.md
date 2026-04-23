# Synthetic Reviewer Disagreement Adjudication

This note summarizes disagreement between two sanitized AIQL structured review results for one caller-owned tie-break pass. It does not decide approval, routing, or remediation ownership.

## Inputs

- Reviewer A: Synthetic reviewer disagreement left artifact
- Reviewer B: Synthetic reviewer disagreement right artifact

## Disagreement Snapshot

- Overall severity alignment: mixed (high -> medium, improved).
- Findings compared: matched=2; disagreements=3; stable_agreements=1.
- Disagreement classes: finding_presence_mismatch=2, severity_calibration_mismatch=1, evidence_coverage_mismatch=1, recommendation_scope_mismatch=1, rationale_wording_mismatch=1.
- Likely root causes: issue_detection_gap=2, severity_calibration_gap=1, evidence_traceability_gap=1, recommendation_scope_gap=1, wording_normalization_gap=1.

## Priority Tie-Breaks

- `Approval boundary`: classes=finding_presence_mismatch; likely_root_causes=issue_detection_gap.
  Tie-break: Check whether both reviewers inspected the same evidence scope for Approval boundary; if the issue stands, keep one stable generic finding key instead of treating it as separate work.
  Reviewer A: severity=low; summary=The summary avoids approval language.
- `Sponsor language`: classes=finding_presence_mismatch; likely_root_causes=issue_detection_gap.
  Tie-break: Check whether both reviewers inspected the same evidence scope for Sponsor language; if the issue stands, keep one stable generic finding key instead of treating it as separate work.
  Reviewer B: severity=medium; summary=The summary sounds too close to approval guidance.
- `Claim support`: classes=severity_calibration_mismatch, evidence_coverage_mismatch, recommendation_scope_mismatch, rationale_wording_mismatch; likely_root_causes=severity_calibration_gap, evidence_traceability_gap, recommendation_scope_gap, wording_normalization_gap.
  Tie-break: Use the left reviewer as the sponsor-facing default severity for Claim support until the evidence justifies lowering it. Ask which evidence labels actually support Claim support before accepting or dismissing the disagreement. Prefer the narrower reversible recommendation for Claim support until the caller chooses a stronger action. After resolving the material differences, normalize the wording for Claim support so later runs do not create avoidable churn.
  Reviewer A: severity=high; summary=The packet overstates what the cited evidence proves.
  Reviewer B: severity=medium; summary=The packet still needs a caveat before it can reuse the evidence.

## Stable Agreement

- `Source traceability`: severity=medium; summary aligned.

## Boundary

AIQL can compare two published structured review results and format a caller-owned adjudication note. Reviewer assignment, approval thresholds, tracker writes, remediation routing, and private source interpretation remain outside the shared package surface.
