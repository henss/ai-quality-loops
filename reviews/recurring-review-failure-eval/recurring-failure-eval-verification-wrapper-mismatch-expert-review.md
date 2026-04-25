{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Verification wrapper mismatch detected between claimed command and cited evidence requires caller correction before artifact is defended.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Verification wrapper mismatch",
        "summary": "Wrapper claim cites pnpm verify:session but evidence shows pnpm test -- review-gate.test.ts, creating an audit gap.",
        "key": "verification-wrapper-mismatch"
      }
    ],
    "required_before_merge": [
      "verification-wrapper-mismatch"
    ],
    "follow_up": [
      "Caller must rerun or restate verification step to align wrapper claim with cited command."
    ],
    "next_step_actions": [
      "revise_artifact",
      "request_caller_review"
    ]
  }
}