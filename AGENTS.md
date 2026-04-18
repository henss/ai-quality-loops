<!-- [MANAGED_BY_LLM_ORCHESTRATOR_PORTFOLIO_GUIDANCE] -->

# AGENTS.md

This repo receives shared portfolio agent guidance from `D:\workspace\llm-orchestrator`.
Repo-local instructions still win when they are more specific.

## Required Agent Behavior

- Before non-trivial implementation, read this file and `.codex/portfolio-guidance.md`.
- Prefer repo-local conventions and verification commands over generic assumptions.
- Before adding reusable tooling, shared helpers, workflow automation, connector clients, parser/renderers, supply-chain tooling, context packaging, or package-like code, run or request the portfolio build-vs-buy scout from `llm-orchestrator`.
- When adopting a third-party dependency likely to spread, keep it behind a thin repo-owned adapter/helper or record why direct imports are lower risk.
- Keep edits small, typed, and easy for the next agent to find; split busy files before adding more feature weight.
- Run the narrowest relevant verification before finishing and record any unresolved blocker explicitly.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->

Generated from `D:\workspace\llm-orchestrator/templates/portfolio-guidance/AGENTS.md.tpl`.
