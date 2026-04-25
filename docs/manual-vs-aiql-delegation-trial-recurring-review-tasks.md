# Manual vs AIQL Delegation Trial For Recurring Review Tasks

This note records a first-hand local-Ollama trial over AIQL's public-safe recurring review-failure rehearsal pack. The goal was not to add another framework. The goal was to see whether recurring review cleanup work can be delegated to the existing AIQL surface, or whether the sanitized cases still need a manual reviewer as the reliable baseline.

## Classification

Output classification: artifact.

## Scout Check

No solution scout run was needed for this slice. The work did not add reusable tooling, adapters, automation, dependencies, or shared infrastructure. Local ownership was cheaper because the deliverable is one bounded evidence readout over existing manifests, structured-result artifacts, and harness logic.

## Trial Setup

- Corpus baseline: `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json`
- Runnable pack: `examples/synthetic-recurring-review-failure-eval.manifest.json`
- Context: `examples/synthetic-recurring-review-failure-eval-context.json`
- Local reviewer: `qwen3.5:27b` through the existing `batch-review` expert path
- Shipped persona after this session's repair: `Evidence Reviewer`

The manual baseline in this trial is the checked regression corpus itself. A human can read the six sanitized cases and recover the intended finding keys, signal groups, next-step actions, and minimum severity directly from one small structured artifact. That is the standard the delegated AIQL run must meet if it is going to replace manual recurring-review triage on this seam.

## Execution Evidence

The live preflight now passes with the shipped prompt library:

```bash
pnpm exec tsx src/cli/review-preflight.ts --mode expert --expert "Evidence Reviewer" --context ./examples/synthetic-recurring-review-failure-eval-context.json --json
```

The live recurring batch run completed successfully:

```bash
pnpm exec tsx src/cli/batch-review.ts ./examples/synthetic-recurring-review-failure-eval.manifest.json --summary-output ./reviews/recurring-review-failure-eval/batch-summary.json
```

Observed batch summary:

- 6 reviews succeeded
- 0 review executions failed
- total wall-clock review time was 40,824 ms across the six cases
- per-case durations stayed in a narrow 6.3 s to 8.5 s band

Generated structured outputs live under `reviews/recurring-review-failure-eval/json/`.

## Delegation Trial Result

The execution layer passed, but the deterministic coverage layer did not.

Manual baseline:

- 6 of 6 cases have explicit expected failure semantics in the regression corpus
- each case includes the intended finding key, signal groups, next-step actions, and minimum severity
- a manual reviewer can recover the expected recurring-failure posture from one structured source without guessing

AIQL delegated run:

- 6 of 6 cases executed successfully with the local reviewer
- 3 of 6 cases passed the recurring-review-failure harness exactly
- 3 of 6 cases missed part of the expected reusable posture even though the review text was directionally correct

Case-level outcome:

| Case | Manual baseline | AIQL delegated result |
| --- | --- | --- |
| Missing evidence handles | expected key and next step are explicit | passed |
| Stale deterministic inputs | expected `track_follow_up` action is explicit | failed: missed `track_follow_up` |
| Repeated command noise | expected artifact-revision posture is explicit | passed |
| Verification wrapper mismatch | expected rerun plus caller-review boundary is explicit | failed: missed `rerun_review` |
| Launch evidence regression omission | expected omission/stability language and extra evidence step are explicit | failed: missed two signal groups and `collect_more_evidence` |
| Launch evidence gate overclaim | expected block posture and caller-review boundary are explicit | passed |

The practical conclusion is narrow:

- AIQL is already useful for first-pass recurring-review triage on this pack.
- AIQL is not yet reliable enough to replace the manual baseline for deterministic recurring-review failure coverage.
- The current fit is "delegate for draft findings, keep human acceptance on the harnessed cases," not "delegate and trust by default."

## Why This Matters

The local trial asked whether recurring review work should shift from manual synthesis to AIQL delegation. This trial says the answer is mixed in a useful way. AIQL can cheaply surface the major issue classes on all six sanitized cases with one local model and no remote-provider dependency, but it still drops some reusable next-step discipline and one omission-oriented wording pattern that the manual corpus expects. That makes it good at reducing reviewer setup work, not yet good enough to replace the deterministic acceptance bar.

The other meaningful result is operational: before this session, the advertised recurring-review pack was not actually runnable with the shipped prompt library because the `Evidence Reviewer` persona was missing. That repo-local mismatch is now repaired, so future trials can measure reviewer behavior instead of failing at setup.

## Recommended Next Step

Keep the current recurring-review-failure surface as a delegated draft-review tool, not as a no-human-required gate.

The next bounded useful step is one prompt-and-rubric tuning pass against the three failed cases only:

- stale deterministic inputs
- verification wrapper mismatch
- launch evidence regression omission

The value is high because the remaining misses are narrow and explicit. The downside of waiting is medium because every downstream recurring-review trial will otherwise keep paying manual cleanup on the same three reusable failure patterns.

## Generic Extraction Question

The remaining extraction question is whether repeated adopters need one thin public-safe helper that evaluates a live batch-run directory against `RECURRING_REVIEW_FAILURE_EVAL_CASES`, or whether the real remaining work is prompt tuning and caller-owned acceptance policy. If the missing value is only caller thresholds, reviewer routing, or downstream approval, keep that logic outside AIQL.
