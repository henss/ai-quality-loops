{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Packet cites evidence labels without usable handles, breaking traceability and requiring artifact revision before reuse.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Missing evidence handle for traceability",
        "summary": "Claimed evidence label A lacks a usable evidence handle, preventing auditability without exposing private details.",
        "key": "missing-evidence-handle"
      },
      {
        "severity": "low",
        "title": "Opaque evidence handle requires caller retrieval",
        "summary": "Evidence label B cites an opaque handle that still requires caller-owned retrieval to verify.",
        "key": "opaque-evidence-handle"
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
      "track_follow_up"
    ]
  }
}