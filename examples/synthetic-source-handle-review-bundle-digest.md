# Source-Handle Review Bundle Digest

This digest is generated from sanitized AIQL batch-review summary artifacts for caller-owned source-handle packs. It compresses review signals without resolving handles or replaying raw packet contents.

## Bundle Snapshot

- Reviews: total=4; succeeded=3; failed=1.
- Modes: expert=4; vision=0.
- Structured rollups: available=3; missing=1.
- Published decisions: accept_with_follow_up=1, changes_requested=1
- Prompt eval telemetry: total=2700; unavailable=2.

## Priority Entry Notes

- `bundle-digest-quality-expert`: failure; target=Local file path (.md file); error=Error: Failed to open Local file path (.md file).
- `source-traceability-expert`: success; target=Local file path (.md file); severity=high; findings=3; verdict=changes_requested; confidence=medium.
- `reread-budget-expert`: success; target=Local file path (.md file); severity=medium; findings=2.
- `boundary-note-expert`: success; target=Local file path (.md file); severity=low; findings=1; verdict=accept_with_follow_up; confidence=high.

## Coverage Gaps

- 1 entry lacks a structured rollup, so severity and verdict coverage is incomplete.
- 1 successful entry omits a decision summary, so downstream acceptance still needs caller-owned interpretation.
- 1 entry failed before a reusable rollup was published, so the bundle still needs targeted rereads.
- This digest does not resolve source handles, verify caller-owned source truth, or rank follow-up priority.

## Boundary

AIQL can summarize published batch-review artifacts into a compact source-handle bundle digest. The embedding workflow still owns packet assembly, source-handle resolution, source verification, approval thresholds, tracker context, and downstream routing.
