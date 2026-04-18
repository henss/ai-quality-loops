import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type BoundaryMarker = {
  pattern: RegExp;
  description: string;
};

const scannedPathPrefixes = ["docs/", "examples/", "README.md"];
const allowedFiles = new Set(["docs/vitest-diff-table-snapshot-upstream-note.md"]);

const internalMarkers: BoundaryMarker[] = [
  { pattern: /\bOPS-\d+\b/, description: "orchestrator issue key" },
  { pattern: /\bLinear\b/i, description: "tracker reference" },
  { pattern: /\bStefan\b/, description: "private operator reference" },
  { pattern: /\bSMARTSEER\b/, description: "company boundary reference" },
  { pattern: /\bllm-orchestrator\b/i, description: "control-plane repo reference" },
  { pattern: /\bcontrol[- ]plane\b/i, description: "control-plane workflow reference" }
];

function trackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git ls-files failed");
  }
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((filePath) => scannedPathPrefixes.some((prefix) => filePath === prefix || filePath.startsWith(prefix)))
    .filter((filePath) => !allowedFiles.has(filePath))
    .filter((filePath) => existsSync(filePath));
}

const violations = trackedFiles().flatMap((filePath) => {
  const content = readFileSync(filePath, "utf8");
  return internalMarkers
    .filter((marker) => marker.pattern.test(content))
    .map((marker) => ({ filePath, marker }));
});

if (violations.length > 0) {
  console.error("Public-facing tracked files contain internal control-plane markers:");
  for (const { filePath, marker } of violations) {
    console.error(`- ${filePath}: ${marker.description}`);
  }
  console.error("");
  console.error(
    "Move internal review packets, OPS fit decisions, tracker context, and operator-specific notes to llm-orchestrator ledgers instead of public docs/examples."
  );
  process.exit(1);
}

console.log("No internal control-plane markers found in public-facing tracked files.");
