{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Verification wrapper mismatch detected between claimed command and cited command requires artifact revision and caller review.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Verification wrapper mismatch",
        "summary": "Wrapper claim cites pnpm verify:session but cited command is pnpm test -- review-gate.test.ts, creating a verification gap.",
        "key": "verification-wrapper-mismatch"
      }
    ],
    "required_before_merge": [
      "revise_artifact",
      "collect_more_evidence"
    ],
    "follow_up": [
      "track_follow_up"
    ],
    "next_step_actions": [
      "revise_artifact",
      "collect_more_evidence",
      "rerun_review",
      "request_caller_review"
    ]
  }
}