{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Bundle truncation hides material review signals and the wrapper claim incorrectly asserts completeness.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Bundle truncation hides material signals",
        "summary": "The review bundle is visibly truncated but the wrapper claims completeness, hiding a material finding that must be reread.",
        "key": "bundle-truncation-hides-signals"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "revise_artifact"
    ],
    "follow_up": [
      "track_follow_up"
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "revise_artifact",
      "track_follow_up"
    ]
  }
}