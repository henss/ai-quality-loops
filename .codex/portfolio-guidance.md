<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# Portfolio Guidance

This file is a self-contained shared standard for agents working directly in this repo. Keep repo-specific additions in the local block so sync can refresh the managed guidance safely.

## Catalog-Managed Rules

- Keep files small and single-purpose. Prefer explicit data shapes, boundary-local normalization, narrow helpers, and focused tests. If a touched file is already structurally busy, extract a clearer seam before adding feature weight.
- Prefer repo-local current state, generated status, or live tool output before older notes or historical ledgers when deciding what is true now.
- Work on this repo's current default/shared branch unless local instructions explicitly request another flow; do not create branches, worktrees, or PR-only flows for routine work.
- Treat dirty or untracked files outside the current task as active parallel work; do not delete, revert, format, normalize, or stage them unless explicitly authorized.
- Before adding reusable tooling, shared helpers, workflow automation, connector clients, parser/renderers, supply-chain tooling, context packaging, or package-like code, check maintained third-party options or record why the work is one-off or local ownership is cheaper.
- Run the narrowest repo-local verification command that defends the change. If verification cannot pass because of unrelated dirty state, existing failures, or missing external access, record the exact command and blocker.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->
