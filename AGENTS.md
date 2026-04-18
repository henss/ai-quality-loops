<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# AGENTS.md

This file is the repo-local agent entrypoint. It is generated from the shared portfolio guidance standard, with repo-specific instructions preserved in the local block below.

## Required Agent Behavior

- Before non-trivial implementation, read this file and `.codex/portfolio-guidance.md`.
- Prefer repo-local conventions and verification commands over generic assumptions.
- Before non-trivial code edits, use this repo's agent-surface or size guard when present; if a touched file is near-limit or structurally busy, extract a focused seam before adding feature weight.
- Prefer repo-local current state, generated status, or live tool output before older notes or historical ledgers when deciding what is true now.
- Work on this repo's current default/shared branch unless local instructions explicitly request another flow; do not create branches, worktrees, or PR-only flows for routine work.
- Treat dirty or untracked files outside the current task as active parallel work; do not delete, revert, format, normalize, or stage them unless explicitly authorized.
- Before adding non-trivial reusable tooling or package-like infrastructure, check maintained third-party options that fit this repo's trust, license, and integration boundary, or record why the work is one-off or local ownership is cheaper.
- Run the narrowest repo-local verification command that defends the change before stopping, or record the exact command and blocker if verification cannot pass safely.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->

Managed by the portfolio guidance sync. Do not edit outside the local block.
