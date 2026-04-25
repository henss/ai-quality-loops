{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Packet contains traceability gaps due to missing evidence handles that prevent auditability before treating the artifact as defended.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Missing evidence handle for Claim 1",
        "summary": "Evidence label A lacks a usable evidence handle boundary, preventing traceability audit.",
        "key": "missing-evidence-handle"
      },
      {
        "severity": "medium",
        "title": "Opaque evidence handle for Claim 2",
        "summary": "Evidence handle for label B is opaque and requires caller-owned retrieval to verify.",
        "key": "opaque-evidence-handle"
      }
    ],
    "required_before_merge": [
      "Provide usable evidence handles for all claims to ensure traceability."
    ],
    "follow_up": [
      "Verify evidence handle boundaries are specific enough to audit without exposing private details."
    ],
    "next_step_actions": [
      "revise_artifact",
      "collect_more_evidence"
    ]
  }
}