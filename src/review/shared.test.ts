import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  buildReviewEnvelope,
  loadReviewContent,
  loadReviewContext,
  prepareReviewEvidenceDescriptorItems,
  prepareReviewInputMaterialSections,
  prepareReviewMetadataItems,
  prepareReviewMaterialSections,
  resolvePromptLibraryPath,
  sanitizeReviewContext,
  summarizeReviewInputReference,
  summarizeReviewOutputReference,
  summarizeReviewPathReference,
  writeReviewOutput,
} from "./shared.js";
import {
  formatPersonaCatalog,
  getPersonaCatalog,
  listPersonaNames,
  loadPersonaPrompt,
  resolvePersonaName,
} from "./persona-catalog.js";

describe("Review shared utilities", () => {
  let tempDir: string;
  const previousPromptLibraryPath = process.env.PROMPT_LIBRARY_PATH;
  const previousContextPath = process.env.CONTEXT_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aiql-review-test-"));
    delete process.env.PROMPT_LIBRARY_PATH;
    delete process.env.CONTEXT_PATH;
  });

  afterEach(async () => {
    if (previousPromptLibraryPath === undefined) {
      delete process.env.PROMPT_LIBRARY_PATH;
    } else {
      process.env.PROMPT_LIBRARY_PATH = previousPromptLibraryPath;
    }

    if (previousContextPath === undefined) {
      delete process.env.CONTEXT_PATH;
    } else {
      process.env.CONTEXT_PATH = previousContextPath;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("resolves built-in expert aliases before prompt lookup", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Critical review prompt",
      ].join("\n"),
    );

    const result = await loadPersonaPrompt({
      expert: "UI/UX",
      promptLibraryPath,
    });

    expect(result.personaName).toBe("SKEPTICAL UI/UX CRITIC");
    expect(result.personaPrompt).toContain("Critical review prompt");
  });

  it("prefers a cwd personas.md file when no explicit path is provided", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      [
        "### LLM COMMITTEE PERSONA: 2. CUSTOM REVIEWER",
        "Custom reviewer prompt",
      ].join("\n"),
    );

    expect(resolvePromptLibraryPath(undefined, tempDir)).toBe(promptLibraryPath);

    const result = await loadPersonaPrompt({
      expert: "CUSTOM REVIEWER",
      promptLibraryPath: promptLibraryPath,
    });

    expect(result.promptLibraryPath).toBe(promptLibraryPath);
  });

  it("loads context from disk and falls back to an empty object when missing", async () => {
    const contextPath = path.join(tempDir, "context.json");
    await fs.writeFile(contextPath, JSON.stringify({ project: "demo" }));

    await expect(loadReviewContext(contextPath, tempDir)).resolves.toEqual({
      project: "demo",
    });
    await expect(
      loadReviewContext(path.join(tempDir, "missing.json"), tempDir),
    ).resolves.toEqual({});
  });

  it("loads review content from a relative file path and otherwise preserves raw text", async () => {
    const contentPath = path.join(tempDir, "draft.md");
    await fs.writeFile(contentPath, "# Review me");

    await expect(loadReviewContent("draft.md", tempDir)).resolves.toBe(
      "# Review me",
    );
    await expect(loadReviewContent("inline review text", tempDir)).resolves.toBe(
      "inline review text",
    );
  });

  it("summarizes review input references without exposing raw file paths", async () => {
    const contentPath = path.join(tempDir, "draft.md");
    await fs.writeFile(contentPath, "# Review me");

    await expect(summarizeReviewInputReference("draft.md", tempDir)).resolves.toBe(
      "Local file path (.md file)",
    );
    await expect(
      summarizeReviewInputReference("inline review text", tempDir),
    ).resolves.toBe("Inline content");
  });

  it("summarizes review output references without exposing raw file paths", () => {
    expect(
      summarizeReviewOutputReference("reviews/output.md", tempDir),
    ).toBe("Local file path (.md file)");
  });

  it("lists persona names from markdown headers without duplicates", () => {
    expect(
      listPersonaNames(
        [
          "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
          "Prompt A",
          "## REPOSITORY & AI EFFICIENCY SPECIALIST",
          "Prompt B",
          "### LLM COMMITTEE PERSONA: 3. SKEPTICAL UI/UX CRITIC",
          "Prompt C",
        ].join("\n"),
      ),
    ).toEqual([
      "SKEPTICAL UI/UX CRITIC",
      "REPOSITORY & AI EFFICIENCY SPECIALIST",
    ]);
  });

  it("builds a persona catalog with aliases grouped by resolved persona", async () => {
    const promptLibraryPath = path.join(tempDir, "personas.md");
    await fs.writeFile(
      promptLibraryPath,
      [
        "### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC",
        "Critical review prompt",
        "",
        "### LLM COMMITTEE PERSONA: 2. CUSTOM REVIEWER",
        "Custom review prompt",
      ].join("\n"),
    );

    await expect(
      getPersonaCatalog({
        promptLibraryPath,
        expertMap: {
          Reviewer: "CUSTOM REVIEWER",
          Missing: "NOT IN LIBRARY",
        },
      }),
    ).resolves.toEqual({
      promptLibraryPath,
      personas: [
        {
          personaName: "SKEPTICAL UI/UX CRITIC",
          aliases: ["UI/UX"],
        },
        {
          personaName: "CUSTOM REVIEWER",
          aliases: ["Reviewer"],
        },
      ],
      aliases: [
        {
          alias: "UI/UX",
          personaName: "SKEPTICAL UI/UX CRITIC",
          source: "built-in",
        },
        {
          alias: "Reviewer",
          personaName: "CUSTOM REVIEWER",
          source: "custom",
        },
      ],
      unmatchedAliases: [
        {
          alias: "Efficiency",
          personaName: "REPOSITORY & AI EFFICIENCY SPECIALIST",
          source: "built-in",
        },
        {
          alias: "Missing",
          personaName: "NOT IN LIBRARY",
          source: "custom",
        },
      ],
    });
  });

  it("formats persona catalogs with alias and mismatch summaries", () => {
    expect(
      formatPersonaCatalog({
        promptLibraryPath: path.join(tempDir, "personas.md"),
        personas: [
          {
            personaName: "SKEPTICAL UI/UX CRITIC",
            aliases: ["UI/UX"],
          },
          {
            personaName: "CUSTOM REVIEWER",
            aliases: [],
          },
        ],
        aliases: [],
        unmatchedAliases: [
          {
            alias: "Efficiency",
            personaName: "REPOSITORY & AI EFFICIENCY SPECIALIST",
            source: "built-in",
          },
        ],
      }),
    ).toBe(
      [
        "Available personas from personas.md:",
        "- SKEPTICAL UI/UX CRITIC (aliases: UI/UX)",
        "- CUSTOM REVIEWER",
        "",
        "Aliases without a matching persona in this library:",
        "- Efficiency -> REPOSITORY & AI EFFICIENCY SPECIALIST [built-in]",
      ].join("\n"),
    );
  });

  it("summarizes review path references through one shared prompt-safe helper", () => {
    expect(
      summarizeReviewPathReference("reviews/output.md", {
        cwd: tempDir,
      }),
    ).toBe("Local file path (.md file)");
  });

  it("writes review output to nested paths using the current working directory", async () => {
    const writtenPath = await writeReviewOutput(
      "reviews/output.md",
      "hello",
      tempDir,
    );

    expect(writtenPath).toBe(path.join(tempDir, "reviews", "output.md"));
    await expect(fs.readFile(writtenPath, "utf-8")).resolves.toBe("hello");
  });

  it("allows explicit expert maps to override alias resolution", () => {
    expect(
      resolvePersonaName("Reviewer", {
        Reviewer: "MY CUSTOM REVIEWER",
      }),
    ).toBe("MY CUSTOM REVIEWER");
  });

  it("builds a reusable review envelope with generic sections", () => {
    const prompt = buildReviewEnvelope({
      personaPrompt: "You are a careful reviewer.",
      context: { project: "demo", apiToken: "super-secret" },
      taskInstructions: "Inspect the supplied material.",
      sections: [
        {
          heading: "CONTENT TO REVIEW",
          body: "example payload",
          fenced: true,
        },
        {
          heading: "EVIDENCE",
          body: "image_01.png",
        },
      ],
    });

    expect(prompt).toContain("You are a careful reviewer.");
    expect(prompt).toContain("## CONTEXT");
    expect(prompt).toContain("\"project\": \"demo\"");
    expect(prompt).toContain("\"apiToken\": \"[REDACTED]\"");
    expect(prompt).toContain("## TASK\nInspect the supplied material.");
    expect(prompt).toContain("## CONTENT TO REVIEW\n---\nexample payload\n---");
    expect(prompt).toContain("## EVIDENCE\nimage_01.png");
    expect(prompt.endsWith("Provide your critical feedback in Markdown.")).toBe(
      true,
    );
  });

  it("prepares reusable review material sections from mixed bodies and item lists", () => {
    const sections = prepareReviewMaterialSections([
      {
        heading: "CONTENT TO REVIEW",
        body: "example payload",
        fenced: true,
      },
      {
        heading: "REVIEW INPUT MATERIAL",
        items: ["Source: https://example.com", undefined, "Attached image count: 2"],
      },
      {
        heading: "EMPTY",
      },
    ]);

    expect(sections).toEqual([
      {
        heading: "CONTENT TO REVIEW",
        body: "example payload",
        fenced: true,
      },
      {
        heading: "REVIEW INPUT MATERIAL",
        body: "- Source: https://example.com\n- Attached image count: 2",
        fenced: undefined,
      },
    ]);
  });

  it("prepares sanitized review metadata items for prompt-safe provenance", () => {
    expect(
      prepareReviewMetadataItems([
        {
          label: "Source",
          value: "https://example.com/private/reports?token=secret#hero",
        },
        {
          label: "Image count",
          value: 2,
          sanitizeValue: false,
        },
        {
          label: "Skipped",
          value: undefined,
        },
      ]),
    ).toEqual([
      "Source: Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
      "Image count: 2",
    ]);
  });

  it("applies extra redactions to review metadata items", () => {
    expect(
      prepareReviewMetadataItems(
        [
          {
            label: "Policy",
            value: "policy-alpha-42",
          },
        ],
        {
          extraRedactions: [
            {
              pattern: /\bpolicy-alpha-\d+\b/g,
              replacement: "[Policy identifier redacted]",
            },
          ],
        },
      ),
    ).toEqual(["Policy: [Policy identifier redacted]"]);
  });

  it("prepares review evidence descriptors from raw surfaces or pre-summarized values", () => {
    expect(
      prepareReviewEvidenceDescriptorItems([
        {
          label: "Source",
          value: "https://example.com/private/reports?token=secret#hero",
        },
        {
          label: "Content source",
          descriptor: "Inline content",
        },
        {
          label: "Skipped",
          value: undefined,
        },
      ]),
    ).toEqual([
      "Source: Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
      "Content source: Inline content",
    ]);
  });

  it("applies extra redactions to review evidence descriptors", () => {
    expect(
      prepareReviewEvidenceDescriptorItems(
        [
          {
            label: "Structured identifier",
            value: "policy/policy-alpha-42",
          },
        ],
        {
          extraRedactions: [
            {
              pattern: /\bpolicy-alpha-\d+\b/g,
              replacement: "[Policy identifier redacted]",
            },
          ],
        },
      ),
    ).toEqual([
      "Structured identifier: policy/[Policy identifier redacted]",
    ]);
  });

  it("builds one reusable prompt-safe review input material section", () => {
    expect(
      prepareReviewInputMaterialSections({
        evidenceDescriptors: [
          {
            label: "Source",
            value: "https://example.com/private/reports?token=secret#hero",
          },
        ],
        metadataItems: [
          {
            label: "Attached image count",
            value: 2,
            sanitizeValue: false,
          },
          {
            label: "Policy",
            value: "policy-alpha-42",
          },
        ],
        extraRedactions: [
          {
            pattern: /\bpolicy-alpha-\d+\b/g,
            replacement: "[Policy identifier redacted]",
          },
        ],
      }),
    ).toEqual([
      {
        heading: "REVIEW INPUT MATERIAL",
        body: [
          "- Source: Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
          "- Attached image count: 2",
          "- Policy: [Policy identifier redacted]",
        ].join("\n"),
        fenced: undefined,
      },
    ]);
  });

  it("sanitizes review context by redacting sensitive keys and trimming oversized values", () => {
    const sanitized = sanitizeReviewContext({
      project: "demo",
      apiKey: "secret-value",
      reviewerEmail: "reviewer@example.com",
      escalationContact: "mailto:security@example.com?subject=private",
      embeddedImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
      docsUrl: "https://example.com/private/reports?token=secret#hero",
      localMockupPath: "D:\\workspace\\private\\mockups\\review.html",
      nested: {
        sessionToken: "another-secret",
        note: "x".repeat(20),
      },
      list: ["keep", "drop-1", "drop-2"],
    }, {
      maxArrayItems: 1,
      maxStringLength: 8,
    });

    expect(sanitized).toEqual({
      project: "demo",
      apiKey: "[REDACTED]",
      reviewerEmail: "Email address",
      escalationContact: "Email link (query redacted)",
      embeddedImage: "Data URL (media type: image/png, base64 payload redacted)",
      docsUrl:
        "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
      localMockupPath: "Local file path (.html file)",
      nested: {
        sessionToken: "[REDACTED]",
        note: "xxxxxxxx... [truncated 12 chars]",
      },
      list: ["keep", "[2 more item(s) truncated]"],
    });
  });

  it("cuts off deep review context structures before they bloat prompts", () => {
    const sanitized = sanitizeReviewContext(
      {
        one: {
          two: {
            three: {
              four: {
                value: "too deep",
              },
            },
          },
        },
      },
      { maxDepth: 3 },
    );

    expect(sanitized).toEqual({
      one: {
        two: {
          three: "[Truncated object: max depth 3 reached]",
        },
      },
    });
  });
  it("supports caller-provided extra redactions when sanitizing review context", () => {
    const sanitized = sanitizeReviewContext(
      {
        project: "demo",
        policyLabel: "policy-alpha-42",
        note: "Escalate policy-alpha-42 through the shared review flow",
      },
      {
        extraRedactions: [
          {
            pattern: /\bpolicy-alpha-\d+\b/g,
            replacement: "[Policy identifier redacted]",
          },
        ],
      },
    );

    expect(sanitized).toEqual({
      project: "demo",
      policyLabel: "[Policy identifier redacted]",
      note: "Escalate [Policy identifier redacted] through the shared review flow",
    });
  });

  it("threads extra redactions through the review envelope context", () => {
    const prompt = buildReviewEnvelope({
      personaPrompt: "You are a careful reviewer.",
      context: {
        policyLabel: "policy-alpha-42",
      },
      taskInstructions: "Inspect the supplied material.",
      extraRedactions: [
        {
          pattern: /\bpolicy-alpha-\d+\b/g,
          replacement: "[Policy identifier redacted]",
        },
      ],
    });

    expect(prompt).toContain(
      '"policyLabel": "[Policy identifier redacted]"',
    );
    expect(prompt).not.toContain("policy-alpha-42");
  });
});
