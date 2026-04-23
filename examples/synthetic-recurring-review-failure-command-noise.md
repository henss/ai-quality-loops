# Synthetic Recurring Review Failure: Repeated Command Noise

This synthetic packet is analysis-only. It checks whether a reviewer notices when repeated command noise drowns out the actual verification signal.

## Packet Excerpt

```text
rg --files .
rg --files .
rg --files .
rg --files .
Verification note: one file read confirmed the active seam, but the packet keeps repeating the same discovery command.
rg --files .
rg --files .
```

## Expected Reviewer Posture

- Flag repeated command noise or log spam when it obscures the concise verification evidence.
- Prefer a repair that revises the artifact rather than expanding the noise.
- Prefer a stable generic finding key such as `command-noise-obscures-signal` if the issue is surfaced.
