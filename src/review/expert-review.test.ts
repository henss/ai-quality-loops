import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLogger, setLogger, silentLogger } from "../shared/logger.js";

const generateTextWithOllama = vi.fn();

vi.mock("../shared/ollama.js", () => ({
  generateTextWithOllama,
}));

describe("runExpertReview", () => {
  let tempDir: string;
  const originalLogger = getLogger();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-expert-review-"));
    setLogger(silentLogger);
    generateTextWithOllama.mockReset();
  });

  afterEach(async () => {
    setLogger(originalLogger);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns a structured result and writes both markdown and json outputs", async () => {
    const { runExpertReview } = await import("./expert-review.js");

    await fs.writeFile(
      path.join(tempDir, "personas.md"),
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Review like a skeptic.",
      ].join("\n"),
    );
    await fs.writeFile(path.join(tempDir, "context.json"), JSON.stringify({ project: "demo" }));
    await fs.writeFile(path.join(tempDir, "draft.md"), "# Draft");

    generateTextWithOllama.mockResolvedValue([
      "# Summary",
      "The copy is usable, but one high-risk issue remains.",
      "",
      "## Findings",
      "- Missing warning state: High severity because destructive actions are not visually distinct.",
      "",
      "```json",
      JSON.stringify(
        {
          review_decision: {
            schema: "peer_review_decision_v1",
            verdict: "changes_requested",
            confidence: "high",
            blocking: true,
            max_severity: "high",
            summary: "The destructive action warning state must be fixed.",
            blocking_findings: [
              {
                title: "Missing warning state",
                summary: "Destructive actions are not visually distinct.",
                severity: "high",
              },
            ],
            non_blocking_findings: [],
            required_before_merge: ["Add a distinct destructive-action warning state."],
            follow_up: [],
          },
        },
        null,
        2,
      ),
      "```",
    ].join("\n"));

    const result = await runExpertReview({
      expert: "UI/UX",
      content: path.join(tempDir, "draft.md"),
      outputPath: path.join(tempDir, "reviews", "expert.md"),
      structuredOutputPath: path.join(tempDir, "reviews", "expert.json"),
      promptLibraryPath: path.join(tempDir, "personas.md"),
      contextPath: path.join(tempDir, "context.json"),
      resultFormat: "structured",
    });

    expect(result).toMatchObject({
      workflow: "expert",
      expert: "SKEPTICAL UI/UX CRITIC",
      summary: "The copy is usable, but one high-risk issue remains.",
      overallSeverity: "high",
      decision: expect.objectContaining({
        verdict: "changes_requested",
        blocking: true,
        max_severity: "high",
      }),
      provenance: [
        {
          label: "Content source",
          value: "Local file path (.md file)",
        },
      ],
      findings: [
        expect.objectContaining({
          title: "Missing warning state",
          severity: "high",
        }),
      ],
    });

    await expect(
      fs.readFile(path.join(tempDir, "reviews", "expert.md"), "utf-8"),
    ).resolves.toContain("Missing warning state");

    await expect(
      fs.readFile(path.join(tempDir, "reviews", "expert.json"), "utf-8"),
    ).resolves.toContain('"workflow": "expert"');
  });

  it("omits the generated review body from logger output", async () => {
    const { runExpertReview } = await import("./expert-review.js");
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    setLogger(logger);

    await fs.writeFile(
      path.join(tempDir, "personas.md"),
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Review like a skeptic.",
      ].join("\n"),
    );
    await fs.writeFile(path.join(tempDir, "draft.md"), "# Draft");

    generateTextWithOllama.mockResolvedValue(
      "# Summary\nDO_NOT_LOG_EXPERT_BODY\n\n## Findings\n- No issue.",
    );

    await runExpertReview({
      expert: "UI/UX",
      content: path.join(tempDir, "draft.md"),
      outputPath: path.join(tempDir, "reviews", "expert.md"),
      promptLibraryPath: path.join(tempDir, "personas.md"),
    });

    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining("DO_NOT_LOG_EXPERT_BODY"),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("markdown output omitted from console"),
    );
    await expect(
      fs.readFile(path.join(tempDir, "reviews", "expert.md"), "utf-8"),
    ).resolves.toContain("DO_NOT_LOG_EXPERT_BODY");
  });
});
