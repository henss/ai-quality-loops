import type {
  BatchReviewArtifactResult,
  BatchReviewArtifactSummary,
  BatchReviewManifest,
  BatchReviewManifestEntry,
  BatchReviewMode,
} from "../contracts/json-contracts.js";

export type CaptureReviewRetrySelector =
  | { kind: "failed-results" }
  | { kind: "entry-index"; index: number }
  | { kind: "entry-name"; name: string }
  | { kind: "result-key"; resultKey: string };

export type CaptureReviewRetryEvidenceStatus =
  | "ready"
  | "incomplete"
  | "rejected";

export type CaptureReviewRetryPurpose =
  | "recover-failed-review"
  | "recheck-completed-review";

export type CaptureReviewRetryGenericityState =
  | "confirmed"
  | "unknown"
  | "domain-specific";

export interface CaptureReviewRetryGenericityEvidence {
  targetReference?: CaptureReviewRetryGenericityState;
  outputPaths?: CaptureReviewRetryGenericityState;
  captureLabels?: CaptureReviewRetryGenericityState;
  contextReferences?: CaptureReviewRetryGenericityState;
}

export interface CaptureReviewRetryEvidenceClassifierOptions {
  selector: CaptureReviewRetrySelector;
  genericity?: CaptureReviewRetryGenericityEvidence;
  requiredMode?: BatchReviewMode | "any";
}

export interface CaptureReviewRetryEvidenceItem {
  status: CaptureReviewRetryEvidenceStatus;
  purpose?: CaptureReviewRetryPurpose;
  index?: number;
  name?: string;
  resultKey?: string;
  mode?: BatchReviewMode;
  targetSummary?: string;
  issues: string[];
}

export interface CaptureReviewRetryEvidenceClassification {
  status: CaptureReviewRetryEvidenceStatus;
  selectorKind: CaptureReviewRetrySelector["kind"];
  selected: CaptureReviewRetryEvidenceItem[];
  counts: Record<CaptureReviewRetryEvidenceStatus, number>;
}

export const CONFIRMED_CAPTURE_REVIEW_RETRY_GENERICITY: Required<CaptureReviewRetryGenericityEvidence> =
  Object.freeze({
    targetReference: "confirmed",
    outputPaths: "confirmed",
    captureLabels: "confirmed",
    contextReferences: "confirmed",
  });

function findResultsForSelector(
  summary: BatchReviewArtifactSummary,
  selector: CaptureReviewRetrySelector,
): BatchReviewArtifactResult[] {
  switch (selector.kind) {
    case "failed-results":
      return summary.results.filter((result) => result.status === "failure");
    case "entry-index":
      return summary.results.filter((result) => result.index === selector.index);
    case "entry-name":
      return summary.results.filter((result) => result.name === selector.name);
    case "result-key":
      return summary.results.filter((result) => result.resultKey === selector.resultKey);
  }
}

function selectorLabel(selector: CaptureReviewRetrySelector): string {
  switch (selector.kind) {
    case "failed-results":
      return "failed-results";
    case "entry-index":
      return `entry-index:${selector.index}`;
    case "entry-name":
      return "entry-name";
    case "result-key":
      return "result-key";
  }
}

function manifestEntryMode(
  manifest: BatchReviewManifest,
  entry: BatchReviewManifestEntry,
): BatchReviewMode | undefined {
  return entry.mode ?? manifest.defaults?.mode;
}

function hasOutputPathEvidence(
  manifest: BatchReviewManifest,
  entry: BatchReviewManifestEntry,
): boolean {
  return Boolean(
    entry.outputPath ||
      entry.structuredOutputPath ||
      manifest.defaults?.outputDir ||
      manifest.defaults?.structuredOutputDir,
  );
}

function hasCaptureLabelEvidence(entry: BatchReviewManifestEntry): boolean {
  return Boolean(entry.name || (entry.sections && entry.sections.length > 0));
}

function hasContextEvidence(
  manifest: BatchReviewManifest,
  entry: BatchReviewManifestEntry,
): boolean {
  return Boolean(entry.contextPath || manifest.defaults?.contextPath);
}

