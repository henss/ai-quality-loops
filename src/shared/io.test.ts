import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { readJson, writeJson, fileExists, ensureDir, writeText } from "./io.js";

describe("IO Utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-quality-loops-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should check if a file exists", async () => {
    const testFile = path.join(tempDir, "test.txt");
    expect(await fileExists(testFile)).toBe(false);
    await fs.writeFile(testFile, "hello");
    expect(await fileExists(testFile)).toBe(true);
  });

  it("should write and read JSON", async () => {
    const testJson = path.join(tempDir, "test.json");
    const data = { foo: "bar" };
    await writeJson(testJson, data, false);
    const read = await readJson<{ foo: string }>(testJson);
    expect(read.foo).toBe("bar");
  });

  it("should write text and ensure directory exists", async () => {
    const subDir = path.join(tempDir, "sub/dir");
    const testFile = path.join(subDir, "test.txt");
    await writeText(testFile, "  hello world  ");
    const content = await fs.readFile(testFile, "utf-8");
    expect(content).toBe("hello world\n");
  });

  it("should add a generated marker to JSON by default", async () => {
    const testJson = path.join(tempDir, "test-marker.json");
    const data = { foo: "bar" };
    await writeJson(testJson, data);
    const read = await readJson<any>(testJson);
    expect(read._generated).toBeDefined();
    expect(read.foo).toBe("bar");
  });
});
