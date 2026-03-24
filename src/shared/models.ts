const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

export function getDefaultOllamaUrl(): string {
  return (
    process.env.OLLAMA_HOST ||
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_BASE_URL ||
    DEFAULT_OLLAMA_URL
  ).replace(/\/api$/, "");
}

export function getDefaultExpertReviewModel(): string {
  return process.env.AI_MODEL || "qwen3.5:27b";
}

export function getDefaultVisionReviewModel(): string {
  return process.env.VISION_MODEL || "qwen3-vl:30b";
}
