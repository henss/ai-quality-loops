{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Verification wrapper mismatch detected between claimed session check and cited test command requires artifact revision and caller review.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Verification wrapper mismatch",
        "summary": "Wrapper claim cites pnpm verify:session while cited command runs pnpm test -- review-gate.test.ts, creating an audit gap.",
        "key": "verification-wrapper-mismatch"
      }
    ],
    "required_before_merge": [
      "revise_artifact",
      "request_caller_review"
    ],
    "follow_up": [
      "track_follow_up"
    ],
    "next_step_actions": [
      "revise_artifact",
      "request_caller_review",
      "track_follow_up"
    ]
  }
}