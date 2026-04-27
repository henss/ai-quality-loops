# Recurring Launch-Waste Replay Results

This note records the OPS-1593 replay readout over AIQL's public-safe recurring review-failure eval pack. The incidents are synthetic and sanitized; they preserve reusable launch-waste and review-process failure shapes without copying private packet contents, tracker context, repository names, command authority, approval policy, or organization-specific implementation details.

## Scope

- Originating tracker slice: `OPS-1593`
- Output classification: artifact
- Corpus: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json`
- Runnable manifest: `examples/synthetic-recurring-review-failure-eval.manifest.json`
- Actual local reviewer outputs: `reviews/recurring-review-failure-eval/json/`
- Harness: `evaluateRecurringReviewFailureHarness(...)`
- Validation scope: the shipped nine-case synthetic pack, its manifest/context files, the checked-in local reviewer JSON outputs, and the deterministic harness report.

This replay intentionally expands the packet's 3-5 incident target to the nine-case pack because the extra cases are sanitized launch-evidence and traceability failures in the same public-safe family. It does not claim full historical coverage, and it does not validate private packet assembly, tracker routing, command rerun authority, approval thresholds, or any live launch workflow.

## Build-vs-Buy Rationale

No new dependency, adapter, or framework was adopted. The work needed a small deterministic check over AIQL's existing structured review-result contract, plus checked-in synthetic fixtures. Existing package capabilities already provide the durable pieces: batch-review manifests, structured JSON review outputs, schema validation, and the focused `evaluateRecurringReviewFailureHarness(...)` helper.

A third-party eval framework would add dependency and integration cost without covering the key requirement: public-safe replay fixtures that preserve recurring failure shapes while avoiding private packet details. If this grows beyond fixture replay into scheduling, trace storage, model orchestration, or broader benchmark management, that should be scouted separately before adding package-like infrastructure.

Build-vs-buy check: `pnpm solution:scout -- --category eval --capability "replay sanitized historical launch-waste incidents as AI quality eval fixtures" --boundary public --project ai-quality-loops` was run from the owning orchestration repo on 2026-04-27. The scout recommended bounded search, but its registry hits were broad code-intelligence/context-retrieval candidates rather than an eval-fixture replay dependency allowed for this public AIQL boundary; the npm source check failed with no candidates. Decision: keep the local fixture harness and record this as a rejection of broad external infrastructure for this slice, not as a dependency adoption.

## Replay Result

The deterministic fixture replay covers nine sanitized cases, then the harness judges whether the structured outputs include the expected finding keys, signal groups, next-step actions, and minimum severity. Checked-in local reviewer outputs now cover all nine cases from the local Ollama-first replay run.

Deterministic fixture summary: 9 passed, 0 failed, 9 total.
Checked-in local reviewer-output summary: 7 passed, 2 failed, 9 total.

| Case | Result | Actual reviewer severity | Harness expectations satisfied |
| --- | --- | --- | --- |
| Missing evidence handles | Caught | medium | `missing-evidence-handle`; evidence/source-handle and missing/opaque/unresolved signals; `collect_more_evidence`; minimum medium severity. |
| Stale deterministic inputs | Caught | medium | `stale-deterministic-input`; stale/drift and deterministic-input/baseline signals; `collect_more_evidence`, `track_follow_up`; minimum medium severity. |
| Repeated command noise | Caught | medium | `command-noise-obscures-signal`; command-noise and verification-signal signals; `revise_artifact`; minimum medium severity. |
| Verification wrapper mismatch | Missed next-step action | high | The reviewer caught `verification-wrapper-mismatch`, wrapper and mismatch/different-command signals, `request_caller_review`, and high severity, but omitted the required `rerun_review` next-step action. |
| Launch evidence regression omission | Caught | high | `launch-evidence-regression-omission`; launch-evidence, added/removed/regressed, and omitted/stability-claim signals; `revise_artifact`, `collect_more_evidence`; minimum medium severity. |
| Launch evidence gate overclaim | Caught | high | `launch-evidence-gate-overclaim`; gate/threshold, missing/absent, and defended-readiness overclaim signals; `request_caller_review`, `collect_more_evidence`; minimum high severity. |
| Bundle truncation hides signals | Missed omission signal wording | high | The reviewer caught `bundle-truncation-hides-signals`, truncated-bundle and review-signal evidence, both required next-step actions, and severity, but did not use any of the expected hidden/omitted/missing wording. |
| Source-audit evidence-path gap | Caught | high | `source-audit-evidence-path-gap`; source-audit, evidence-path, and missing/unresolved signals; `collect_more_evidence`, `request_caller_review`; minimum medium severity. |
| Unclassified runtime stderr | Caught | medium | `unclassified-runtime-stderr`; runtime stderr plus expected/harmless/blocking interpretation signals; `rerun_review`, `request_caller_review`; minimum medium severity. |

No overflag-only case was observed in this run. The reviewer sometimes assigned higher severity than the minimum bar, but those cases also contained the expected reusable failure finding and are treated as caught or partial misses rather than overflagged.

## Evidence Map

- Manifest execution evidence: `reviews/recurring-review-failure-eval/batch-summary.json` records 9 succeeded and 0 failed reviewer entries with parsed decisions from the local reviewer run.
- Actual structured outputs: `reviews/recurring-review-failure-eval/json/` contains structured JSON results for the nine locally replayed manifest targets.
- Deterministic fixture evidence: `examples/synthetic-recurring-review-failure-eval-results.fixture.json` is a public-safe structured-results fixture that also passes the same harness.
- Corpus alignment evidence: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json` mirrors the TypeScript eval-case expectations and records the generic extraction boundary for each sanitized incident.
- Contract coverage: `src/contracts/recurring-review-failure-eval-public-fixtures.test.ts` now validates the public-safe manifest/fixture set and replays the checked-in local reviewer JSON outputs through `evaluateRecurringReviewFailureHarness(...)`.

## Why It Matters

The pack is useful as a local-first draft-review rehearsal for recurring launch-waste failures. The deterministic fixture proves the harness can recognize all nine sanitized failure shapes, while the checked-in local reviewer run exposes two concrete misses to tune or track before relying on the reviewer as a gate. This defends the replay pack as reusable AIQL support infrastructure, while leaving real packet selection, authority, and acceptance policy caller-owned.

## Generic-vs-Domain-Specific Extraction Question

The remaining question is whether AIQL should add a thin public-safe helper that loads a batch-run directory into the existing harness, or whether the real missing value is prompt tuning and caller-owned acceptance policy. The bundle-truncation, source-audit, and runtime-stderr additions are generic traceability cases only; keep repo-specific packet assembly, command rerun authority, tracker routing, and approval thresholds outside AIQL unless another sanitized, reusable shape repeats.
