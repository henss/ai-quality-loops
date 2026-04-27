{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Source audit claims traceability but leaves evidence paths unresolved, requiring evidence collection and caller review before reuse.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Source audit evidence path gap",
        "summary": "Evidence label B and C lack resolved paths, contradicting the claim that all paths are attached and ready.",
        "key": "source-audit-evidence-path-gap"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "request_caller_review"
    ],
    "follow_up": [
      "track_follow_up"
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "request_caller_review"
    ]
  }
}