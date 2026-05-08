import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProviderCommand,
  runQualityReview,
  type QualityReviewCommandRunner,
} from "./provider-review.js";

describe("provider review", () => {
  it("builds Codex and Claude provider commands", () => {
    expect(
      buildProviderCommand(
        { provider: "codex", cwd: "/repo", command: "codex-test" },
        "gpt-5.2",
      ),
    ).toEqual({
      command: "codex-test",
      args: ["exec", "--cd", "/repo", "--model", "gpt-5.2", "-"],
    });
    expect(
      buildProviderCommand(
        { provider: "claude", command: "claude-test", extraArgs: ["--max-budget-usd", "1"] },
        "sonnet",
      ),
    ).toEqual({
      command: "claude-test",
      args: [
        "--print",
        "--permission-mode",
        "plan",
        "--model",
        "sonnet",
        "--max-budget-usd",
        "1",
      ],
    });
  });

  it("runs a Codex-style review through an injected command runner", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-provider-review-"));
    const outcomePath = path.join(tempDir, "outcome.md");
    await fs.writeFile(outcomePath, "Implemented the requested change and ran tests.");
    const calls: Array<{ command: string; args: string[]; input: string }> = [];
    const runCommand: QualityReviewCommandRunner = async (command, args, options) => {
      calls.push({ command, args, input: options.input });
      return {
        stdout: [
          "Looks good.",
          "```json",
          JSON.stringify({
            quality_review_decision: {
              schema: "quality_review_decision_v1",
              status: "passed",
              summary: "Outcome satisfies the criteria.",
              required_repairs: [],
            },
          }),
          "```",
        ].join("\n"),
        stderr: "",
      };
    };

    const result = await runQualityReview({
      subject: {
        kind: "workloop-slice",
        objective: "Check the slice outcome.",
        successCriteria: ["tests passed"],
        outcomePath,
      },
      provider: {
        provider: "codex",
        command: "codex-test",
        model: "gpt-review",
        cwd: tempDir,
      },
      runCommand,
    });

    expect(result.status).toBe("passed");
    expect(result.summary).toBe("Outcome satisfies the criteria.");
    expect(calls[0]).toMatchObject({
      command: "codex-test",
      args: ["exec", "--cd", tempDir, "--model", "gpt-review", "-"],
    });
    expect(calls[0]?.input).toContain("Implemented the requested change");
  });

  it("maps missing structured output to process_failed", async () => {
    const result = await runQualityReview({
      subject: {
        kind: "workloop-slice",
        objective: "Check the slice outcome.",
        successCriteria: ["tests passed"],
        content: "review me",
      },
      provider: { provider: "claude", command: "claude-test", cwd: process.cwd() },
      runCommand: async () => ({ stdout: "No structured decision here.", stderr: "" }),
    });

    expect(result.status).toBe("process_failed");
    expect(result.requiredRepairs).toContain("Rerun review with structured output enabled.");
  });
});
