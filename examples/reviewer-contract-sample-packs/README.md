# Reviewer Contract Sample Packs

These packs give contributors a small conformance target for reviewer implementations that emit AI Quality Loops' structured review-result contract.

Each pack contains:

- a runnable `batch-review` manifest
- a synthetic review context
- a synthetic target packet
- an expected structured-result fixture that shows the contract shape and the minimum reviewer signal the pack is meant to exercise

## Packs

| Pack | Purpose | Expected reviewer signal |
| --- | --- | --- |
| `evidence-support-gap` | Checks whether a reviewer catches a broad claim that has only generic evidence labels. | `evidence-support-gap`, `caveat-preservation-gap` |
| `action-boundary` | Checks whether a reviewer rejects external-action readiness when approval, routing, and ownership evidence are missing. | `external-action-readiness-unsupported`, `caller-owned-authority-gap` |

## Running A Pack

```bash
batch-review ./examples/reviewer-contract-sample-packs/evidence-support-gap.manifest.json
```

Then validate the emitted structured JSON:

```bash
node ./examples/reviewer-contract-starter-kit/validate-review-result.template.mjs ./reviews/reviewer-contract-sample-packs/json/evidence-support-gap.json
```

## Conformance Boundary

The expected fixtures are not model goldens. They are public-safe contract examples that define the minimum shape and reviewer signals a compatible implementation should preserve. A different reviewer may use different prose, severity, or additional findings, but mismatches should be actionable when stable finding keys, evidence labels, decision fields, provenance, or caller-owned boundary language disappear.

Keep real source names, raw records, issue keys, local paths, approval policy, severity budgets, routing, publication, and remediation decisions in the embedding repo.
