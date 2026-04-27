# Recurring Launch-Waste Replay Results

This note records the OPS-1593 replay readout over AIQL's public-safe recurring review-failure eval pack. The incidents are synthetic and sanitized; they preserve reusable launch-waste and review-process failure shapes without copying private packet contents, tracker context, repository names, command authority, approval policy, or organization-specific implementation details.

## Scope

- Originating tracker slice: `OPS-1593`
- Output classification: artifact
- Corpus: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json`
- Runnable manifest: `examples/synthetic-recurring-review-failure-eval.manifest.json`
- Actual local reviewer outputs: `reviews/recurring-review-failure-eval/json/`
- Harness: `evaluateRecurringReviewFailureHarness(...)`
- Validation scope: the shipped eight-case synthetic pack, its manifest/context files, the checked-in local reviewer JSON outputs, and the deterministic harness report.

This replay intentionally expands the packet's 3-5 incident target to the eight-case pack because the extra cases are sanitized launch-evidence and traceability failures in the same public-safe family. It does not claim full historical coverage, and it does not validate private packet assembly, tracker routing, command rerun authority, approval thresholds, or any live launch workflow.

## Build-vs-Buy Rationale

No new dependency, adapter, or framework was adopted. The work needed a small deterministic check over AIQL's existing structured review-result contract, plus checked-in synthetic fixtures. Existing package capabilities already provide the durable pieces: batch-review manifests, structured JSON review outputs, schema validation, and the focused `evaluateRecurringReviewFailureHarness(...)` helper.

A third-party eval framework would add dependency and integration cost without covering the key requirement: public-safe replay fixtures that preserve recurring failure shapes while avoiding private packet details. If this grows beyond fixture replay into scheduling, trace storage, model orchestration, or broader benchmark management, that should be scouted separately before adding package-like infrastructure.

The solution-scout check was not run for this slice because no reusable tooling, adapter, workflow automation, package dependency, or framework was added. The replay stays as one corpus, one manifest, checked-in local outputs, and a deterministic contract test over the existing harness.

## Replay Result

The local replay covers eight sanitized cases, then the deterministic harness judges whether the structured outputs include the expected finding keys, signal groups, next-step actions, and minimum severity.

Summary: 8 passed, 0 failed, 8 total.

| Case | Result | Actual reviewer severity | Harness expectations satisfied |
| --- | --- | --- | --- |
| Missing evidence handles | Caught | medium | `missing-evidence-handle`; evidence/source-handle and missing/opaque/unresolved signals; `collect_more_evidence`; minimum medium severity. |
| Stale deterministic inputs | Caught | medium | `stale-deterministic-input`; stale/drift and deterministic-input/baseline signals; `collect_more_evidence`, `track_follow_up`; minimum medium severity. |
| Repeated command noise | Caught | medium | `command-noise-obscures-signal`; command-noise and verification-signal signals; `revise_artifact`; minimum medium severity. |
| Verification wrapper mismatch | Caught | high | `verification-wrapper-mismatch`; wrapper and mismatch/different-command signals; `rerun_review`, `request_caller_review`; minimum medium severity. |
| Launch evidence regression omission | Caught | high | `launch-evidence-regression-omission`; launch-evidence, added/removed/regressed, and omitted/stability-claim signals; `revise_artifact`, `collect_more_evidence`; minimum medium severity. |
| Launch evidence gate overclaim | Caught | high | `launch-evidence-gate-overclaim`; gate/threshold, missing/absent, and defended-readiness overclaim signals; `request_caller_review`, `collect_more_evidence`; minimum high severity. |
| Bundle truncation hides signals | Caught | medium | `bundle-truncation-hides-signals`; truncated-bundle, hidden/omitted, and review-signal signals; `collect_more_evidence`, `revise_artifact`; minimum medium severity. |
| Source-audit evidence-path gap | Caught | medium | `source-audit-evidence-path-gap`; source-audit, evidence-path, and missing/unresolved signals; `collect_more_evidence`, `request_caller_review`; minimum medium severity. |

No overflag-only case was observed in this run. The reviewer sometimes assigned higher severity than the minimum bar, but those cases also contained the expected reusable failure finding and are treated as caught rather than overflagged.

## Evidence Map

- Manifest execution evidence: `reviews/recurring-review-failure-eval/batch-summary.json` records 8 succeeded and 0 failed reviewer entries with parsed decisions.
- Actual structured outputs: `reviews/recurring-review-failure-eval/json/` contains one structured JSON result for each manifest review target.
- Deterministic fixture evidence: `examples/synthetic-recurring-review-failure-eval-results.fixture.json` is a public-safe structured-results fixture that also passes the same harness.
- Corpus alignment evidence: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json` mirrors the TypeScript eval-case expectations and records the generic extraction boundary for each sanitized incident.
- Contract coverage: `src/contracts/recurring-review-failure-eval-public-fixtures.test.ts` now validates the public-safe manifest/fixture set and replays the checked-in local reviewer JSON outputs through `evaluateRecurringReviewFailureHarness(...)`.

## Why It Matters

The pack is useful as a local-first draft-review rehearsal for recurring launch-waste failures. The checked-in outputs satisfy the deterministic acceptance bar on all eight sanitized cases without remote-provider dependence. This defends the replay pack as reusable AIQL support infrastructure, while leaving real packet selection, authority, and acceptance policy caller-owned.

## Generic-vs-Domain-Specific Extraction Question

The remaining question is whether AIQL should add a thin public-safe helper that loads a batch-run directory into the existing harness, or whether the real missing value is prompt tuning and caller-owned acceptance policy. The bundle-truncation and source-audit additions are generic traceability cases only; keep repo-specific packet assembly, command rerun authority, tracker routing, and approval thresholds outside AIQL unless another sanitized, reusable shape repeats.
