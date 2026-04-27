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
| `evidence-request` | Checks whether a reviewer abstains when the decisive evidence label is intentionally omitted. | `abstain_request_evidence`, `missing-evidence-label-c-summary` |
| `action-boundary` | Checks whether a reviewer rejects external-action readiness when approval, routing, and ownership evidence are missing. | `external-action-readiness-unsupported`, `caller-owned-authority-gap` |

## Running A Pack

Run the pack from the repository or from an embedding project that has `batch-review` on `PATH`:

```bash
batch-review ./examples/reviewer-contract-sample-packs/evidence-support-gap.manifest.json
```

The manifest writes Markdown and structured JSON under `./reviews/reviewer-contract-sample-packs/`. Validate the emitted structured JSON before comparing reviewer behavior:

```bash
node ./examples/reviewer-contract-starter-kit/validate-review-result.template.mjs ./reviews/reviewer-contract-sample-packs/json/evidence-support-gap.json
```

Repeat the same command pair with `evidence-request.manifest.json` and `action-boundary.manifest.json` to exercise all three contract cases.

## Interpreting Results

Treat the checked-in `*.expected.json` files as conformance fixtures, not exact model goldens. A reviewer implementation can pass while using different prose, additional findings, or different ordering when it preserves:

- the published structured review-result schema
- the pack verdict and safe next-step actions
- the stable generic finding keys or evidence-request keys named in the table above
- the generic evidence labels used by the packet
- sanitized provenance labels for privacy boundary and evidence basis
- caller-owned boundary language for policy, routing, approval, remediation, and external action

Actionable mismatches are usually one of four things: the emitted JSON does not validate, a stable key disappeared, a decision action changed the caller-owned next step, or the review output promoted the synthetic packet into a real-world action decision. Extra caveats, stricter severity, or more detailed evidence requests are acceptable when those minimum contract signals remain visible.

## Tooling Scope

These packs intentionally stay as checked-in Markdown and JSON fixtures plus repo-local contract tests. A workflow orchestrator, hosted scheduler, or new third-party validation dependency would add execution and retention surface without improving this narrow conformance target. Embedding repos that need CI budgets, routing, dashboards, retries, or tracker writes should own that wrapper outside `ai-quality-loops`.

## Conformance Boundary

The expected fixtures are not model goldens. They are public-safe contract examples that define the minimum shape and reviewer signals a compatible implementation should preserve. A different reviewer may use different prose, severity, additional findings, or evidence-request wording, but mismatches should be actionable when stable finding keys, evidence request keys, evidence labels, decision fields, provenance, or caller-owned boundary language disappear.

Keep real source names, raw records, issue keys, local paths, approval policy, severity budgets, routing, publication, and remediation decisions in the embedding repo.
