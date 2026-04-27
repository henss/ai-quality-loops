# Synthetic Visual Section Stability Benchmark

## Purpose

The benchmark pins a public-safe page fixture and manifest so targeted vision
captures can be checked before spending local Ollama vision-review time. It is
not a visual design policy, browser-debugging harness, or private screenshot
adapter.

## Stable Target Expectations

- Every manifest `sections` entry must be a unique DOM id in
  `examples/synthetic-section-stability-layout.html`.
- Preview artifact names must preserve manifest order and include the stable
  section id, for example `section-1-stability-overview`.
- Section ids should remain generic and synthetic; do not encode customer,
  company, product, ticket, or private workflow names.
- The fixture should keep semantic containers (`section`, `article`, `aside`,
  or landmark roles) for section targets so discovery prefers them over
  incidental elements.
- Capture planning should produce one targeted capture per manifest section and
  preserve the requested order.

## Source And Dependency Audit

- Source material is limited to the repo-local synthetic HTML fixture and
  manifest; no private screenshots, customer data, or domain-specific packet
  details are part of the benchmark.
- The required scout check was run from `D:/workspace/llm-orchestrator` for
  category `visual-testing`, capability `synthetic section target stability
  benchmark`, boundary `public`, and project `ai-quality-loops`. It returned
  `build_local_with_recorded_rationale` with zero registry hits and zero live
  npm candidates, so this stays a local fixture-and-test benchmark rather than a
  new benchmark framework or dependency.
- The benchmark is intentionally prototype scoped: it exercises section
  discovery, manifest alignment, preview artifact naming, and capture planning
  order without invoking browser-debugging automation, UI fixes, private
  screenshots, or a vision model.

## How To Validate

Run the focused checks after changing the fixture, manifest, section discovery,
or capture planning:

```sh
pnpm exec vitest run src/review/vision-section-discovery.test.ts src/review/vision-capture-plan.test.ts src/review/vision-preview.test.ts
```

These tests defend the benchmark contract without invoking a vision model.
