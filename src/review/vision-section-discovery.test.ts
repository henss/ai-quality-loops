import { beforeEach, describe, expect, it, vi } from "vitest";

const execaMock = vi.hoisted(() => vi.fn());

vi.mock("execa", () => ({
  execa: execaMock,
}));

import {
  discoverVisionSections,
  extractVisionSectionCandidates,
  formatVisionSectionDiscovery,
  selectSuggestedVisionSections,
} from "./vision-section-discovery.js";

describe("vision section discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts fragment-compatible ids and sorts landmarks before generic elements", () => {
    const candidates = extractVisionSectionCandidates(`
      <div id="app"></div>
      <main id="content"></main>
      <section id="hero"></section>
      <div id="pricing"></div>
      <button id="cta"></button>
      <section id="hero"></section>
      <script id="ignored"></script>
    `);

    expect(candidates).toEqual([
      {
        id: "content",
        fragment: "#content",
        tagName: "main",
        category: "landmark",
      },
      {
        id: "hero",
        fragment: "#hero",
        tagName: "section",
        category: "section",
      },
      {
        id: "app",
        fragment: "#app",
        tagName: "div",
        category: "section",
      },
      {
        id: "pricing",
        fragment: "#pricing",
        tagName: "div",
        category: "section",
      },
      {
        id: "cta",
        fragment: "#cta",
        tagName: "button",
        category: "element",
      },
    ]);
  });

  it("prefers semantic candidates when building a suggested sections array", () => {
    expect(
      selectSuggestedVisionSections([
        {
          id: "content",
          fragment: "#content",
          tagName: "main",
          category: "landmark",
        },
        {
          id: "pricing",
          fragment: "#pricing",
          tagName: "div",
          category: "section",
        },
        {
          id: "cta",
          fragment: "#cta",
          tagName: "button",
          category: "element",
        },
      ]),
    ).toEqual(["content", "pricing"]);
  });

  it("formats a manifest-ready sections array for CLI output", () => {
    expect(
      formatVisionSectionDiscovery({
        targetSummary: "https://example.com",
        totalCandidates: 2,
        suggestedSections: ["hero", "pricing"],
        candidates: [
          {
            id: "hero",
            fragment: "#hero",
            tagName: "section",
            category: "section",
          },
          {
            id: "pricing",
            fragment: "#pricing",
            tagName: "div",
            category: "section",
          },
        ],
      }),
    ).toContain('Suggested `sections` value:\n["hero","pricing"]');
  });

  it("uses the browser DOM dump flow and sanitizes error output", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    execaMock.mockRejectedValue(
      new Error("Browser failed for tenant acme-internal-42"),
    );

    await expect(
      discoverVisionSections("https://example.com", {
        extraRedactions: [
          {
            pattern: /\bacme-internal-\d+\b/g,
            replacement: "[Project identifier redacted]",
          },
        ],
      }),
    ).rejects.toThrow("Browser failed for tenant acme-internal-42");

    expect(execaMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--dump-dom", "https://example.com"]),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error: Browser failed for tenant [Project identifier redacted]",
      ),
    );

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
