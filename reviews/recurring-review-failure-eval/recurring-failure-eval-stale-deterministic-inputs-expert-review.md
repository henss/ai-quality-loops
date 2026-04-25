{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Packet contains stale deterministic inputs that invalidate confidence claims without refreshed evidence.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Stale deterministic inputs invalidate confidence claims",
        "summary": "Comparison baseline and command summary are older than the current packet, creating drift risk.",
        "key": "stale-deterministic-input"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence"
    ],
    "follow_up": [
      "Verify freshness markers align with current packet version before re-review."
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "revise_artifact"
    ]
  }
}