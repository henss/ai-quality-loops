# Sponsor Memo

This memo summarizes one sanitized AIQL reviewer output for a caller-owned sponsorship decision. It does not approve, decline, route, or write downstream state on its own.

## Inputs

- Review artifact: Synthetic PR review adapter pilot
- Workflow: expert
- Expert: PR Review Adapter Pilot
- Model: synthetic-pr-review-fixture
- Overall severity: high

## Sponsor Decision

- Sponsor posture: pause sponsorship and request caller review before proceeding.
- Reviewer confidence: medium.
- Practical decision: The reviewer found sponsor-relevant backlog candidates, but the caller should attach validation evidence before downstream triage.

## Evidence Pointers

- Validation evidence is missing (high): The synthetic change record describes a review-sensitive behavior change but does not include a caller-owned validation result. Recommendation: Ask the embedding workflow to attach a sanitized validation summary before downstream triage. Evidence: PR evidence label A; Validation slot: missing.
- Merge authority remains caller-owned (medium): The handoff can name a review concern but must not decide merge, assignment, priority, or repository policy. Recommendation: Keep merge policy, owner assignment, and tracker writes in the embedding workflow. Evidence: Boundary note: synthetic fixture only.
- Content source: Synthetic PR review packet
- Review surface: Structured review-result contract
- Privacy boundary: No real issue keys, repository names, branches, accounts, file paths, hostnames, or private policy

## Open Questions

- What is the caller plan for: Attach a sanitized validation summary?
- Who owns the follow-up for: Keep merge policy, owner assignment, and tracker writes caller-owned?
- Has the caller completed the recommended action for Validation evidence is missing?
- Has the caller completed the recommended action for Merge authority remains caller-owned?

## Boundary

AIQL can format sanitized reviewer output into a compact sponsor-facing memo. The embedding workflow still owns real approval authority, private source interpretation, tracker writes, and downstream action.
