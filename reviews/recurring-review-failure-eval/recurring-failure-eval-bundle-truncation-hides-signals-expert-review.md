# Recurring Failure Eval - Bundle Truncation Hides Signals

Output classification: review

## Summary

The synthetic packet should not be treated as complete because the review bundle is visibly truncated while the wrapper claims all material findings are present.

```json
{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Bundle truncation hides a material review signal, so the wrapper needs missing evidence and a revised claim before reuse.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Bundle truncation hides material signals",
        "summary": "The truncated review bundle omitted a material finding while the wrapper treated the shortened packet as complete.",
        "key": "bundle-truncation-hides-signals"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "revise_artifact"
    ],
    "follow_up": [],
    "next_step_actions": [
      "collect_more_evidence",
      "revise_artifact"
    ]
  }
}
```
