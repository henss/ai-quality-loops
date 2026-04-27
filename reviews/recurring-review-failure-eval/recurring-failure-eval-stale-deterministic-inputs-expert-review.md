{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Stale deterministic inputs and missing freshness tracking prevent treating the packet as current.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Stale deterministic inputs",
        "summary": "Comparison baseline and command summary are older than the current packet, risking drift and invalid confidence claims.",
        "key": "stale-deterministic-input"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "track_follow_up"
    ],
    "follow_up": [
      "Verify refreshed inputs match current packet state before next review cycle."
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "track_follow_up"
    ]
  }
}