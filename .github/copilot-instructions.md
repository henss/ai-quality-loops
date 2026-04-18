<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# GitHub Copilot Instructions

- Follow this repo's checked-in guidance and conventions. These instructions are intentionally self-contained for direct repo-started agents.
- Read `AGENTS.md` and `.codex/portfolio-guidance.md` before implementation.
- Prefer maintained third-party tools over new reusable local infrastructure when they fit the trust, license, and integration boundary.
- If a third-party dependency will be used across production code, contain it behind a thin repo-owned adapter/helper unless direct imports are explicitly lower risk.
- Keep generated or agent-created code small, typed, and verified with the narrowest relevant command.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->
