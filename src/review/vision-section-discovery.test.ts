import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

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

  it("keeps the synthetic section stability manifest aligned with discoverable targets", () => {
    const repoRoot = process.cwd();
    const fixturePath = path.join(
      repoRoot,
      "examples",
      "synthetic-section-stability-layout.html",
    );
    const manifestPath = path.join(
      repoRoot,
      "examples",
      "synthetic-section-stability-benchmark.manifest.json",
    );
    const html = fs.readFileSync(fixturePath, "utf-8");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      reviews: Array<{ target: string; sections: string[] }>;
    };
    const review = manifest.reviews[0]!;
    const candidates = extractVisionSectionCandidates(html);
    const discoveredIds = new Set(candidates.map((candidate) => candidate.id));
    const missingSections = review.sections.filter(
      (section) => !discoveredIds.has(section),
    );

    expect(review.target).toBe("./examples/synthetic-section-stability-layout.html");
    expect(new Set(review.sections).size).toBe(review.sections.length);
    expect(missingSections).toEqual([]);
    expect(selectSuggestedVisionSections(candidates)).toEqual([
      "stability-page",
      "stable-target-beta",
      "stability-overview",
      "stable-target-alpha",
      "stability-summary",
    ]);
  });

  it("uses the browser DOM dump flow and sanitizes error output", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    execaMock.mockRejectedValue(
      new Error("Browser failed for policy policy-alpha-42"),
    );

    await expect(
      discoverVisionSections("https://example.com", {
        extraRedactions: [
          {
            pattern: /\bpolicy-alpha-\d+\b/g,
            replacement: "[Policy identifier redacted]",
          },
        ],
      }),
    ).rejects.toThrow("Browser failed for policy policy-alpha-42");

    expect(execaMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["--dump-dom", "https://example.com"]),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error: Browser failed for policy [Policy identifier redacted]",
      ),
    );

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
