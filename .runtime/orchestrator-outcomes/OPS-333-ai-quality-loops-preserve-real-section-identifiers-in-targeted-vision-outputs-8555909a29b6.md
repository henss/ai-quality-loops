# Domain Execution Outcome: Ai Quality Loops: preserve real section identifiers in targeted vision outputs

Originating tracker: Linear issue `OPS-333`

## Summary
Implemented the bounded OPS-333 improvement inside `ai-quality-loops`: targeted `vision-review` runs now preserve prompt-safe real section identifiers in both the prompt material and structured provenance instead of collapsing everything to anonymous `section-N` counters.

## What changed
- Added one narrow reusable formatter in [src/review/vision-capture-plan.ts](/D:/workspace/ai-quality-loops/src/review/vision-capture-plan.ts) to express targeted capture references as stable pairs such as `section-1 (hero)`.
- Wired [src/review/vision-review.ts](/D:/workspace/ai-quality-loops/src/review/vision-review.ts) to use those paired references in task instructions and structured provenance, with existing `sanitizeReviewSurfaceValue(...)` and caller-provided `extraRedactions` still applied to the requested section ids.
- Extended [src/review/vision-capture-plan.test.ts](/D:/workspace/ai-quality-loops/src/review/vision-capture-plan.test.ts) and [src/review/vision-review.test.ts](/D:/workspace/ai-quality-loops/src/review/vision-review.test.ts) to prove the formatter output and the preserved targeted provenance, including a redacted section-id case.
- Documented the updated contract behavior in [README.md](/D:/workspace/ai-quality-loops/README.md).

## Why it mattered
Targeted vision capture had already become a real package flow through section discovery, preview, and review, but the structured review artifact still discarded the caller’s actual fragment intent. Preserving `section-N` together with the sanitized requested id makes downstream comparison, follow-up automation, and reviewer traceability more truthful without exposing raw private paths, URLs, or project-local identifiers.

## Validation
- `npm test -- vision-review vision-capture-plan vision-preview`
- `npm run typecheck`
- `npm run check:agent-surface`

All passed.

## Structured Outcome Data
```yaml
id: "outcome_OPS_333_ai_quality_loops_preserve_real_section_identifiers_in_targeted_vision_outputs_8555909a29b6"
projectId: "ai-quality-loops"
title: "Domain Execution Outcome: Ai Quality Loops: preserve real section identifiers in targeted vision outputs"
trackerIssue: "OPS-333"
sourcePacketPath: "D:\\workspace\\llm-orchestrator\\.runtime\\agent-launches\\contracts\\ai-quality-loops\\OPS-333-ai-quality-loops-preserve-real-section-identifiers-in-targeted-vision-outputs-8555909a29b6.md"
lifecycleStatus: "completed"
summary: "Targeted vision-review provenance now preserves stable capture labels together with sanitized requested section ids."
validationSummary: "npm test -- vision-review vision-capture-plan vision-preview; npm run typecheck; npm run check:agent-surface"
whatChanged:
  - "Added a reusable targeted-capture reference formatter."
  - "Updated vision-review prompt material and structured provenance to preserve sanitized real section ids."
  - "Added focused tests and README guidance for the preserved reference format."
uncertainties:
  - "If downstream automation later needs stronger machine routing than a paired descriptor string can provide, decide whether the shared structured contract should grow explicit captureLabel and requestedSectionId fields instead of only the current additive text descriptor."
blockers: []
efficiency: "Session stayed efficient: reads were limited to the packet, the vision review/capture seam, and the existing outcome conventions; there was no broad reread or repeated synthesis loop."
followUp: "Only widen the structured contract if a concrete downstream consumer needs separate machine fields; otherwise the current additive descriptor preserves traceability without expanding the public JSON shape."
continuationDecision:
  action: "complete"
  nextStepOwner: "agent"
  summary: "The bounded open-source-safe implementation, documentation, and validation are complete."
needsStefan:
  required: false
  summary: "No immediate approval gate was hit, but the future question of splitting paired descriptors into explicit machine fields should stay generic and open-source-safe."
```

## Continuation Decision
Action: complete

Reason:
- The bounded open-source-safe improvement is implemented, documented, and validated.
- No blocker required exposing private implementation detail or widening the public boundary ambiguously.

## Needs Stefan?
No.

The remaining generic-vs-domain-specific extraction question is explicit rather than blocking: if downstream consumers later need separate machine fields for capture label and requested section id, that contract decision should be made deliberately instead of inferred from the current additive descriptor string.

## Efficiency
Session stayed efficient: reads were limited to the task packet, the targeted vision capture/review seam, and the repo’s existing outcome conventions. No broad rereads, oversized file churn, or repeated manual synthesis loops were needed, so no extra repo-local cleanup was warranted.
