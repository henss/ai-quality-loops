<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# Portfolio Guidance

This file is a self-contained shared standard for agents working directly in this repo. Keep repo-specific additions in the local block so sync can refresh the managed guidance safely.

## Catalog-Managed Rules

- Before non-trivial code edits, run the agent-surface preedit check on candidate files; if a touched file is near-limit or structurally busy, extract a focused seam before adding feature weight.
- When a live refresh or `.runtime/current/` surface exists, use it before durable ledgers or historical session notes for current operational truth.
- Work on the current default/shared branch unless Stefan explicitly requests otherwise; do not create branches, worktrees, or PR-only flows in Stefan-owned repos.
- Treat dirty or untracked files outside the current task as active parallel work; do not delete, revert, format, normalize, or stage them unless explicitly authorized.
- Before adding non-trivial reusable tooling or package-like infrastructure, run the applicable build-vs-buy scout or record why the work is one-off or non-commodity.
- If a session changed repo files, run `pnpm verify:session` before stopping, or record the exact command and blocker if verification cannot pass safely.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->
