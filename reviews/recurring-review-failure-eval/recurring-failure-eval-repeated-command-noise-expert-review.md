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
        "summary": "Packet contains excessive repeated command noise that drowns out the actual verification evidence, reducing auditability.",
        "key": "command-noise-obscures-signal"
      }
    ],
    "required_before_merge": [
      "revise_artifact"
    ],
    "follow_up": [
      "Ensure verification notes are concise and distinct from command noise."
    ],
    "next_step_actions": [
      "revise_artifact"
    ]
  }
}