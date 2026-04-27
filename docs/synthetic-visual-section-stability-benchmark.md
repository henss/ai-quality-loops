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
- The required scout check was run for a public eval capability. It recommended
  bounded search and surfaced no approved project-local candidate, so this
  remains a fixture-and-test benchmark rather than a new benchmark framework or
  third-party dependency.

## How To Validate

Run the focused checks after changing the fixture, manifest, section discovery,
or capture planning:

```sh
pnpm exec vitest run src/review/vision-section-discovery.test.ts src/review/vision-capture-plan.test.ts src/review/vision-preview.test.ts
```

These tests defend the benchmark contract without invoking a vision model.
