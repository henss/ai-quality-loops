# Reviewer Calibration Benchmark

This benchmark scores reviewer structured results against withheld gold judgments after the reviewer has handled prompt-only synthetic cases. It is local-first and provider-neutral: callers can generate results with any AIQL reviewer configuration, then pass the structured JSON results into the scorer.

## Boundary

AIQL owns the generic benchmark surface:

- six synthetic prompt-only calibration cases in `examples/synthetic-reviewer-calibration-benchmark.cases.json`
- matching withheld gold judgments in `examples/synthetic-reviewer-calibration-benchmark.gold.json`
- `evaluateReviewerCalibrationBenchmark(...)` for scoring reviewer configurations
- `formatReviewerCalibrationBenchmarkReport(...)` for concise baseline output

The caller owns model execution, source retrieval, privacy policy, tracker context, and any domain-specific decision that follows from the score.

## Local Usage

Give reviewers only the prompt-only cases. After they emit structured review-result JSON, score the results with the withheld gold judgments:

```ts
import {
  REVIEWER_CALIBRATION_BENCHMARK_CASES,
  REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
  evaluateReviewerCalibrationBenchmark,
  formatReviewerCalibrationBenchmarkReport,
} from "ai-quality-loops";

const report = evaluateReviewerCalibrationBenchmark({
  cases: REVIEWER_CALIBRATION_BENCHMARK_CASES,
  goldJudgments: REVIEWER_CALIBRATION_WITHHELD_GOLD_JUDGMENTS,
  observedRuns,
});

console.log(formatReviewerCalibrationBenchmarkReport(report));
```

Baseline output shape:

```text
Reviewer calibration benchmark: 2 configuration(s), 6 withheld-gold case(s).
- [passed] synthetic-local-reviewer: 30/30 (100%), 6 passed, 0 failed.
- [failed] under-sensitive-reviewer: 25/30 (83%), 5 passed, 1 failed. Highlight: missed verification signal obscured by command noise.
```

## Generic-vs-Domain-Specific Extraction Question

Keep future additions in AIQL only when the case can be expressed as a synthetic reviewer-contract failure mode and scored from structured review-result fields. If a calibration case depends on private packet assembly, tracker details, client-specific policy, or domain authority, keep that case in the embedding workflow and pass only sanitized structured results into AIQL.
