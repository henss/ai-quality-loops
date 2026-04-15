import path from "node:path";

export interface SanitizeReviewSurfaceValueOptions {
  maxLength?: number;
  extraRedactions?: ReviewSurfaceRedactions;
  includeFileName?: boolean;
}

export interface SummarizeReviewSurfaceErrorOptions {
  maxMessageLength?: number;
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface ReviewSurfaceRedactionRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}

export type ReviewSurfaceRedactions = ReadonlyArray<
  Readonly<ReviewSurfaceRedactionRule>
>;

export function defineReviewSurfaceRedactions(
  rules: Iterable<ReviewSurfaceRedactionRule>,
): ReviewSurfaceRedactions {
  return Object.freeze(
    Array.from(rules, (rule) =>
      Object.freeze({
        pattern: rule.pattern,
        replacement: rule.replacement,
      }),
    ),
  );
}

const DEFAULT_SANITIZE_REVIEW_SURFACE_VALUE_OPTIONS: Required<SanitizeReviewSurfaceValueOptions> =
  {
    maxLength: 160,
    extraRedactions: [],
    includeFileName: false,
  };

const DEFAULT_SUMMARIZE_REVIEW_SURFACE_ERROR_OPTIONS: Required<SummarizeReviewSurfaceErrorOptions> =
  {
    maxMessageLength: 160,
    extraRedactions: [],
  };

function truncateSurfaceValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

function sanitizeLocalPathDescriptor(value: string, includeFileName = false): string {
  const normalized = value.replace(/^file:\/\//i, "").replace(/\\/g, "/");
  const basename = normalized.split("/").filter(Boolean).at(-1) || "";
  const ext = path.posix.extname(basename) || path.extname(basename);
  const fileNameSuffix = includeFileName && basename ? `, file: ${basename}` : "";

  return ext ? `Local file path (${ext} file${fileNameSuffix})` : "Local file path";
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

function sanitizeEmailDescriptor(): string {
  return "Email address";
}

function sanitizeMailtoDescriptor(value: string): string {
  try {
    const parsed = new URL(value);
    const parts = ["Email link"];

    if (parsed.search) {
      parts.push("query redacted");
    }

    return parts.length === 1 ? parts[0] : `${parts[0]} (${parts[1]})`;
  } catch {
    return "Email link";
  }
}

function sanitizeDataUrlDescriptor(value: string): string {
  const match = value.match(/^data:([^,]*),/i);

  if (!match) {
    return "Data URL";
  }

  const descriptor = match[1] || "";
  const [rawMediaType] = descriptor.split(";", 1);
  const mediaType = rawMediaType.trim();
  const parts = ["Data URL"];

  if (mediaType) {
    parts.push(`media type: ${mediaType}`);
  }

  parts.push(/;base64/i.test(descriptor) ? "base64 payload redacted" : "payload redacted");

  return `${parts[0]} (${parts.slice(1).join(", ")})`;
}

function sanitizeQuotedSurfaceSegment(match: string, quote: string, candidate: string): string {
  if (/^data:/i.test(candidate)) {
    return `${quote}${sanitizeDataUrlDescriptor(candidate)}${quote}`;
  }

  if (/^mailto:/i.test(candidate)) {
    return `${quote}${sanitizeMailtoDescriptor(candidate)}${quote}`;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
    return `${quote}${sanitizeEmailDescriptor()}${quote}`;
  }

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

function applyExtraRedactions(
  value: string,
  extraRedactions: ReviewSurfaceRedactions,
): string {
  return extraRedactions.reduce((currentValue, rule) => {
    const { pattern, replacement } = rule;
    return currentValue.replace(pattern, (match) =>
      typeof replacement === "function" ? replacement(match) : replacement,
    );
  }, value);
}

function replaceSensitiveSurfaceSegments(value: string): string {
  return value
    .replace(
      /(["'`])((?:data:|mailto:|https?:\/\/|file:\/\/|[a-zA-Z]:[\\/]|\\\\|(?:\.{1,2}[\\/]|\/)|[^\s"'`]+@[^\s"'`]+\.[^\s"'`]+)[^"'`\r\n]*)\1/g,
      (match, quote: string, candidate: string) =>
        sanitizeQuotedSurfaceSegment(match, quote, candidate),
    )
    .replace(/data:[^\s)"'`]+/gi, (match) => sanitizeDataUrlDescriptor(match))
    .replace(/mailto:[^\s)"'`]+/gi, (match) => sanitizeMailtoDescriptor(match))
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      () => sanitizeEmailDescriptor(),
    )
    .replace(
      /https?:\/\/[^\s)"'`]+/gi,
      (match) => sanitizeRemoteUrlDescriptor(match),
    )
    .replace(
      /(^|[\s(])((?:file:\/\/[^\r\n"'`]+?\.[a-z0-9]{1,8}|[a-zA-Z]:[\\/][^\r\n"'`]+?\.[a-z0-9]{1,8}|\\\\[^\r\n"'`]+?\.[a-z0-9]{1,8}|(?:\.{1,2}[\\/]|\/)[^\r\n"'`]+?\.[a-z0-9]{1,8}))/gim,
      (_match, prefix: string, candidate: string) =>
        `${prefix}${sanitizeLocalPathDescriptor(candidate)}`,
    )
    .replace(
      /(^|[\s(])((?:file:\/\/[^\s)"'`]+|[a-zA-Z]:[\\/][^\s)"'`]+|\\\\[^\s)"'`]+|(?:\.{1,2}[\\/]|\/)[^\s)"'`]+))/gm,
      (_match, prefix: string, candidate: string) =>
        `${prefix}${sanitizeLocalPathDescriptor(candidate)}`,
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

  if (/^data:/i.test(trimmed)) {
    return sanitizeDataUrlDescriptor(trimmed);
  }

  if (/^mailto:/i.test(trimmed)) {
    return sanitizeMailtoDescriptor(trimmed);
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return sanitizeEmailDescriptor();
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
    return sanitizeLocalPathDescriptor(trimmed, config.includeFileName);
  }

  return truncateSurfaceValue(
    applyExtraRedactions(
      replaceSensitiveSurfaceSegments(trimmed),
      config.extraRedactions,
    ),
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
      extraRedactions: config.extraRedactions,
    });

    if (sanitizedMessage && sanitizedMessage !== "[empty]") {
      summaryParts.push(sanitizedMessage);
    }

    return summaryParts.join(": ");
  }

  if (typeof error === "string") {
    return sanitizeReviewSurfaceValue(error, {
      maxLength: config.maxMessageLength,
      extraRedactions: config.extraRedactions,
    });
  }

  if (error === null || error === undefined) {
    return "Unknown error";
  }

  return sanitizeReviewSurfaceValue(String(error), {
    maxLength: config.maxMessageLength,
    extraRedactions: config.extraRedactions,
  });
}
