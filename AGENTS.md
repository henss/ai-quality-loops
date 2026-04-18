<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# AGENTS.md

This file is the repo-local agent entrypoint. It is generated from the shared portfolio guidance standard, with repo-specific instructions preserved in the local block below.

## Required Agent Behavior

- Before non-trivial implementation, read this file and `.codex/portfolio-guidance.md`.
- Prefer repo-local conventions and verification commands over generic assumptions.
- Before non-trivial code edits, run the agent-surface preedit check on candidate files; if a touched file is near-limit or structurally busy, extract a focused seam before adding feature weight.
- When a live refresh or `.runtime/current/` surface exists, use it before durable ledgers or historical session notes for current operational truth.
- Work on the current default/shared branch unless Stefan explicitly requests otherwise; do not create branches, worktrees, or PR-only flows in Stefan-owned repos.
- Treat dirty or untracked files outside the current task as active parallel work; do not delete, revert, format, normalize, or stage them unless explicitly authorized.
- Before adding non-trivial reusable tooling or package-like infrastructure, run the applicable build-vs-buy scout or record why the work is one-off or non-commodity.
- If a session changed repo files, run `pnpm verify:session` before stopping, or record the exact command and blocker if verification cannot pass safely.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->

Managed by the portfolio guidance sync. Do not edit outside the local block.
