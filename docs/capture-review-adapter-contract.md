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

## Retry Evidence

Retry decisions should be explainable from the existing manifest and summary artifacts, not from a package-owned capture queue or private domain state. A caller-owned adapter can treat a retry as ready when it can point to all of the following public-safe evidence:

- the source `BatchReviewManifest` entry, identified by stable `name`, `index`, or generated `resultKey`
- the prior `batchReviewSummary` entry that triggered the retry, including `status`, sanitized `targetSummary`, and sanitized `errorSummary` when the prior run failed
- any available structured severity or finding-count rollup from `structuredReviewResult`, when the retry is meant to recheck a completed review rather than recover a failed run
- the retry selector used by the caller, such as "failed entries from prior summary" or "named entry requested by operator"
- confirmation that the target reference, output paths, capture labels, and context references remain generic or caller-sanitized before the retry reaches AIQL

Use `classifyCaptureReviewRetryEvidence(...)` when an adapter needs a deterministic readiness check over that evidence. The classifier reads only the existing `BatchReviewManifest` and `batchReviewSummary` shapes, plus explicit caller confirmations that the relevant target, output path, label, and context fields are generic. It reports `ready`, `incomplete`, or `rejected` without copying raw target paths or private capture semantics into the result.

The retry evidence does not need a new package contract when it is just a short caller-owned note beside the rerun command. For example, `batch-review ./manifest.json --rerun-summary ./reviews/batch-summary.json --rerun-failed` already keeps retry selection tied to the prior summary artifact. Embedding repos can add their own local note that records which summary entry caused the retry, while keeping raw screenshot bytes, private entity names, capture-retention decisions, thresholds, approval, and routing outside this package.

If the retry is for a visual capture adapter, the shared evidence should use generic labels such as `Capture 1`, `section-1 (overview)`, or the sanitized `targetSummary` emitted by AIQL. It should not include real room names, resident details, coordinates, private file paths, source URLs with query details, customer names, ticket identifiers, or company-specific workflow states.

Retry evidence is not sufficient to move adapter logic into AIQL when the selection depends on private capture scheduling, real-world prioritization, retention policy, ownership, or downstream action routing. In those cases, keep the retry planner in the embedding repo and pass only the resulting generic manifest entries to AIQL.

## Rejection Rules

Keep the adapter outside this package when the next step requires any of the following:

- domain-specific capture scheduling or selection rules
- raw image transport, image storage, or retention policy
- private labels, real-world entity facts, customer data, or other domain semantics in manifest fields
- domain-specific action routing from review findings
- a new public CLI or helper that mainly saves one embedding repo from writing local glue

The generic-vs-domain-specific extraction question is: can the adapter output be described as a checked-in `BatchReviewManifest` plus caller-owned redactions, with no private capture semantics in AIQL? If not, keep it in the embedding repo.

For retry work, the matching extraction question is: can the retry be justified only from a `BatchReviewManifest`, a prior `batchReviewSummary`, sanitized structured review rollups, and a generic retry selector? If not, the missing evidence is domain-specific and should stay in the embedding repo.
