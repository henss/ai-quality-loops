# Synthetic Cross-Review Consensus Report

This report summarizes consensus across published sanitized AIQL structured review results for one caller-owned target. It does not assign approval authority, reviewer weighting, or downstream routing.

## Inputs

- Reviewer A structured result
- Reviewer B structured result
- Reviewer C structured result

## Consensus Snapshot

- Reviews compared: 3.
- Unique finding groups: 3.
- Overall severity consensus: high (majority); critical=0, high=2, medium=1, low=0, unknown=0.
- Finding presence consensus: unanimous=1, majority=1, split=1, single-reviewer=0.
- Finding severity consensus: unanimous=1, majority=1, split=0, single-reviewer=1.
- Wording consensus: unanimous=0, majority=1, split=1, single-reviewer=1.
- Recommendation consensus: unanimous=1, majority=1, split=0, single-reviewer=1.
- Evidence consensus: unanimous=1, majority=1, split=0, single-reviewer=1.

## Findings

- `Claim support`: presence=unanimous (3/3); severity=high (majority); wording=majority; recommendation=majority; evidence=majority.
  - Reviewer A: severity=high; summary=The packet overstates what the cited evidence proves.
  - Reviewer B: severity=high; summary=The packet overstates what the cited evidence proves.
  - Reviewer C: severity=medium; summary=The packet still needs a caveat before it can reuse the evidence.
- `Approval boundary`: presence=majority (2/3); severity=medium (unanimous); wording=split; recommendation=unanimous; evidence=unanimous.
  - Reviewer A: severity=medium; summary=The summary needs a clearer caller-owned approval boundary.
  - Reviewer B: severity=medium; summary=The note should keep approval authority caller-owned.
- `Sponsor language`: presence=split (1/3); severity=medium (single-reviewer); wording=single-reviewer; recommendation=single-reviewer; evidence=single-reviewer.
  - Reviewer C: severity=medium; summary=The summary sounds too close to approval guidance.

## Boundary

AIQL can compare published structured review results and expose where several reviewers converge or diverge on one target. Reviewer selection, weighting, arbitration thresholds, approval policy, and any real-world action remain caller-owned.
