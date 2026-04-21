import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function createDiffTableFixtureSource(): string {
  return [
    'import { describe, expect, it } from "vitest";',
    "",
    "function renderDiffTable(): string {",
    "  return [",
    '    "| check | before | after |",',
    '    "| --- | --- | --- |",',
    '    "| visible label | pass | fail |",',
    '    "| hidden query parameter | [redacted] | [redacted] |",',
    '  ].join("\\n");',
    "}",
    "",
    'describe("diff-table snapshot repro", () => {',
    '  it("shows how a single table-cell change appears in Vitest snapshot output", () => {',
    "    expect(renderDiffTable()).toMatchInlineSnapshot(`",
    '      "| check | before | after |',
    '| --- | --- | --- |',
    '| visible label | pass | pass |',
    '| hidden query parameter | [redacted] | [redacted] |"',
    "    `);",
    "  });",
    "});",
    "",
  ].join("\n");
}

describe("vitest diff-table snapshot repro", () => {
  let tempDir: string;
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(repoRoot, ".runtime-vitest-diff-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("captures the single-cell snapshot diff from a minimal fixture run", async () => {
    const fixturePath = path.join(tempDir, "vitest-diff-table-fixture.test.ts");
    await fs.writeFile(fixturePath, createDiffTableFixtureSource(), "utf8");

    const result = await execa(
      "pnpm",
      ["vitest", "run", fixturePath, "--reporter=verbose"],
      {
        cwd: repoRoot,
        reject: false,
        env: {
          FORCE_COLOR: "0",
          NO_COLOR: "1",
        },
      },
    );

    expect(result.exitCode).toBe(1);

    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain("- | visible label | pass | pass |");
    expect(output).toContain("+ | visible label | pass | fail |");
    expect(output).toContain(
      "Snapshot `diff-table snapshot repro > shows how a single table-cell change appears in Vitest snapshot output 1` mismatched",
    );
  });
});
