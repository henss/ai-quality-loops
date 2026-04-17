import { readFile } from "fs/promises";
import { getLogger } from "./logger.js";

export interface OllamaGenerationTelemetry {
  totalDurationMs?: number;
  loadDurationMs?: number;
  promptEvalCount?: number;
  promptEvalDurationMs?: number;
  evalCount?: number;
  evalDurationMs?: number;
}

export interface OllamaGenerationProgress {
  elapsedMs: number;
  generatedChars: number;
}

export interface DetailedOllamaGenerationResult {
  text: string;
  generatedChars: number;
  elapsedMs: number;
  telemetry?: OllamaGenerationTelemetry;
}

export interface OllamaStreamOptions {
  onProgress?: (progress: OllamaGenerationProgress) => void;
  progressIntervalMs?: number;
}

function durationNsToMs(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value / 1_000_000)
    : undefined;
}

function readCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readTelemetry(value: unknown): OllamaGenerationTelemetry | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const telemetry = {
    totalDurationMs: durationNsToMs(record.total_duration),
    loadDurationMs: durationNsToMs(record.load_duration),
    promptEvalCount: readCount(record.prompt_eval_count),
    promptEvalDurationMs: durationNsToMs(record.prompt_eval_duration),
    evalCount: readCount(record.eval_count),
    evalDurationMs: durationNsToMs(record.eval_duration),
  } satisfies OllamaGenerationTelemetry;

  return Object.values(telemetry).some((entry) => entry !== undefined)
    ? telemetry
    : undefined;
}

function renderOllamaText(fullContent: string, fullThinking: string): string {
  if (fullThinking.trim()) {
    if (fullContent.trim()) {
      return `<thought>\n${fullThinking.trim()}\n</thought>\n\n${fullContent.trim()}`;
    }
    return fullThinking.trim();
  }

  return fullContent;
}

/**
 * Common helper to process Ollama's streaming response and aggregate the content.
 * This is more robust for long reasoning outputs from models like qwen3-vl:32b.
 */
export async function processOllamaStream(
  res: Response,
  type: "chat" | "generate",
): Promise<string> {
  return (await processOllamaStreamDetailed(res, type)).text;
}

export async function processOllamaStreamDetailed(
  res: Response,
  type: "chat" | "generate",
  options: OllamaStreamOptions = {},
): Promise<DetailedOllamaGenerationResult> {
  const body = res.body;
  if (!body) {
    throw new Error("Ollama response body is empty.");
  }

  const startedAt = Date.now();
  const progressIntervalMs = options.progressIntervalMs ?? 30_000;
  let lastProgressAt = startedAt;
  let fullContent = "";
  let fullThinking = "";
  let telemetry: OllamaGenerationTelemetry | undefined;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const maybeReportProgress = () => {
    if (!options.onProgress) {
      return;
    }

    const now = Date.now();
    if (progressIntervalMs > 0 && now - lastProgressAt < progressIntervalMs) {
      return;
    }

    lastProgressAt = now;
    options.onProgress({
      elapsedMs: now - startedAt,
      generatedChars: renderOllamaText(fullContent, fullThinking).length,
    });
  };

  const processChunk = (data: Record<string, unknown>) => {
    if (type === "chat") {
      const message = data.message;
      if (typeof message === "object" && message !== null) {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string") {
          fullContent += content;
        }
      }
    } else if (typeof data.response === "string") {
      fullContent += data.response;
    }

    if (typeof data.thinking === "string") {
      fullThinking += data.thinking;
    }

    if (data.done === true) {
      telemetry = readTelemetry(data);
    }

    maybeReportProgress();
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        processChunk(JSON.parse(line) as Record<string, unknown>);
      } catch (err) {
        getLogger().warn(`[Ollama] Failed to parse stream chunk: ${line}`, err);
      }
    }
  }

  // Handle any remaining buffer
  if (buffer.trim()) {
    try {
      processChunk(JSON.parse(buffer) as Record<string, unknown>);
    } catch (err) {
      // ignore
    }
  }

  const text = renderOllamaText(fullContent, fullThinking);
  return {
    text,
    generatedChars: text.length,
    elapsedMs: Date.now() - startedAt,
    telemetry,
  };
}

export interface CallOllamaVisionParams {
  ollamaUrl: string;
  model: string;
  prompt: string;
  imagesBase64: string[];
  format?: string | object;
  temperature?: number;
  keepAlive?: string | number;
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
  keepAlive = "10m",
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
    keep_alive: keepAlive,
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
  keepAlive = "10m",
}: {
  ollamaUrl: string;
  model: string;
  messages: OllamaChatMessage[];
  format?: string | object;
  temperature?: number;
  keepAlive?: string | number;
}): Promise<string> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/chat`;
  const payload: any = {
    model,
    messages,
    stream: true,
    keep_alive: keepAlive,
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
  keepAlive = "10m",
  numPredict = 16384,
}: {
  ollamaUrl: string;
  model: string;
  prompt: string;
  format?: string | object;
  temperature?: number;
  keepAlive?: string | number;
  numPredict?: number;
}): Promise<string> {
  return (
    await generateTextWithOllamaDetailed({
      ollamaUrl,
      model,
      prompt,
      format,
      temperature,
      keepAlive,
      numPredict,
    })
  ).text;
}

export async function generateTextWithOllamaDetailed({
  ollamaUrl,
  model,
  prompt,
  format,
  temperature = 0.7,
  keepAlive = "10m",
  numPredict = 16384,
  onProgress,
  progressIntervalMs,
}: {
  ollamaUrl: string;
  model: string;
  prompt: string;
  format?: string | object;
  temperature?: number;
  keepAlive?: string | number;
  numPredict?: number;
  onProgress?: (progress: OllamaGenerationProgress) => void;
  progressIntervalMs?: number;
}): Promise<DetailedOllamaGenerationResult> {
  const url = `${ollamaUrl.replace(/\/$/, "")}/api/generate`;
  const payload: any = {
    model,
    prompt,
    stream: true,
    keep_alive: keepAlive,
    options: {
      temperature,
      num_ctx: 32768,
      num_predict: numPredict,
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

  return processOllamaStreamDetailed(res, "generate", {
    onProgress,
    progressIntervalMs,
  });
}

/**
 * Helper to read an image file and convert it to base64.
 */
export async function imageToBase64(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString("base64");
}
