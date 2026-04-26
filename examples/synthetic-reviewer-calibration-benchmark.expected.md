Reviewer calibration benchmark: 2 configuration(s), 6 withheld-gold case(s).
- [passed] synthetic-local-reviewer: 30/30 (100%), 6 passed, 0 failed.
- [failed] under-sensitive-reviewer: 25/30 (83%), 5 passed, 1 failed. Highlight: missed verification signal obscured by command noise.
  - noisy-verification-log: 0/5 missed verification signal obscured by command noise
    - expected verdict changes_requested, observed accept
    - expected severity at least medium, observed low
    - missing finding keys: verification-log-noise
    - missing signal groups: command noise | repeated command; verification signal
    - missing next-step actions: revise_artifact
