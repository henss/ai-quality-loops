import { readFile } from "fs/promises";
import { getLogger } from "./logger.js";

/**
 * Common helper to process Ollama's streaming response and aggregate the content.
 * This is more robust for long reasoning outputs from models like qwen3-vl:32b.
 */
export async function processOllamaStream(
  res: Response,
  type: "chat" | "generate",
): Promise<string> {
  const body = res.body;
  if (!body) {
    throw new Error("Ollama response body is empty.");
  }

  let fullContent = "";
  let fullThinking = "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (type === "chat") {
          if (data.message?.content) {
            fullContent += data.message.content;
          }
        } else {
          if (data.response) {
            fullContent += data.response;
          }
        }

        // Handle reasoning models that return a 'thinking' field
        if (data.thinking) {
          fullThinking += data.thinking;
        }
      } catch (err) {
        getLogger().warn(`[Ollama] Failed to parse stream chunk: ${line}`, err);
      }
    }
  }

  // Handle any remaining buffer
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      if (type === "chat") {
        if (data.message?.content) fullContent += data.message.content;
      } else {
        if (data.response) fullContent += data.response;
      }
      if (data.thinking) fullThinking += data.thinking;
    } catch (err) {
      // ignore
    }
  }

  // If we have reasoning but no final content, return the reasoning.
  // Otherwise, if we have both, we usually want to prepend reasoning or just return content.
  // Given the issue "cut off somewhere in the middle", we should probably return both
  // if they are present, or at least ensure we don't discard the reasoning.
  if (fullThinking.trim()) {
    if (fullContent.trim()) {
      return `<thought>\n${fullThinking.trim()}\n</thought>\n\n${fullContent.trim()}`;
    }
    return fullThinking.trim();
  }

  return fullContent;
}

export interface CallOllamaVisionParams {
  ollamaUrl: string;
  model: string;
  prompt: string;
  imagesBase64: string[];
  format?: string | object;
  temperature?: number;
}

/**
 * Generic function to call Ollama's vision capabilities.
 */
export async function callOllamaVision({
  ollamaUrl,
  model,
  prompt,
  imagesBase64,
  format,
  temperature = 0.1,
}: CallOllamaVisionParams): Promise<string> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/chat`;
  const payload: any = {
    model,
    messages: [
      {
        role: "user",
        content: prompt,
        images: imagesBase64,
      },
    ],
    stream: true,
    keep_alive: "10m",
    options: {
      temperature: temperature || 0,
      num_ctx: 32768,
      num_predict: 16384,
      repeat_penalty: 1.1,
      top_p: 0.9,
      top_k: 40,
    },
  };

  if (format) {
    payload.format = format;
  }

  getLogger().info(
    `[Ollama] Calling ${url} with model ${model} (Chat API) and ${imagesBase64.length} images.`,
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama request failed: HTTP ${res.status} ${text}`);
  }

  return processOllamaStream(res, "chat");
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

/**
 * Generic function to call Ollama's chat capabilities (vision-aware).
 */
export async function callOllamaChatVision({
  ollamaUrl,
  model,
  messages,
  format,
  temperature = 0.1,
}: {
  ollamaUrl: string;
  model: string;
  messages: OllamaChatMessage[];
  format?: string | object;
  temperature?: number;
}): Promise<string> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/chat`;
  const payload: any = {
    model,
    messages,
    stream: true,
    keep_alive: "10m",
    options: {
      temperature: temperature || 0,
      num_ctx: 32768,
      num_predict: 16384,
      repeat_penalty: 1.1,
      top_p: 0.9,
      top_k: 40,
    },
  };

  if (format) {
    payload.format = format;
  }

  getLogger().info(
    `[Ollama] Chatting with ${url} (model ${model}) using ${messages.length} messages.`,
  );
  // getLogger().debug(`[Ollama] Payload:`, JSON.stringify({ ...payload, messages: payload.messages.map(m => ({ ...m, images: m.images ? m.images.length : 0 })) }));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama Chat request failed: HTTP ${res.status} ${text}`);
  }

  return processOllamaStream(res, "chat");
}

/**
 * Unloads a model from Ollama memory.
 */
export async function unloadModel(
  ollamaUrl: string,
  model: string,
): Promise<void> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/generate`;
  const payload = {
    model,
    keep_alive: 0,
  };

  getLogger().info(`[Ollama] Unloading model ${model} from ${url}.`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      getLogger().warn(
        `[Ollama] Failed to unload model (not critical): HTTP ${res.status} ${text}`,
      );
    }
  } catch (error) {
    getLogger().warn(`[Ollama] Error during unload (not critical):`, error);
  }
}

/**
 * Lists all running models in Ollama.
 */
export async function listRunningModels(ollamaUrl: string): Promise<string[]> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/ps`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      getLogger().warn(
        `[Ollama] Failed to list models: HTTP ${res.status} ${text}`,
      );
      return [];
    }

    const data = (await res.json()) as { models: Array<{ name: string }> };
    return (data.models || []).map((m) => m.name);
  } catch (error) {
    getLogger().warn(`[Ollama] Error during listRunningModels:`, error);
    return [];
  }
}

/**
 * Unloads all currently loaded models from Ollama memory.
 */
export async function unloadAllModels(ollamaUrl: string): Promise<void> {
  getLogger().info(`[Ollama] Unloading all models from ${ollamaUrl}`);
  const models = await listRunningModels(ollamaUrl);
  if (models.length === 0) {
    getLogger().info(`[Ollama] No models to unload.`);
    return;
  }

  for (const model of models) {
    await unloadModel(ollamaUrl, model);
  }
}

/**
 * Generic function to call Ollama's generation capabilities (non-vision).
 */
export async function generateTextWithOllama({
  ollamaUrl,
  model,
  prompt,
  format,
  temperature = 0.7,
}: {
  ollamaUrl: string;
  model: string;
  prompt: string;
  format?: string | object;
  temperature?: number;
}): Promise<string> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/generate`;
  const payload: any = {
    model,
    prompt,
    stream: true,
    keep_alive: "10m",
    options: {
      temperature,
      num_ctx: 32768,
      num_predict: 16384,
      repeat_penalty: 1.1,
      top_p: 0.9,
      top_k: 40,
    },
  };

  if (format) {
    payload.format = format;
  }

  getLogger().info(`[Ollama] Calling ${url} with model ${model}.`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama request failed: HTTP ${res.status} ${text}`);
  }

  return processOllamaStream(res, "generate");
}

/**
 * Helper to read an image file and convert it to base64.
 */
export async function imageToBase64(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString("base64");
}
