{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "accept_with_follow_up",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "The synthetic temporal anomaly packet is a promising reusable lane for before/after review, but it needs stronger caveats around occupancy inference and automated action readiness.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Occupancy inference exceeds temporal evidence",
        "summary": "The packet moves from one generic shape change to a claim that a person entered the space, but the synthetic evidence only supports anomaly follow-up.",
        "key": "occupancy-inference-boundary"
      },
      {
        "severity": "medium",
        "title": "Automated action readiness is unsupported",
        "summary": "The packet proposes automated household action without a caller-owned gate, approval note, or stronger evidence boundary.",
        "key": "automated-action-boundary"
      },
      {
        "severity": "low",
        "title": "Temporal evidence labels stay reusable",
        "summary": "The frame labels and zone references remain generic enough for public-safe fixture maintenance and repeat comparison coverage.",
        "key": "temporal-evidence-traceability"
      }
    ],
    "required_before_merge": [],
    "follow_up": [
      "Keep the shared artifact focused on generic temporal anomaly follow-up instead of occupancy or identity conclusions.",
      "Retain explicit caller ownership for any downstream alerting, storage, or household action.",
      "Continue only if future temporal fixtures can stay apartment-agnostic and comparison-focused."
    ],
    "next_step_actions": [
      "collect_more_evidence",
      "track_follow_up"
    ]
  }
}
