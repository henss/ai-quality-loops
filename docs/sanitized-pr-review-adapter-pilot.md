# Sanitized PR Review Adapter Pilot

This pilot checks whether a pull-request review adapter can stay inside the existing AIQL public contracts without adding a package-owned work-item client, merge policy, or private repository context.

## Classification

Output classification: artifact.

## Scout Check

The required solution scout was run from the embedding workflow workspace:

```bash
pnpm solution:scout -- --category adapter --capability "sanitized PR review candidate handoff from structured review results" --boundary public
```

The scout returned `evaluate_registry_candidate`. The registry candidates did not fit this public AIQL slice:

- The work-item client candidate is useful only when a caller needs a service client behind its own adapter; this pilot performs no work-item reads or writes.
- `commander` is relevant to CLI parsing, but no new CLI surface is needed.
- `gray-matter` is relevant to Markdown frontmatter parsing, but the pilot uses JSON structured-review fixtures and deterministic YAML rendering.

No dependency was adopted. Local ownership is cheaper here because the pilot is only a contract fixture plus a renderer check over existing AIQL surfaces.

## Pilot Surface

The pilot uses:

- `examples/synthetic-pr-review-result.fixture.json` as a synthetic structured review result.
- The existing no-write candidate-handoff renderer.
- `examples/synthetic-pr-review-candidate-handoff.expected.yaml` as the expected downstream candidate packet.

The generated handoff contains only generic candidate findings, generic evidence labels, severity labels, and an explicit policy block stating that queue writes and prioritization remain caller-owned. Low-severity findings are omitted by default.

## Boundary

AIQL owns validation of the structured review-result shape and deterministic rendering of a sanitized candidate handoff. The embedding workflow owns pull-request selection, source retrieval, repository policy, merge authority, reviewer assignment, queue writes, priority, and any domain interpretation.

Do not move a PR adapter into AIQL if it needs real issue keys, repository names, branches, account names, file paths, hostnames, private policy, source freshness, reviewer identity, deployment status, or merge decisions.

## Generic Extraction Question

The extraction remains generic only while the adapter input is a caller-sanitized `StructuredReviewResult` and the output is a candidate handoff with no writes, no repository authority, and no private identifiers. If a future slice needs source retrieval, inline review placement, reviewer assignment, merge gating, or queue mutation, keep that logic in the embedding repo and pass only sanitized AIQL artifacts across the boundary.
