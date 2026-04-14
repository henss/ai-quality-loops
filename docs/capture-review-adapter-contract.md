# Capture Review Adapter Contract

This contract defines how a caller-owned capture workflow can hand review work to AI Quality Loops without moving domain data, private labels, or capture policy into this package.

## Boundary

AIQL owns the generic review surface:

- validating and running a `BatchReviewManifest`
- reviewing a caller-provided `target` with `vision-review` or `batch-review`
- writing Markdown and structured review-result artifacts
- summarizing paths, URLs, capture labels, errors, and provenance before they appear in logs or review artifacts

The embedding adapter owns everything domain-specific:

- deciding what to capture and when
- collecting screenshots or exporting images
- mapping private domain entities to review targets
- storing, naming, retaining, or deleting raw captures
- interpreting findings as domain actions
- adding project-local redaction rules with `defineReviewSurfaceRedactions(...)`

AIQL must not own raw capture bytes as contract payloads, checked-in examples, or package artifacts. The adapter passes only generic target references, such as a caller-owned local image path, local HTML path, or URL already accepted by the current vision review flow; any runtime read of that target remains part of the caller-controlled review run.

## Adapter Output

An adapter should emit the existing `BatchReviewManifest` contract instead of a new package-specific wrapper shape. Each capture review entry should be a generic vision review entry:

```json
{
  "defaults": {
    "mode": "vision",
    "expert": "UI/UX",
    "outputDir": "./reviews/capture-review",
    "structuredOutputDir": "./reviews/capture-review/json"
  },
  "reviews": [
    {
      "name": "Capture 1",
      "target": "./artifacts/captures/capture-1.png"
    }
  ]
}
```

Adapter-provided `name`, `sections`, output paths, and context references should remain generic. For example, use stable capture counters, workflow-neutral labels, or UI section ids that are already safe to show in review artifacts. Do not encode private entity names, real-world facts, customer names, ticket names, or other domain semantics into manifest fields.

If a caller needs extra context, pass a caller-owned `contextPath` only when it is safe for a generic reviewer prompt. Keep private facts in the embedding repo and summarize them before they reach AIQL.

## Review Artifacts

Downstream automation should consume the published structured contracts:

- `structuredReviewResult` for individual review findings
- `batchReviewSummary` for manifest execution results
- `batchReviewSummaryComparison` for before/after review movement

These artifacts are allowed to contain generic review summaries, severity rollups, sanitized provenance descriptors, and artifact paths summarized by the existing review-surface helpers. They should not become a domain record or an inventory of private captured entities.

## Rejection Rules

Keep the adapter outside this package when the next step requires any of the following:

- domain-specific capture scheduling or selection rules
- raw image transport, image storage, or retention policy
- private labels, real-world entity facts, customer data, or other domain semantics in manifest fields
- domain-specific action routing from review findings
- a new public CLI or helper that mainly saves one embedding repo from writing local glue

The generic-vs-domain-specific extraction question is: can the adapter output be described as a checked-in `BatchReviewManifest` plus caller-owned redactions, with no private capture semantics in AIQL? If not, keep it in the embedding repo.
