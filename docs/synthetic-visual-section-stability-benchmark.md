# Synthetic Visual Section Stability Benchmark

## Purpose

The benchmark pins a public-safe page fixture and manifest so targeted vision
captures can be checked before spending local Ollama vision-review time. It is
not a visual design policy, browser-debugging harness, or private screenshot
adapter.

## Stable Target Expectations

- Every manifest `sections` entry must be a unique DOM id in
  `examples/synthetic-section-stability-layout.html`.
- Section ids should remain generic and synthetic; do not encode customer,
  company, product, ticket, or private workflow names.
- The fixture should keep semantic containers (`section`, `article`, `aside`,
  or landmark roles) for section targets so discovery prefers them over
  incidental elements.
- Capture planning should produce one targeted capture per manifest section and
  preserve the requested order.

## How To Validate

Run the focused checks after changing the fixture, manifest, section discovery,
or capture planning:

```sh
pnpm exec vitest run src/review/vision-section-discovery.test.ts src/review/vision-capture-plan.test.ts
```

These tests defend the benchmark contract without invoking a vision model.
