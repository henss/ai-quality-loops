import { spawnSync } from "node:child_process";

const privateRuntimePaths = [".runtime/orchestrator-outcomes"];

function listTrackedFiles(pathspec: string): string[] {
  const result = spawnSync("git", ["ls-files", "--", pathspec], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ls-files failed for ${pathspec}`);
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

const trackedPrivateFiles = privateRuntimePaths.flatMap(listTrackedFiles);

if (trackedPrivateFiles.length > 0) {
  console.error("Private orchestrator runtime files are tracked in Git:");
  for (const filePath of trackedPrivateFiles) {
    console.error(`- ${filePath}`);
  }
  console.error("");
  console.error("Remove them from the index with: git rm --cached -- .runtime/orchestrator-outcomes");
  process.exit(1);
}

console.log("No private orchestrator runtime files are tracked.");
