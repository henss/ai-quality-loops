# Domain Execution Outcome: Ai Quality Loops: compare structured review results across runs

Originating tracker: Linear issue `OPS-321`

## Summary
Implemented the bounded OPS-321 seam in `ai-quality-loops` by adding one reusable deterministic comparison helper for two published structured review-result artifacts. The new surface compares findings across runs, groups them by a stable normalized title-or-summary key, and reports severity movement together with added, removed, changed, and unchanged findings.

## What changed
- Added the reusable comparison helper in [src/review/review-result-comparison.ts](/D:/workspace/ai-quality-loops/src/review/review-result-comparison.ts) with stable key normalization, deterministic duplicate matching, and compact typed comparison output.
- Added focused coverage in [src/review/review-result-comparison.test.ts](/D:/workspace/ai-quality-loops/src/review/review-result-comparison.test.ts) for key normalization, cross-run change classification, and duplicate-title matching.
- Exported the helper from [src/index.ts](/D:/workspace/ai-quality-loops/src/index.ts) and documented the narrow usage in [README.md](/D:/workspace/ai-quality-loops/README.md).

## Why it mattered
The repo already published structured review-result artifacts, but downstream consumers still lacked a shared deterministic way to answer a simple regression question across repeated runs. This change turns that existing artifact into a reusable cross-run comparison surface without widening into repo-specific gate policy, scoring, or model-driven equivalence logic.

Low-impact reviewer note: this slice intentionally stays library-only. It does not add a compare CLI because the packet asked for one bounded reusable improvement, and the helper is the smaller generic seam.

## Validation
- `npm run typecheck`
- `npx vitest run src/review/review-result.test.ts src/review/review-result-comparison.test.ts`
- `npm test`
- `npm run build`
- `npm run check:agent-surface`

All five commands passed in `D:\workspace\ai-quality-loops`. `npm` emitted existing local config warnings about unknown env/user config keys, but they did not affect execution.

## Structured Outcome Data
```yaml
id: "outcome_OPS_321_ai_quality_loops_compare_structured_review_results_across_runs_c09204f53029"
projectId: "ai-quality-loops"
title: "Domain Execution Outcome: Ai Quality Loops: compare structured review results across runs"
trackerIssue: "OPS-321"
sourcePacketPath: "D:\\workspace\\llm-orchestrator\\.runtime\\agent-launches\\contracts\\ai-quality-loops\\OPS-321-ai-quality-loops-compare-structured-review-results-across-runs-c09204f53029.md"
lifecycleStatus: "completed"
summary: "Added a reusable structured review-result comparison helper that reports deterministic severity movement and added, removed, changed, and unchanged findings across two runs."
validationSummary: "npm run typecheck; npx vitest run src/review/review-result.test.ts src/review/review-result-comparison.test.ts; npm test; npm run build; npm run check:agent-surface"
whatChanged:
  - "Added a review-result comparison helper with stable normalized finding keys and deterministic duplicate matching."
  - "Added focused tests for key normalization, change classification, and duplicate-title grouping."
  - "Exported and documented the new helper at the package surface."
uncertainties:
  - "Explicit remaining generic-vs-domain-specific extraction question: if downstream consumers later need fuzzy matching for heavily rewritten findings, decide deliberately whether the shared open-source surface should grow beyond normalized text keys or keep semantic equivalence in embedding repos."
blockers: []
efficiency: "Session stayed efficient overall: reads stayed on the task packet, the structured review-result contract, one export file, and one prior outcome template. Waste signals were minor: one mistyped working directory caused a failed read and one extra verification pass was used to confirm the broader repo stayed green."
followUp: "If a concrete consumer needs machine-invocable comparison from the shell, add a thin compare CLI on top of this helper; otherwise the current library surface is the narrower reusable seam."
continuationDecision:
  action: "complete"
  nextStepOwner: "agent"
  summary: "The bounded cross-run comparison helper for structured review results is implemented, documented, and validated for OPS-321."
needsStefan:
  required: false
  summary: "No immediate approval gate was hit. The only remaining boundary question is whether any future fuzzy or semantic matching still belongs in the shared open-source layer."
```

## Continuation Decision
Action: complete

Reason:
- The bounded open-source-safe comparison helper, docs, and validation for OPS-321 are complete.
- No blocker remains inside the approved slice.

## Needs Stefan?
No.

The remaining extraction question is explicit rather than blocking: if a future consumer needs fuzzy matching for substantially rewritten findings, decide deliberately whether that still belongs in the shared open-source package or should stay in embedding-repo policy code.

## Efficiency
Session stayed efficient overall: reads were limited to the packet, the structured review-result contract, the current package export surface, and one prior outcome template. Visible waste signals were minor and bounded: one mistyped working directory caused a failed read, and the broader repo verification pass was intentionally kept after the targeted tests to defend the exported package surface.
