<!-- [MANAGED_BY_PORTFOLIO_GUIDANCE_SYNC] -->

# Portfolio Guidance

This file is a self-contained shared standard for agents working directly in this repo. Keep repo-specific additions in the local block so sync can refresh the managed guidance safely.

## Build vs Buy

Before adding reusable tooling, shared helpers, workflow automation, agent launch logic, eval/review loops, supply-chain tooling, context packaging, connector clients, parser/renderer frameworks, or package-like code, use the portfolio build-vs-buy scout or record why the work is genuinely one-off or non-commodity.

A useful rejection record names the candidate or package source checked, trust or license boundary, maintenance signal, integration cost, and why local ownership is cheaper or strategically necessary.

## Third-Party Adapters

When adopting a dependency likely to spread across production code, expose repo-owned names and types through a thin adapter/helper. Keep wrappers shallow: normalize input/output and translate stable failure shapes. Do not wrap tiny one-off utilities just to add ceremony.

## Coding Standard

Keep files small and single-purpose. Prefer explicit data shapes, boundary-local normalization, narrow helpers, and focused tests. If a touched file is already structurally busy, extract a clearer seam before adding feature weight.

## Verification

Run the narrowest repo-local command that defends the change. If verification cannot pass because of unrelated dirty state, existing failures, or missing external access, record the exact command and blocker.

<!-- [LOCAL_START] -->

<!-- [LOCAL_END] -->
