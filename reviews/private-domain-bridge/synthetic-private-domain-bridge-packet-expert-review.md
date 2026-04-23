{
  "review_decision": {
    "schema": "peer_review_decision_v1",
    "verdict": "accept_with_follow_up",
    "confidence": "high",
    "blocking": false,
    "max_severity": "low",
    "summary": "The synthetic bridge packet correctly enforces opaque handles and advisory semantics, but requires follow-up to ensure finding keys remain stable across runs.",
    "blocking_findings": [],
    "non_blocking_findings": [
      {
        "severity": "low",
        "title": "Finding key stability needs verification",
        "summary": "Evidence C notes a generic finding key is reuse-ready, but the caveat warns that not all findings are equally portable; follow-up should confirm key stability across runs.",
        "key": "finding-key-stability-check"
      },
      {
        "severity": "low",
        "title": "Caller-owned authority underspecified",
        "summary": "Evidence B indicates the caller-owned authority note is underspecified; follow-up should tighten the public-safe bridge packet template.",
        "key": "caller-authority-specification"
      }
    ],
    "required_before_merge": [],
    "follow_up": [
      "Verify that all reusable finding keys remain stable and generic across multiple bridge runs.",
      "Tighten the public-safe bridge packet template to better specify caller-owned authority boundaries."
    ],
    "next_step_actions": [
      "track_follow_up"
    ]
  }
}