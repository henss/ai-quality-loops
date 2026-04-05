import path from "node:path";

export interface SanitizeReviewSurfaceValueOptions {
  maxLength?: number;
}

export interface SummarizeReviewSurfaceErrorOptions {
  maxMessageLength?: number;
}

const DEFAULT_SANITIZE_REVIEW_SURFACE_VALUE_OPTIONS: Required<SanitizeReviewSurfaceValueOptions> =
  {
    maxLength: 160,
  };

const DEFAULT_SUMMARIZE_REVIEW_SURFACE_ERROR_OPTIONS: Required<SummarizeReviewSurfaceErrorOptions> =
  {
    maxMessageLength: 160,
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

function sanitizeQuotedSurfaceSegment(match: string, quote: string, candidate: string): string {
  if (/^https?:\/\//i.test(candidate)) {
    return `${quote}${sanitizeRemoteUrlDescriptor(candidate)}${quote}`;
  }

  if (
    /^file:\/\//i.test(candidate) ||
    /^[a-zA-Z]:[\\/]/.test(candidate) ||
    /^\\\\/.test(candidate) ||
    candidate.startsWith("./") ||
    candidate.startsWith("../") ||
    candidate.startsWith("/")
  ) {
    return `${quote}${sanitizeLocalPathDescriptor(candidate)}${quote}`;
  }

  return match;
}

function replaceSensitiveSurfaceSegments(value: string): string {
  return value
    .replace(
      /(["'`])((?:https?:\/\/|file:\/\/|[a-zA-Z]:[\\/]|\\\\|(?:\.{1,2}[\\/]|\/))[^"'`\r\n]+)\1/g,
      (match, quote: string, candidate: string) =>
        sanitizeQuotedSurfaceSegment(match, quote, candidate),
    )
    .replace(
      /https?:\/\/[^\s)"'`]+/gi,
      (match) => sanitizeRemoteUrlDescriptor(match),
    )
    .replace(
      /(?:file:\/\/[^\r\n"'`]+?\.[a-z0-9]{1,8}|[a-zA-Z]:[\\/][^\r\n"'`]+?\.[a-z0-9]{1,8}|\\\\[^\r\n"'`]+?\.[a-z0-9]{1,8}|(?:\.{1,2}[\\/]|\/)[^\r\n"'`]+?\.[a-z0-9]{1,8})/gi,
      (match) => sanitizeLocalPathDescriptor(match),
    )
    .replace(
      /(?:file:\/\/[^\s)"'`]+|[a-zA-Z]:[\\/][^\s)"'`]+|\\\\[^\s)"'`]+|(?:\.{1,2}[\\/]|\/)[^\s)"'`]+)/g,
      (match) => sanitizeLocalPathDescriptor(match),
    );
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
    /^[^ \t\r\n]+(?:\\[^ \t\r\n]+)+$/.test(trimmed)
  ) {
    return sanitizeLocalPathDescriptor(trimmed);
  }

  return truncateSurfaceValue(
    replaceSensitiveSurfaceSegments(trimmed),
    config.maxLength,
  );
}

export function summarizeReviewSurfaceError(
  error: unknown,
  options: SummarizeReviewSurfaceErrorOptions = {},
): string {
  const config = {
    ...DEFAULT_SUMMARIZE_REVIEW_SURFACE_ERROR_OPTIONS,
    ...options,
  };

  if (error instanceof Error) {
    const summaryParts = [error.name];
    const sanitizedMessage = sanitizeReviewSurfaceValue(error.message, {
      maxLength: config.maxMessageLength,
    });

    if (sanitizedMessage && sanitizedMessage !== "[empty]") {
      summaryParts.push(sanitizedMessage);
    }

    return summaryParts.join(": ");
  }

  if (typeof error === "string") {
    return sanitizeReviewSurfaceValue(error, {
      maxLength: config.maxMessageLength,
    });
  }

  if (error === null || error === undefined) {
    return "Unknown error";
  }

  return sanitizeReviewSurfaceValue(String(error), {
    maxLength: config.maxMessageLength,
  });
}
