import { describe, it, expect } from "vitest";
import { processOllamaStream } from "./ollama.js";

describe("Ollama Utilities", () => {
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
});
