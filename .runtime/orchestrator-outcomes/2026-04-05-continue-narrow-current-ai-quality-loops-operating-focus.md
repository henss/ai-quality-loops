# Outcome: 2026-04-05 Continue Narrow current ai-quality-loops operating focus

## Summary

Implemented one bounded open-source-safe review-surface improvement: centralized review prompt assembly behind an internal `buildReviewEnvelope` utility in [`src/review/shared.ts`](/D:/workspace/ai-quality-loops/src/review/shared.ts).

Updated [`src/review/expert-review.ts`](/D:/workspace/ai-quality-loops/src/review/expert-review.ts) and [`src/review/vision-review.ts`](/D:/workspace/ai-quality-loops/src/review/vision-review.ts) to use the shared envelope builder while keeping modality-specific task instructions local to each review mode.

Added focused coverage in [`src/review/shared.test.ts`](/D:/workspace/ai-quality-loops/src/review/shared.test.ts) to defend the shared prompt structure.

This stayed internal to the review implementation and did not widen the package API.

## Why this change

The review surface had duplicated prompt assembly logic across expert and vision review. The duplication was still generic enough to consolidate without exposing domain-specific behavior or introducing framework-style abstractions.

The result is a narrow reusable utility that standardizes:

- persona prompt placement
- context serialization
- task section placement
- optional review payload sections
- output instruction tail

## Validation

Ran:

- `npm test`
- `npm run typecheck`

Result:

- passed

## Efficiency reflection

Observed inefficiency:

- review prompt framing was duplicated across two files, which increases maintenance cost and risks drift
- prompt assembly lived inline with execution logic, which made bounded review-surface changes more expensive than necessary
- local npm config warnings appeared during validation; they did not block the session but they are visible noise

Bounded cleanup completed in this session:

- extracted the duplicated prompt envelope assembly into one internal helper and covered it with a focused test

## Remaining uncertainty

Explicit generic-vs-domain-specific extraction question:

- Should screenshot/source metadata also move into a second shared helper, or should that remain modality-local to avoid prematurely defining a broader public or semi-public review prompt contract?

Current answer for this session:

- keep screenshot/source task wording modality-local until there is a second concrete reuse case beyond the current expert/vision envelope shape

## Continuation state

Status: complete for this bounded slice

Next safe step:

- evaluate whether review result formatting or logging has another similarly narrow internal duplication point that can be consolidated without surfacing private workflow assumptions

Stop classification:

- none
