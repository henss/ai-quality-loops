{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "The concept brief contains a critical readiness claim (Evidence D) that contradicts the synthetic support and violates the review boundary by implying launch readiness without approval.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Readiness claim exceeds synthetic support",
        "summary": "Evidence D asserts immediate launch readiness, which contradicts the provided synthetic support and violates the boundary against inferring execution readiness.",
        "key": "readiness_claim_exceeds_support"
      },
      {
        "severity": "medium",
        "title": "Missing caveats on synthetic evidence",
        "summary": "Evidence A and B lack explicit caveats regarding the non-representative nature of the synthetic interview notes and concept sketches.",
        "key": "missing_caveats_synthetic_evidence"
      },
      {
        "severity": "low",
        "title": "Generic evidence labels need traceability",
        "summary": "Evidence labels are generic but should ensure traceability without exposing private notes or project-specific identifiers.",
        "key": "evidence_labels_traceability"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "collect_more_evidence"
    ],
    "next_step_actions": [
      "revise_artifact"
    ]
  }
}