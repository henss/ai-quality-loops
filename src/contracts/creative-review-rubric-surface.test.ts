import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("synthetic creative-review rubric surface", () => {
  it("keeps the synthetic creative-review rubric dimensions structured and public-safe", async () => {
    const context = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "examples/synthetic-creative-review-context.json",
        ),
        "utf-8",
      ),
    ) as {
      rubricDimensions?: Array<{
        id?: string;
        label?: string;
        reviewQuestion?: string;
        passSignals?: string[];
        failSignals?: string[];
      }>;
    };

    expect(context.rubricDimensions).toEqual([
      expect.objectContaining({
        id: "claim-proportionality",
        label: "Claim Proportionality",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
      expect.objectContaining({
        id: "evidence-label-clarity",
        label: "Evidence Label Clarity",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
      expect.objectContaining({
        id: "boundary-discipline",
        label: "Boundary Discipline",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
      expect.objectContaining({
        id: "caveat-preservation",
        label: "Caveat Preservation",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
      expect.objectContaining({
        id: "next-step-hygiene",
        label: "Next-Step Hygiene",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
      expect.objectContaining({
        id: "shared-surface-safety",
        label: "Shared-Surface Safety",
        passSignals: expect.any(Array),
        failSignals: expect.any(Array),
      }),
    ]);

    const serialized = JSON.stringify(context).toLowerCase();
    for (const privateBoundaryTerm of [
      "stefan",
      "linear",
      "smartseer",
      "ops-",
      "https://",
      "d:\\",
      "/users/",
      ".png",
      ".jpg",
      ".jpeg",
    ]) {
      expect(serialized).not.toContain(privateBoundaryTerm);
    }
  });
});
