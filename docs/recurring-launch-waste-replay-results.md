# Recurring Launch-Waste Replay Results

This note records the OPS-1593 replay readout over AIQL's public-safe recurring review-failure eval pack. The incidents are synthetic and sanitized; they preserve reusable launch-waste and review-process failure shapes without copying private packet contents, tracker context, repository names, command authority, approval policy, or organization-specific implementation details.

## Scope

- Originating tracker slice: `OPS-1593`
- Output classification: artifact
- Corpus: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json`
- Runnable manifest: `examples/synthetic-recurring-review-failure-eval.manifest.json`
- Actual local reviewer outputs: `reviews/recurring-review-failure-eval/json/`
- Harness: `evaluateRecurringReviewFailureHarness(...)`
- Validation scope: the shipped six-case synthetic pack, its manifest/context files, the checked-in local reviewer JSON outputs, and the deterministic harness report.

This replay intentionally expands the packet's 3-5 incident target to the already-reviewed six-case pack because the extra case is another sanitized launch-evidence failure in the same public-safe family. It does not claim full historical coverage, and it does not validate private packet assembly, tracker routing, command rerun authority, approval thresholds, or any live launch workflow.

## Build-vs-Buy Rationale

No new dependency, adapter, or framework was adopted. The work needed a small deterministic check over AIQL's existing structured review-result contract, plus checked-in synthetic fixtures. Existing package capabilities already provide the durable pieces: batch-review manifests, structured JSON review outputs, schema validation, and the focused `evaluateRecurringReviewFailureHarness(...)` helper.

A third-party eval framework would add dependency and integration cost without covering the key requirement: public-safe replay fixtures that preserve recurring failure shapes while avoiding private packet details. If this grows beyond fixture replay into scheduling, trace storage, model orchestration, or broader benchmark management, that should be scouted separately before adding package-like infrastructure.

## Replay Result

The local replay executed six sanitized cases successfully, then the deterministic harness judged whether the structured outputs included the expected finding keys, signal groups, next-step actions, and minimum severity.

Summary: 6 passed, 0 failed, 6 total.

| Case | Result | Replay readout |
| --- | --- | --- |
| Missing evidence handles | Caught | Found the expected missing-handle finding, traceability language, evidence-collection next step, and sufficient severity. |
| Stale deterministic inputs | Caught | Found the stale-input finding, drift language, evidence-collection and follow-up-tracking actions, and sufficient severity. |
| Repeated command noise | Caught | Found the command-noise finding, signal-preservation language, artifact-revision next step, and sufficient severity. |
| Verification wrapper mismatch | Caught | Found the wrapper-mismatch finding, command-mismatch language, rerun and caller-review actions, and sufficient severity. |
| Launch evidence regression omission | Caught | Found the regression-omission finding, omitted comparison-signal language, artifact-revision and evidence-collection actions, and sufficient severity. |
| Launch evidence gate overclaim | Caught | Found the gate-overclaim finding, missing-threshold evidence language, caller-review and evidence-collection actions, and sufficient severity. |

No overflag-only case was observed in this run. The reviewer sometimes assigned higher severity than the minimum bar, but those cases also contained the expected reusable failure finding and are treated as caught rather than overflagged.

## Why It Matters

The pack is useful as a local-first draft-review rehearsal for recurring launch-waste failures. After narrow prompt/rubric calibration, the local reviewer outputs satisfy the deterministic acceptance bar on all six sanitized cases without remote-provider dependence. This defends the replay pack as reusable AIQL support infrastructure, while leaving real packet selection, authority, and acceptance policy caller-owned.

## Generic-vs-Domain-Specific Extraction Question

The remaining question is whether AIQL should add a thin public-safe helper that loads a batch-run directory into the existing harness, or whether the real missing value is prompt tuning and caller-owned acceptance policy. Keep repo-specific packet assembly, command rerun authority, tracker routing, and approval thresholds outside AIQL unless another sanitized, reusable shape repeats.
