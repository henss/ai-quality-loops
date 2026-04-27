# Recurring Review-Failure Eval Harness

This note defines the public-safe boundary for a small recurring review-failure eval harness. The goal is to rehearse repeated review-packet failure modes before another live packet run, without moving private repo state, tracker context, or domain routing into `ai-quality-loops`.

## Boundary

AIQL owns a narrow reusable harness:

- one checked-in synthetic batch-review manifest that exercises recurring review-packet failure modes
- one checked-in structured-result fixture pack for deterministic offline harness checks
- `evaluateRecurringReviewFailureHarness(...)` and `formatRecurringReviewFailureHarnessReport(...)` for checking whether structured review results surfaced the expected recurring failure signals

The embedding workflow still owns:

- target selection for real packets
- source retrieval, storage, and freshness checks
- command execution, verification authority, and rerun policy
- tracker routing, prioritization, approvals, and any real-world action

The checked-in sanitized regression corpus lives at `examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json`. It mirrors the reusable failure-mode expectations without copying any private packet content or tracker detail.

## Included Failure Modes

- missing evidence handles
- stale deterministic inputs
- repeated command noise that obscures the verification signal
- verification-wrapper mismatches
- launch-evidence notes that omit added, removed, or regressed comparison signals
- launch-evidence notes that imply threshold pass or defended readiness without gate evidence
- truncated review bundles that hide material review signals while the wrapper claims completeness
- source-audit notes with missing or unresolved sanitized evidence paths
- runtime stderr that is recorded without classifying whether it is expected, harmless, or blocking

These cases stay intentionally generic. They do not encode private repository names, tracker identifiers, company policy, or live operator context.

## Local Usage

Run the synthetic pack through the existing local-first review surface:

```bash
batch-review ./examples/synthetic-recurring-review-failure-eval.manifest.json --summary-output ./reviews/recurring-review-failure-eval/batch-summary.json
review-gate --batch-summary ./reviews/recurring-review-failure-eval/batch-summary.json --max-failed-reviews 0
```

If a caller has structured review-result JSON artifacts for each case, evaluate them with the harness:

```ts
import {
  RECURRING_REVIEW_FAILURE_EVAL_CASES,
  evaluateRecurringReviewFailureHarness,
  formatRecurringReviewFailureHarnessReport,
} from "ai-quality-loops";

const report = evaluateRecurringReviewFailureHarness({
  cases: RECURRING_REVIEW_FAILURE_EVAL_CASES,
  observedResults,
});

console.log(formatRecurringReviewFailureHarnessReport(report));
```

The harness stays intentionally narrow:

- it checks only the published structured review-result contract
- it evaluates finding keys, reusable signal groups, next-step actions, and minimum severity
- it does not add approval heuristics, scheduling policy, or tracker writes

Use the corpus fixture when a wrapper needs a human-readable list of the sanitized recurrent failure patterns, their packet targets, and the explicit extraction boundary without inferring that shape from the TypeScript cases alone.

## Generic-vs-Domain-Specific Extraction Question

The harness remains generic only while the eval cases stay synthetic or caller-sanitized and the pass/fail check reads only structured review-result artifacts. If a future slice needs repo-specific command policy, packet assembly rules, private tracker context, or domain-specific approval thresholds, keep that logic in the embedding repo instead of widening AIQL.

The current sanitized corpus intentionally stops at the reusable patterns already normalized into the public eval pack. Bundle truncation and source-audit evidence-path gaps are included only as generic traceability failures; if a future case depends on bundle-specific packet assembly, private evidence routing, or domain policy that does not survive sanitization cleanly, leave it outside AIQL until a generic public-safe shape repeats.
