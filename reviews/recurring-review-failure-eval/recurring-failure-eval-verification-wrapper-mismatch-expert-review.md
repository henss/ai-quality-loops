{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Verification wrapper mismatch detected between claimed command and cited evidence requires caller restatement before artifact is defended.",
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
      "rerun_verification_step",
      "restate_wrapper_claim"
    ],
    "follow_up": [
      "confirm_command_alignment"
    ],
    "next_step_actions": [
      "request_caller_review",
      "revise_artifact"
    ]
  }
}