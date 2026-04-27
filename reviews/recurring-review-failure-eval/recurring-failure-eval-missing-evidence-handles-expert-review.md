{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Packet cites evidence labels without usable handles, breaking traceability and auditability.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Missing evidence handle for traceability",
        "summary": "Evidence label A lacks a usable handle, preventing audit without exposing private details.",
        "key": "missing-evidence-handle"
      },
      {
        "severity": "low",
        "title": "Opaque evidence handle requires caller retrieval",
        "summary": "Evidence label B handle is opaque and requires caller-owned retrieval to verify.",
        "key": "opaque-evidence-handle"
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