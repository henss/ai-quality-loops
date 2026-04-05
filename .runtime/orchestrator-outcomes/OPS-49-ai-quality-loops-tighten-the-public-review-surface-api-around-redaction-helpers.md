# OPS-49 Outcome

Source issue: Linear `OPS-49`

## What changed

- Tightened the exported redaction-helper boundary around `src/shared/review-surface.ts` by introducing `ReviewSurfaceRedactions`, a readonly bundle type for reusable redaction presets.
- Updated `defineReviewSurfaceRedactions(...)` to return an immutable bundle (`Object.freeze` on the array and each rule copy) so downstream repos can safely treat it as a stable package-edge contract instead of a mutable working array.
- Exported `ReviewSurfaceRedactions` from `src/index.ts` and threaded the readonly bundle type through the shared review and screenshot option types that accept `extraRedactions`.
- Added tests covering immutability and the public readonly bundle type, and updated the README to document the intended reusable boundary.

## Why

The package root already exposed `defineReviewSurfaceRedactions(...)`, but the public contract was still shaped like a mutable implementation detail. Making the reusable bundle explicit and readonly keeps the open-source surface narrow while giving downstream repos a clearer, safer boundary for project-local redaction rules.

## Validation

- `npm run typecheck`
- `npm test`

## Remaining uncertainty

- Generic-vs-domain-specific extraction question remains explicit: this repo now exposes a stable reusable bundle shape for redaction rules, but it still does not ship any preset project-specific rule collections. If downstream repos start needing shared preset composition helpers beyond `defineReviewSurfaceRedactions(...)`, that should be reviewed separately to avoid widening the public boundary ambiguously.

## Continuation state

- Status: complete
- Stop class: none
- Recommended next bounded step: if another downstream reuse case appears, evaluate whether a tiny composition helper for combining multiple readonly redaction bundles is still generic enough for the open-source boundary.

## Efficiency reflection

- Efficiency was acceptable. The main visible waste signal was brief rereading across `review-surface`, `review/shared`, and README to confirm the public boundary before changing types.
- Bounded cleanup completed in-session: normalized the reusable redaction contract into one exported readonly bundle type instead of leaving mutable-array assumptions scattered across public option shapes.
