{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "The artifact overclaims launch readiness without providing the required gate report or threshold evidence.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Launch evidence gate overclaim",
        "summary": "The artifact claims the launch is fully defended despite missing the caller-owned gate report and threshold budget required to justify that claim.",
        "key": "launch-evidence-gate-overclaim"
      }
    ],
    "required_before_merge": [
      "collect_more_evidence",
      "revise_artifact"
    ],
    "follow_up": [
      "request_caller_review"
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "revise_artifact",
      "request_caller_review"
    ]
  }
}