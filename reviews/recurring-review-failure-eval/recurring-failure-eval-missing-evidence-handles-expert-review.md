{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Packet cites evidence labels without usable handles, breaking traceability and requiring artifact revision before live use.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Missing evidence handle for traceability",
        "summary": "Evidence label A lacks a usable handle, preventing auditability and violating traceability requirements.",
        "key": "missing-evidence-handle"
      },
      {
        "severity": "medium",
        "title": "Opaque evidence handle requires caller retrieval",
        "summary": "Evidence label B uses an opaque handle that still requires caller-owned retrieval to verify.",
        "key": "opaque-evidence-handle"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "collect_more_evidence"
    ],
    "next_step_actions": [
      "revise_artifact",
      "collect_more_evidence"
    ]
  }
}