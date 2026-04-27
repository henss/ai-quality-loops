{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "Launch evidence note omits material comparison signals including added findings, severity regressions, and removed coverage.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Launch evidence regression omission",
        "summary": "Evidence note claims stability while omitting added high-severity findings, severity regressions, and removed coverage signals.",
        "key": "launch-evidence-regression-omission"
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
      "collect_more_evidence"
    ]
  }
}