{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "accept_with_follow_up",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "The synthetic packet correctly demonstrates the contract structure but contains a claim implying external action readiness without sufficient evidence.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Claim implies external action readiness without approval evidence",
        "summary": "Claim 3 states the note is ready for external action, but the caveat explicitly notes missing approval, release, or routing evidence, violating the requirement to flag such claims.",
        "key": "claim-external-action-readiness"
      },
      {
        "severity": "low",
        "title": "Evidence labels are synthetic and not real sources",
        "summary": "Evidence labels A, B, and C are explicitly synthetic and do not represent real sources, which is appropriate for this fixture but should be clearly understood as such.",
        "key": "evidence-labels-synthetic"
      }
    ],
    "required_before_merge": [],
    "follow_up": [
      "Ensure all claims implying external action readiness are flagged as unsupported when approval evidence is missing.",
      "Verify that all evidence labels are clearly marked as synthetic in production contexts."
    ]
  }
}