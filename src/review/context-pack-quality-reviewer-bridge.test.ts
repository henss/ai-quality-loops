import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createContextPackQualityReviewerBridge } from "./context-pack-quality-reviewer-bridge.js";

describe("context pack quality reviewer bridge", () => {
  it("renders a bounded review context and packet from source-handle-only inputs", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-context-pack-quality-bridge-input.fixture.json",
        ),
        "utf-8",
      ),
    ) as Parameters<typeof createContextPackQualityReviewerBridge>[0];
    const expectedContext = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-context-pack-quality-bridge-context.expected.json",
        ),
        "utf-8",
      ),
    ) as unknown;
    const expectedPacket = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-context-pack-quality-bridge.expected.md",
      ),
      "utf-8",
    );

    const bridge = createContextPackQualityReviewerBridge(fixture);

    expect(bridge.reviewContext).toEqual(expectedContext);
    expect(bridge.reviewPacketMarkdown).toBe(expectedPacket.trimEnd());
  });

  it("sanitizes path and email leaks in bridge output", () => {
    const bridge = createContextPackQualityReviewerBridge({
      reviewSurface: "Bridge packet for reviewer@example.com",
      reviewGoal:
        "Check D:\\workspace\\private\\packet.md without copying private truth.",
      evidenceHandles: [
        {
          label: "Evidence A",
          sourceHandle:
            "https://example.com/private/path?token=secret#fragment",
          intendedUse:
            "Support review of ./private/packet.md for reviewer@example.com.",
        },
      ],
      claims: [
        {
          claim:
            "The caller can review D:\\workspace\\private\\packet.md from reviewer@example.com using only one handle.",
          evidenceLabels: ["Evidence A"],
        },
      ],
    });

    expect(bridge.reviewContext.reviewSurface).not.toContain("reviewer@example.com");
    expect(bridge.reviewPacketMarkdown).not.toContain("D:\\workspace\\private");
    expect(bridge.reviewPacketMarkdown).not.toContain("token=secret");
    expect(bridge.reviewPacketMarkdown).not.toContain("reviewer@example.com");
    expect(bridge.reviewPacketMarkdown).toContain(
      "Remote URL (host: example.com, path segments: 2, query redacted, fragment redacted)",
    );
    expect(bridge.reviewPacketMarkdown).toContain("Local file path (.md file)");
    expect(bridge.reviewPacketMarkdown).toContain("Email address");
  });

  it("rejects claims that reference unknown evidence labels", () => {
    expect(() =>
      createContextPackQualityReviewerBridge({
        reviewSurface: "Synthetic bridge packet",
        reviewGoal: "Check one bounded pack.",
        evidenceHandles: [
          {
            label: "Evidence A",
            sourceHandle: "source:alpha/redacted",
            intendedUse: "Support one claim.",
          },
        ],
        claims: [
          {
            claim: "Unsupported claim mapping.",
            evidenceLabels: ["Evidence Missing"],
          },
        ],
      }),
    ).toThrow('claims[0] references unknown evidence label "Evidence Missing".');
  });
});
