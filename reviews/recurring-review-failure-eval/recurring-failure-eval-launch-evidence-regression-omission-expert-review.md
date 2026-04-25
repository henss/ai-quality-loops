{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Launch evidence note omits material comparison signals including added entries, severity regressions, and removed coverage.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Launch evidence regression omission",
        "summary": "Evidence note claims stability while omitting added review entry, severity regression, and removed coverage row.",
        "key": "launch-evidence-regression-omission"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "verify_comparison_signals_included"
    ],
    "next_step_actions": [
      "revise_artifact"
    ]
  }
}