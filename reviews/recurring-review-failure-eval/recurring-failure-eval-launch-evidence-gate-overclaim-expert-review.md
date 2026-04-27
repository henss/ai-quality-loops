{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Launch evidence overclaims defended readiness without a gate report or threshold budget, requiring evidence collection and caller review.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Launch evidence gate overclaim",
        "summary": "The artifact claims defended readiness without a gate report, threshold budget, or approval note to justify the claim.",
        "key": "launch-evidence-gate-overclaim"
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
      "request_caller_review",
      "track_follow_up"
    ]
  }
}