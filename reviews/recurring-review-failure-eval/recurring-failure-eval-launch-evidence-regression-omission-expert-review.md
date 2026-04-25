{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "high",
    "summary": "The launch evidence note omits material comparison signals including a new high-severity finding, a severity regression, and a removed coverage row.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "high",
        "title": "Launch evidence note omits material comparison signals",
        "summary": "The evidence note claims no material regression while omitting an added high-severity finding, a severity regression from medium to high, and a removed coverage row.",
        "key": "launch-evidence-regression-omission"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "Ensure evidence notes explicitly list added, removed, and regressed signals before treating the artifact as defended."
    ],
    "next_step_actions": [
      "revise_artifact"
    ]
  }
}