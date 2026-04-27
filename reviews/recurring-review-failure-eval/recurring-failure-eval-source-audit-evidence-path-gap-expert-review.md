# Recurring Failure Eval - Source Audit Evidence Path Gap

Output classification: review

## Summary

The synthetic packet overstates traceability because the source audit cites missing and unresolved evidence paths without a caller-owned retrieval note.

```json
{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "The source audit evidence path is missing or unresolved, so evidence collection and caller review are needed before reuse.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Source audit evidence path is unresolved",
        "summary": "The source audit says the evidence path is attached, but one source path is not provided and another remains unresolved.",
        "key": "source-audit-evidence-path-gap"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "request_caller_review"
    ],
    "follow_up": [],
    "next_step_actions": [
      "collect_more_evidence",
      "request_caller_review"
    ]
  }
}
```
