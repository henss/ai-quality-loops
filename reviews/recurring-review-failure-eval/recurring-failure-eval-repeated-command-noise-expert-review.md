{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "changes_requested",
    "confidence": "high",
    "blocking": false,
    "max_severity": "medium",
    "summary": "Repeated command noise obscures verification signal and requires artifact revision before treating as defended.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "medium",
        "title": "Repeated command noise obscures verification signal",
        "summary": "Packet contains repeated command noise that drowns out the actual verification signal, requiring artifact revision.",
        "key": "command-noise-obscures-signal"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "track_follow_up"
    ],
    "next_step_actions": [
      "revise_artifact",
      "track_follow_up"
    ]
  }
}