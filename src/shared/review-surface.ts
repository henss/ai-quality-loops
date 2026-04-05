import path from "node:path";

export interface SanitizeReviewSurfaceValueOptions {
  maxLength?: number;
}

const DEFAULT_SANITIZE_REVIEW_SURFACE_VALUE_OPTIONS: Required<SanitizeReviewSurfaceValueOptions> =
  {
    maxLength: 160,
  };

function truncateSurfaceValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

function sanitizeLocalPathDescriptor(value: string): string {
  const normalized = value.replace(/^file:\/\//i, "").replace(/\\/g, "/");
  const basename = normalized.split("/").filter(Boolean).at(-1) || "";
  const ext = path.posix.extname(basename) || path.extname(basename);

  return ext ? `Local file path (${ext} file)` : "Local file path";
}

function sanitizeRemoteUrlDescriptor(value: string): string {
  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/").filter(Boolean).length;
    const parts = [`Remote URL (host: ${parsed.host}`];

    if (pathSegments > 0) {
      parts.push(`path segments: ${pathSegments}`);
    }
    if (parsed.search) {
      parts.push("query redacted");
    }
    if (parsed.hash) {
      parts.push("fragment redacted");
    }

    return `${parts.join(", ")})`;
  } catch {
    return "Remote URL";
  }
}

export function sanitizeReviewSurfaceValue(
  value: string,
  options: SanitizeReviewSurfaceValueOptions = {},
): string {
  const config = {
    ...DEFAULT_SANITIZE_REVIEW_SURFACE_VALUE_OPTIONS,
    ...options,
  };
  const trimmed = value.trim();

  if (!trimmed) {
    return "[empty]";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return sanitizeRemoteUrlDescriptor(trimmed);
  }

  if (
    /^file:\/\//i.test(trimmed) ||
    /^[a-zA-Z]:[\\/]/.test(trimmed) ||
    /^\\\\/.test(trimmed) ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\")
  ) {
    return sanitizeLocalPathDescriptor(trimmed);
  }

  return truncateSurfaceValue(trimmed, config.maxLength);
}
