# Vitest Diff-Table Snapshot Upstream Note

This is a local, open-source-safe repro candidate for a Vitest upstream discussion. It is not an upstream issue, patch, or package feature request.

## Scope

The candidate is about snapshot readability when a string snapshot contains table-shaped text and only one table cell changes. It intentionally uses generic labels and redacted placeholder values so the example can be reviewed without private workflow or company context.

## Minimal Repro

```typescript
import { describe, expect, it } from "vitest";

function renderDiffTable(): string {
  return [
    "| check | before | after |",
    "| --- | --- | --- |",
    "| visible label | pass | fail |",
    "| hidden query parameter | [redacted] | [redacted] |"
  ].join("\n");
}

describe("diff-table snapshot repro", () => {
  it("shows how a single table-cell change appears in Vitest snapshot output", () => {
    expect(renderDiffTable()).toMatchInlineSnapshot(`
      "| check | before | after |
      | --- | --- | --- |
      | visible label | pass | pass |
      | hidden query parameter | [redacted] | [redacted] |"
    `);
  });
});
```

## Local Evidence

Running the checked-in repro with the repo's current `vitest` dependency (`pnpm vitest run src/review/vitest-diff-table-repro.test.ts`, Vitest 1.6.1) captures the snapshot mismatch payload and confirms that the only material change is:

```text
- | visible label | pass | pass |
+ | visible label | pass | fail |
```

That is enough evidence to carry a minimal upstream-shaped note if maintainers want a small discussion example. It is not enough evidence to add an AIQL helper, formatter, snapshot serializer, or workflow automation.

The repro lives in `src/review/vitest-diff-table-repro.test.ts`. It runs a temporary failing Vitest fixture in a child process, then asserts only on the redacted diff lines needed for the upstream-shaped discussion without leaving the main suite in a misleading snapshot-failed state.

## Boundary Decision

Keep this as a local note unless the next step is explicitly authorized as public upstream work. The generic extraction question is whether table-shaped snapshot diff readability is a Vitest concern worth discussing upstream, rather than an AIQL package concern. If the need turns into project-specific reporting, expected table schemas, redaction rules, or policy routing, keep that work in the embedding repo instead of widening this package.
