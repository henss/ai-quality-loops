import { execa } from "execa";
import {
  type ReviewSurfaceRedactions,
  sanitizeReviewSurfaceValue,
  summarizeReviewSurfaceError,
} from "../shared/review-surface.js";
import { resolveFromCwd } from "../shared/io.js";
import { resolveBrowserPath } from "../utils/screenshot.js";

export type VisionSectionCandidateCategory =
  | "landmark"
  | "section"
  | "element";

export interface VisionSectionCandidate {
  id: string;
  fragment: string;
  tagName: string;
  category: VisionSectionCandidateCategory;
}

export interface DiscoverVisionSectionsOptions {
  browserPath?: string;
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface VisionSectionDiscoveryResult {
  targetSummary: string;
  totalCandidates: number;
  candidates: VisionSectionCandidate[];
  suggestedSections: string[];
}

const LANDMARK_TAGS = new Set([
  "aside",
  "footer",
  "form",
  "header",
  "main",
  "nav",
]);

const SECTION_TAGS = new Set([
  "article",
  "details",
  "dialog",
  "div",
  "figure",
  "li",
  "section",
  "table",
]);

const LANDMARK_ROLES = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "dialog",
  "form",
  "main",
  "navigation",
  "region",
  "search",
]);

const ATTRIBUTE_PATTERN =
  /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function normalizeDiscoveryTarget(urlOrPath: string): string {
  if (/^\s*$/.test(urlOrPath)) {
    throw new Error("A non-empty target is required for section discovery.");
  }

  if (/^\w+:\/\//.test(urlOrPath) || urlOrPath.startsWith("file://")) {
    return urlOrPath;
  }

  return `file://${resolveFromCwd(urlOrPath).replace(/\\/g, "/")}`;
}

function readAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const match of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
    const [, rawName, doubleQuotedValue, singleQuotedValue, bareValue] = match;
    const name = rawName.toLowerCase();

    if (name === "/" || name.length === 0) {
      continue;
    }

    attributes[name] =
      doubleQuotedValue ?? singleQuotedValue ?? bareValue ?? "";
  }

  return attributes;
}

function classifyVisionSectionCandidate(
  tagName: string,
  attributes: Record<string, string>,
): VisionSectionCandidateCategory {
  const role = attributes.role?.toLowerCase();

  if (LANDMARK_TAGS.has(tagName) || (role && LANDMARK_ROLES.has(role))) {
    return "landmark";
  }

  if (SECTION_TAGS.has(tagName)) {
    return "section";
  }

  return "element";
}

function rankVisionSectionCandidate(
  candidate: VisionSectionCandidate,
): number {
  switch (candidate.category) {
    case "landmark":
      return 0;
    case "section":
      return 1;
    default:
      return 2;
  }
}

function rankVisionSectionTag(tagName: string): number {
  switch (tagName) {
    case "section":
    case "article":
    case "details":
    case "dialog":
      return 0;
    case "main":
    case "nav":
    case "header":
    case "footer":
    case "aside":
    case "form":
      return 1;
    case "div":
    case "figure":
    case "li":
    case "table":
      return 2;
    default:
      return 3;
  }
}

export function extractVisionSectionCandidates(
  html: string,
): VisionSectionCandidate[] {
  const candidates: Array<VisionSectionCandidate & { order: number }> = [];
  const seenIds = new Set<string>();

  for (const [order, match] of [...html.matchAll(/<([a-zA-Z][\w:-]*)([^<>]*)>/g)].entries()) {
    const [, rawTagName, rawAttributes] = match;
    const tagName = rawTagName.toLowerCase();

    if (tagName === "script" || tagName === "style" || tagName === "template") {
      continue;
    }

    const attributes = readAttributes(rawAttributes);
    const id = attributes.id?.trim();

    if (!id || /\s/.test(id) || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    candidates.push({
      id,
      fragment: `#${id}`,
      tagName,
      category: classifyVisionSectionCandidate(tagName, attributes),
      order,
    });
  }

  return candidates
    .sort((left, right) => {
      const categoryRank = rankVisionSectionCandidate(left) - rankVisionSectionCandidate(right);
      if (categoryRank !== 0) {
        return categoryRank;
      }

      const tagRank = rankVisionSectionTag(left.tagName) - rankVisionSectionTag(right.tagName);
      if (tagRank !== 0) {
        return tagRank;
      }

      return left.order - right.order;
    })
    .map(({ order: _order, ...candidate }) => candidate);
}

export function selectSuggestedVisionSections(
  candidates: VisionSectionCandidate[],
): string[] {
  const semanticIds = candidates
    .filter((candidate) => candidate.category !== "element")
    .map((candidate) => candidate.id);

  if (semanticIds.length > 0) {
    return semanticIds;
  }

  return candidates.map((candidate) => candidate.id).slice(0, 12);
}

export function formatVisionSectionDiscovery(
  result: VisionSectionDiscoveryResult,
): string {
  const lines = [
    `Found ${result.totalCandidates} fragment-compatible section target(s) for ${result.targetSummary}.`,
  ];

  if (result.totalCandidates === 0) {
    lines.push("No DOM ids were discovered in the rendered page.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("Suggested `sections` value:");
  lines.push(JSON.stringify(result.suggestedSections));
  lines.push("");
  lines.push("Candidates:");

  for (const candidate of result.candidates) {
    lines.push(
      `- ${candidate.fragment} (${candidate.category}, <${candidate.tagName}>)`,
    );
  }

  return lines.join("\n");
}

export async function discoverVisionSections(
  urlOrPath: string,
  options: DiscoverVisionSectionsOptions = {},
): Promise<VisionSectionDiscoveryResult> {
  const targetUrl = normalizeDiscoveryTarget(urlOrPath);
  const chromePath = resolveBrowserPath(options.browserPath);
  const extraRedactions = options.extraRedactions || [];
  const sanitizedTarget = sanitizeReviewSurfaceValue(urlOrPath, {
    extraRedactions,
  });

  console.info(
    `[Vision Sections] Discovering section targets for ${sanitizeReviewSurfaceValue(targetUrl, {
      extraRedactions,
    })} using ${sanitizeReviewSurfaceValue(chromePath, {
      extraRedactions,
    })}...`,
  );

  try {
    const { stdout } = await execa(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--disable-dev-shm-usage",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=10000",
      "--dump-dom",
      targetUrl,
    ]);

    const candidates = extractVisionSectionCandidates(stdout);
    const suggestedSections = selectSuggestedVisionSections(candidates);

    console.info(
      `[Vision Sections] Found ${candidates.length} candidate target(s) for ${sanitizedTarget}.`,
    );

    return {
      targetSummary: sanitizedTarget,
      totalCandidates: candidates.length,
      candidates,
      suggestedSections,
    };
  } catch (error) {
    console.error(
      `[Vision Sections] Failed to discover section targets: ${summarizeReviewSurfaceError(error, {
        extraRedactions,
      })}`,
    );
    throw error;
  }
}
