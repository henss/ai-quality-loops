# Domain Execution Outcome: Ai Quality Loops: add a compare CLI for structured review result artifacts

Originating tracker: Linear issue `OPS-379`

## Summary
Implemented the bounded OPS-379 shell-facing slice in `ai-quality-loops`: the package now ships a generic `review-compare` CLI that reads two published structured review-result JSON artifacts, runs the existing comparison helper, and emits either a deterministic text summary or machine-readable JSON.

## What changed
- Added the reusable compare runner and formatter in [src/review/review-result-compare.ts](/D:/workspace/ai-quality-loops/src/review/review-result-compare.ts), including sanitized input labels so CLI output does not echo raw local filesystem paths.
- Added the CLI entrypoint in [src/cli/review-compare.ts](/D:/workspace/ai-quality-loops/src/cli/review-compare.ts), wired it into [package.json](/D:/workspace/ai-quality-loops/package.json) and [src/index.ts](/D:/workspace/ai-quality-loops/src/index.ts), and kept the surface narrow: exactly two artifacts in, comparison report out.
- Added focused coverage in [src/review/review-result-compare.test.ts](/D:/workspace/ai-quality-loops/src/review/review-result-compare.test.ts) and documented shell usage in [README.md](/D:/workspace/ai-quality-loops/README.md).
- Completed one bounded cleanup during the session: the new CLI now forces quiet dotenv bootstrap so `--json` output stays parseable instead of being prefixed by an environment injection banner.

## Why it mattered
Before this change, the repo exposed the reusable comparison helper but not the shell-first entrypoint that downstream command-heavy consumers actually need. `review-compare` makes the comparison seam executable without pushing wrappers to re-embed TypeScript glue or diff Markdown, while staying generic and open-source-safe by consuming only the published structured review-result contract.

Explicit generic-vs-domain-specific extraction question: if downstream consumers later want one command to compare more than two runs, infer baselines, or apply regression policy directly, decide deliberately whether that stays a generic open-source surface or should remain repo-local orchestration logic. This slice keeps the shared boundary at exactly two artifacts plus deterministic reporting.

## Validation
- `npm run build`
- `npm test -- src/review/review-result-compare.test.ts src/review/review-result-comparison.test.ts`
- `node dist/cli/review-compare.js <temp-before.json> <temp-after.json> --json`

All three checks passed in `D:\workspace\ai-quality-loops`. `npm` emitted existing local config warnings about unknown env/user config keys, but they did not affect execution. The CLI smoke run returned sanitized `pathLabel` values plus the expected improved-severity comparison payload.

## Structured Outcome Data
```yaml
id: "outcome_OPS_379_ai_quality_loops_add_a_compare_cli_for_structured_review_result_artifacts_1469b40162b0"
projectId: "ai-quality-loops"
title: "Domain Execution Outcome: Ai Quality Loops: add a compare CLI for structured review result artifacts"
trackerIssue: "OPS-379"
sourcePacketPath: "D:\\workspace\\llm-orchestrator\\.runtime\\agent-launches\\contracts\\ai-quality-loops\\OPS-379-ai-quality-loops-add-a-compare-cli-for-structured-review-result-artifacts-1469b40162b0.md"
lifecycleStatus: "completed"
summary: "Added a reusable review-result comparison runner and the review-compare CLI for deterministic text or JSON diffs across two structured review-result artifacts."
validationSummary: "npm run build; npm test -- src/review/review-result-compare.test.ts src/review/review-result-comparison.test.ts; node dist/cli/review-compare.js <temp-before.json> <temp-after.json> --json"
whatChanged:
  - "Added a reusable review-result compare module with artifact loading, sanitized input labels, and human-readable report formatting."
  - "Added the review-compare CLI and package export/bin wiring."
  - "Added focused tests, README guidance, and a quiet dotenv bootstrap fix so JSON output remains parseable."
uncertainties:
  - "Explicit remaining generic-vs-domain-specific extraction question: if consumers later need multi-run comparison, baseline inference, or policy-aware regression decisions, decide deliberately whether that belongs in the shared package or in repo-local orchestration."
blockers: []
efficiency: "Session stayed bounded overall: reads stayed on the packet, existing CLI seams, and one prior outcome template. Visible waste signals were one compile-fix loop for a wrong type import and one short dependency trace to suppress dotenv banner noise; the latter produced a concrete repo-local cleanup in the new CLI instead of being left as chat-only advice."
followUp: "Only widen the compare surface when a concrete consumer needs more than two explicit artifacts; keeping this command as a two-input deterministic diff preserves the narrower shared boundary."
continuationDecision:
  action: "complete"
  nextStepOwner: "agent"
  summary: "The bounded compare CLI, docs, and validation for OPS-379 are complete."
needsStefan:
  required: false
  summary: "No immediate approval gate was hit. The only explicit follow-up question is whether any future multi-run or policy-aware compare surface remains generic enough for the shared open-source boundary."
```

## Continuation Decision
Action: complete

Reason:
- The bounded open-source-safe implementation, docs, and validation for OPS-379 are complete.
- No blocker remains inside the approved slice.

## Needs Stefan?
No.

The remaining generic-vs-domain-specific extraction question is explicit rather than blocking: if a future consumer needs multi-run comparison or policy-aware regression decisions, decide deliberately whether that belongs in the shared package or should stay in repo-local orchestration.

## Efficiency
Session stayed efficient overall: reads were limited to the packet, the current CLI/comparison seams, and one prior outcome template. Visible waste signals were small and corrected in-session: one compile error from an incorrect type import and one short trace of the dotenv banner, which resulted in a bounded cleanup so `review-compare --json` stays machine-readable.
