<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# AGENTS.md

This file is the repo-local agent entrypoint. It is generated from the shared portfolio guidance standard, with repo-specific instructions preserved in the local block below.

## Required Agent Behavior

- Before non-trivial implementation, read this file and `.codex/portfolio-guidance.md`.
- Prefer repo-local conventions and verification commands over generic assumptions.
- Before adding reusable tooling, shared helpers, workflow automation, connector clients, parser/renderers, supply-chain tooling, context packaging, or package-like code, run the repo's build-vs-buy scout if present, or record the candidate evaluation and rejection reason in the change.
- When adopting a third-party dependency likely to spread, keep it behind a thin repo-owned adapter/helper or record why direct imports are lower risk.
- Keep edits small, typed, and easy for the next agent to find; split busy files before adding more feature weight.
- Run the narrowest relevant verification before finishing and record any unresolved blocker explicitly.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->

Managed by the portfolio guidance sync. Do not edit outside the local block.
