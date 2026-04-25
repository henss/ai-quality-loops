{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "accept_with_follow_up",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "The caveat packet correctly flags synthetic evidence limitations but requires stronger visual hierarchy to prevent misinterpretation of directional claims as validated demand.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Visual hierarchy risks misinterpretation of synthetic claims",
        "summary": "The table format treats synthetic evidence and caveats with equal visual weight, potentially allowing readers to overlook the 'Known caveat' column when scanning for validation.",
        "key": "visual_hierarchy_caveat_weight"
      },
      {
        "severity": "medium",
        "title": "Missing explicit 'Not for Purchase' warning",
        "summary": "While the text describes limitations, a prominent header-level warning is needed to prevent stakeholders from treating this as a go/no-go signal for outreach or spend.",
        "key": "missing_purchase_warning"
      },
      {
        "severity": "low",
        "title": "Evidence labels lack traceability metadata",
        "summary": "Labels like 'Evidence A' are generic; adding a sanitized reference ID (e.g., 'Synth-Int-01') improves auditability without exposing private paths.",
        "key": "evidence_label_traceability"
      }
    ],
    "required_before_merge": [],
    "follow_up": [
      "Add a prominent header warning that this is synthetic evidence only.",
      "Increase visual contrast or color-coding for the 'Known caveat' column to ensure it is not skipped during review."
    ],
    "next_step_actions": [
      "track_follow_up"
    ]
  }
}