# Domain Execution Outcome: Emit contradiction-and-coverage matrix artifacts from multi-review runs

## Summary

Output classification: code.

OPS-1590 is complete for this bounded session. The repo already contains the open-source-safe implementation requested by the packet: a stable contradiction-and-coverage matrix contract, renderer, CLI artifact writer, public synthetic fixture pair, schema export, and docs/examples describing the generic boundary.

No additional code edits were needed after inspection because the current surface already satisfies the packet's success criteria and validation passed against the live repo state.

## What changed

- Recorded this durable local outcome artifact at the packet-declared path.
- Confirmed the implementation surface:
  - `src/review/multi-review-contradiction-coverage-matrix.ts`
  - `src/contracts/multi-review-contradiction-coverage-matrix-contract.ts`
  - `schemas/multi-review-contradiction-coverage-matrix.schema.json`
  - `src/cli/batch-review-compare.ts`
  - `src/cli/batch-review-compare-artifacts.ts`
  - `examples/synthetic-multi-review-contradiction-coverage-matrix.expected.md`
  - `examples/synthetic-multi-review-contradiction-coverage-matrix.expected.json`
  - README and examples README references for `--matrix`, `--matrix-output`, and `--matrix-json-output`

## Why it mattered

The matrix artifact makes multi-review disagreement actionable without embedding caller-owned policy. It records overlap, missing baseline/candidate coverage, status changes, severity movement, and finding-count deltas over sanitized batch-summary comparison data while leaving reviewer weighting, escalation policy, acceptance thresholds, and tracker routing outside AIQL.

The generic-vs-domain-specific extraction boundary remains explicit: AIQL owns the artifact contract and renderer; embedding repos own domain semantics, routing, and approval decisions.

## Structured Outcome Data

```yaml
schema: domain_execution_outcome_v1
tracker_source: OPS-1590
output_classification: code
repo: ai-quality-loops
result: complete
validation:
  - command: pnpm check:agent-surface:preedit -- src/review/multi-review-contradiction-coverage-matrix.ts src/review/multi-review-contradiction-coverage-matrix.test.ts src/contracts/multi-review-contradiction-coverage-matrix-contract.ts src/cli/batch-review-compare-artifacts.ts src/cli/batch-review-compare.test.ts src/cli/batch-review-compare.ts
    result: passed
  - command: pnpm test -- src/review/multi-review-contradiction-coverage-matrix.test.ts src/cli/batch-review-compare.test.ts src/contracts/json-contracts.test.ts
    result: passed
    note: Vitest executed the full suite, 56 files and 287 tests, despite the targeted file arguments.
  - command: pnpm typecheck
    result: passed
  - command: pnpm exec tsx src/cli/batch-review-compare.ts examples/synthetic-multi-review-disagreement-before-summary.fixture.json examples/synthetic-multi-review-disagreement-after-summary.fixture.json --matrix-output %TEMP%/aiql-ops1590-proof/matrix.md --matrix-json-output %TEMP%/aiql-ops1590-proof/matrix.json
    result: passed
    evidence: Matrix files were written with non-truncated sizes, 2181 bytes for Markdown and 3015 bytes for JSON.
build_vs_buy:
  scout_command: pnpm solution:scout -- --category parser-renderer --capability "multi-review contradiction and coverage matrix artifact generation" --boundary public --project ai-quality-loops
  scout_result: recommendation run_bounded_search; one registry hit for ai-quality-loops; no live npm candidates; npm package source check failed with 400 Bad Request.
  adoption_decision: Keep repo-owned implementation because the artifact is a narrow AIQL-specific projection over existing batch-summary comparison contracts, with no suitable commodity dependency identified.
session_efficiency:
  waste_signal: The targeted Vitest command expanded to the full test suite, costing extra readout noise but still produced useful validation.
  cleanup_decision: No code cleanup was needed; the root cause appears to be command-shape/tooling behavior rather than product code in the OPS-1590 surface.
```

## Continuation Decision

Action: complete

The next useful follow-up is low urgency: if future sessions keep seeing targeted Vitest commands expand to the full suite, add or document a repo-local narrow test wrapper so validation output stays smaller and faster. That is separate from OPS-1590 because the matrix artifact surface itself is implemented and passing.
