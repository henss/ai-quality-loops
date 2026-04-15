import { afterEach, describe, expect, it, vi } from "vitest";
import { callOllamaVision, generateTextWithOllama, processOllamaStream } from "./ollama.js";

describe("Ollama Utilities", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should process a generate stream", async () => {
    const chunks = [
      JSON.stringify({ response: "Hello", done: false }),
      JSON.stringify({ response: " world", done: true }),
    ].map(s => new TextEncoder().encode(s + "\n"));

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    const mockResponse = {
      body: stream
    } as unknown as Response;

    const result = await processOllamaStream(mockResponse, "generate");
    expect(result).toBe("Hello world");
  });

  it("should process a chat stream with thinking", async () => {
    const chunks = [
      JSON.stringify({ thinking: "Reasoning...", done: false }),
      JSON.stringify({ message: { content: "Final answer" }, done: true }),
    ].map(s => new TextEncoder().encode(s + "\n"));

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    const mockResponse = {
      body: stream
    } as unknown as Response;

    const result = await processOllamaStream(mockResponse, "chat");
    expect(result).toContain("<thought>");
    expect(result).toContain("Reasoning...");
    expect(result).toContain("Final answer");
  });

  it("should handle partial JSON chunks in stream", async () => {
    const part1 = JSON.stringify({ response: "Hello", done: false }).substring(0, 10);
    const part2 = JSON.stringify({ response: "Hello", done: false }).substring(10) + "\n";
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(part1));
        controller.enqueue(new TextEncoder().encode(part2));
        controller.close();
      }
    });

    const mockResponse = {
      body: stream
    } as unknown as Response;

    const result = await processOllamaStream(mockResponse, "generate");
    expect(result).toBe("Hello");
  });

  it("passes custom keep_alive to text generation requests", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ response: "ok", done: true }) + "\n"),
        );
        controller.close();
      },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: stream,
    } as unknown as Response);

    await generateTextWithOllama({
      ollamaUrl: "http://localhost:11434",
      model: "qwen3.5:27b",
      prompt: "Review this.",
      keepAlive: "2h",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      keep_alive?: string;
    };
    expect(body.keep_alive).toBe("2h");
  });

  it("passes custom keep_alive to vision chat requests", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({ message: { content: "ok" }, done: true }) + "\n",
          ),
        );
        controller.close();
      },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: stream,
    } as unknown as Response);

    await callOllamaVision({
      ollamaUrl: "http://localhost:11434",
      model: "qwen3-vl:30b",
      prompt: "Review this.",
      imagesBase64: ["abc"],
      keepAlive: "2h",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      keep_alive?: string;
    };
    expect(body.keep_alive).toBe("2h");
  });
});
