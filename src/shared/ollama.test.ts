import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callOllamaVision,
  generateTextWithOllama,
  generateTextWithOllamaDetailed,
  processOllamaStream,
  processOllamaStreamDetailed,
} from "./ollama.js";

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

  it("captures generation telemetry from the final stream chunk", async () => {
    const chunks = [
      JSON.stringify({ response: "Hello", done: false }),
      JSON.stringify({
        response: " world",
        done: true,
        total_duration: 2_500_000_000,
        load_duration: 100_000_000,
        prompt_eval_count: 12,
        prompt_eval_duration: 600_000_000,
        eval_count: 24,
        eval_duration: 1_200_000_000,
      }),
    ].map((s) => new TextEncoder().encode(s + "\n"));

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const result = await processOllamaStreamDetailed(
      { body: stream } as unknown as Response,
      "generate",
    );

    expect(result.text).toBe("Hello world");
    expect(result.generatedChars).toBe(11);
    expect(result.telemetry).toEqual({
      totalDurationMs: 2500,
      loadDurationMs: 100,
      promptEvalCount: 12,
      promptEvalDurationMs: 600,
      evalCount: 24,
      evalDurationMs: 1200,
    });
  });

  it("reports stream progress while content is generated", async () => {
    const chunks = [
      JSON.stringify({ response: "Hello", done: false }),
      JSON.stringify({ response: " world", done: true }),
    ].map((s) => new TextEncoder().encode(s + "\n"));
    const progress = vi.fn();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    await processOllamaStreamDetailed(
      { body: stream } as unknown as Response,
      "generate",
      {
        onProgress: progress,
        progressIntervalMs: 0,
      },
    );

    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({
        generatedChars: expect.any(Number),
      }),
    );
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

  it("passes generation format and prediction caps to detailed text requests", async () => {
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

    await generateTextWithOllamaDetailed({
      ollamaUrl: "http://localhost:11434",
      model: "qwen3.5:27b",
      prompt: "Review this.",
      keepAlive: "2h",
      format: { type: "object" },
      temperature: 0.1,
      numPredict: 4096,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      format?: unknown;
      options?: { temperature?: number; num_predict?: number };
    };
    expect(body.format).toEqual({ type: "object" });
    expect(body.options?.temperature).toBe(0.1);
    expect(body.options?.num_predict).toBe(4096);
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
