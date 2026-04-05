import { beforeEach, describe, expect, it, vi } from "vitest";

const { execaMock, existsSyncMock, mkdirSyncMock, statSyncMock } = vi.hoisted(
  () => ({
    execaMock: vi.fn(),
    existsSyncMock: vi.fn(),
    mkdirSyncMock: vi.fn(),
    statSyncMock: vi.fn(),
  }),
);

vi.mock("execa", () => ({
  execa: execaMock,
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
    statSync: statSyncMock,
  },
}));

import { takeScreenshot } from "./screenshot.js";

describe("takeScreenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSyncMock.mockReturnValue(true);
    statSyncMock.mockReturnValue({ size: 42 });
    execaMock.mockResolvedValue({ stdout: "", stderr: "" });
  });

  it("applies caller-provided extra redactions to screenshot log output", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await takeScreenshot("https://example.com", "reviews/output.png", {
      chromePath: "custom runner acme-internal-42",
      extraRedactions: [
        {
          pattern: /\bacme-internal-\d+\b/g,
          replacement: "[Project identifier redacted]",
        },
      ],
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("using custom runner [Project identifier redacted]"),
    );
    expect(errorSpy).not.toHaveBeenCalled();

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("applies caller-provided extra redactions to screenshot failure summaries", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    execaMock.mockRejectedValue(
      new Error("Browser launch failed for tenant acme-internal-42"),
    );

    await expect(
      takeScreenshot("https://example.com", "reviews/output.png", {
        extraRedactions: [
          {
            pattern: /\bacme-internal-\d+\b/g,
            replacement: "[Project identifier redacted]",
          },
        ],
      }),
    ).rejects.toThrow("Browser launch failed for tenant acme-internal-42");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Error: Browser launch failed for tenant [Project identifier redacted]",
      ),
    );

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
