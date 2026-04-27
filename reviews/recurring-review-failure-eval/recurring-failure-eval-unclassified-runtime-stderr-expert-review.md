{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Review cannot proceed as the runtime stderr is unclassified and lacks interpretation, violating evidence completeness requirements.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Unclassified runtime stderr",
        "summary": "Runtime stderr was emitted but lacks interpretation of whether it is expected, harmless, or blocking.",
        "key": "unclassified-runtime-stderr"
      }
    ],
    "required_before_merge": [
      "interpret_stderr_classification",
      "update_verification_note"
    ],
    "follow_up": [
      "track_stderr_classification_policy"
    ],
    "next_step_actions": [
      "rerun_review",
      "request_caller_review"
    ]
  }
}