function addGenericityIssue(
  issues: string[],
  field: keyof CaptureReviewRetryGenericityEvidence,
  evidence: CaptureReviewRetryGenericityEvidence,
): void {
  const state = evidence[field] ?? "unknown";
  if (state === "confirmed") {
    return;
  }

  issues.push(
    state === "domain-specific"
      ? `${field} are not public-boundary safe`
      : `${field} genericity is not confirmed`,
  );
}

function classifyIssueStatus(issues: string[]): CaptureReviewRetryEvidenceStatus {
  return issues.some((issue) => issue.includes("not public-boundary safe"))
    ? "rejected"
    : issues.length > 0
      ? "incomplete"
      : "ready";
}

function classifyResultEvidence(input: {
  manifest: BatchReviewManifest;
  result: BatchReviewArtifactResult;
  genericity: CaptureReviewRetryGenericityEvidence;
  requiredMode: BatchReviewMode | "any";
}): CaptureReviewRetryEvidenceItem {
  const { manifest, result, genericity, requiredMode } = input;
  const issues: string[] = [];
  const manifestEntry = manifest.reviews[result.index];

  if (!manifestEntry) {
    issues.push("summary result does not match a manifest entry");
  }

  const mode = manifestEntry ? manifestEntryMode(manifest, manifestEntry) : result.mode;
  const canEchoLabels = genericity.captureLabels === "confirmed";
  const canEchoTargetSummary = genericity.targetReference === "confirmed";
  if (requiredMode !== "any" && mode !== requiredMode) {
    issues.push(`manifest entry is ${mode ?? "missing mode"}, not ${requiredMode}`);
  }

  if (result.status === "failure") {
    if (!result.errorSummary) {
      issues.push("failed summary result is missing an error summary");
    }
  } else if (!result.structuredResult) {
    issues.push("completed summary result is missing a structured severity rollup");
  }

  if (manifestEntry) {
    addGenericityIssue(issues, "targetReference", genericity);

    if (hasOutputPathEvidence(manifest, manifestEntry)) {
      addGenericityIssue(issues, "outputPaths", genericity);
    }

    if (hasCaptureLabelEvidence(manifestEntry)) {
      addGenericityIssue(issues, "captureLabels", genericity);
    }

    if (hasContextEvidence(manifest, manifestEntry)) {
      addGenericityIssue(issues, "contextReferences", genericity);
    }
  }

  return {
    status: classifyIssueStatus(issues),
    purpose:
      result.status === "failure"
        ? "recover-failed-review"
        : "recheck-completed-review",
    index: result.index,
    name: canEchoLabels ? result.name : undefined,
    resultKey: canEchoLabels ? result.resultKey : undefined,
    mode: result.mode,
    targetSummary: canEchoTargetSummary ? result.targetSummary : undefined,
    issues,
  };
}

function summarizeStatus(
  selected: CaptureReviewRetryEvidenceItem[],
): CaptureReviewRetryEvidenceStatus {
  if (selected.some((item) => item.status === "rejected")) {
    return "rejected";
  }

  if (selected.length === 0 || selected.some((item) => item.status === "incomplete")) {
    return "incomplete";
  }

  return "ready";
}

export function classifyCaptureReviewRetryEvidence(
  manifest: BatchReviewManifest,
  summary: BatchReviewArtifactSummary,
  options: CaptureReviewRetryEvidenceClassifierOptions,
): CaptureReviewRetryEvidenceClassification {
  const genericity = options.genericity ?? {};
  const requiredMode = options.requiredMode ?? "vision";
  const selectedResults = findResultsForSelector(summary, options.selector);
  const selected =
    selectedResults.length > 0
      ? selectedResults.map((result) =>
          classifyResultEvidence({
            manifest,
            result,
            genericity,
            requiredMode,
          }),
        )
      : [
          {
            status: "incomplete" as const,
            issues: [
              `retry selector matched no prior summary results: ${selectorLabel(options.selector)}`,
            ],
          },
        ];

  return {
    status: summarizeStatus(selected),
    selectorKind: options.selector.kind,
    selected,
    counts: {
      ready: selected.filter((item) => item.status === "ready").length,
      incomplete: selected.filter((item) => item.status === "incomplete").length,
      rejected: selected.filter((item) => item.status === "rejected").length,
    },
  };
}
