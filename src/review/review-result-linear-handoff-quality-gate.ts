import type {
  JsonContractValidationResult,
  StructuredReviewResult,
  StructuredReviewSeverity,
} from "../contracts/json-contracts.js";
import { LINEAR_CANDIDATE_HANDOFF_SCHEMA } from "./review-result-linear-handoff.js";

export interface LinearCandidateHandoffSource {
  kind: "structured_review_result";
  label: string;
  workflow: StructuredReviewResult["workflow"];
  expert: string;
  model: string;
  overallSeverity: StructuredReviewSeverity;
  summary: string;
}

export interface LinearCandidateHandoffPolicy {
  writesToLinear: false;
  createsIssues: false;
  prioritizationOwner: "caller";
  boundary: string;
}

export interface LinearCandidateHandoffCandidate {
  id: string;
  title: string;
  severity: StructuredReviewSeverity;
  summary: string;
  recommendation?: string;
  suggestedLabels: string[];
  evidence?: string[];
}

export interface LinearCandidateHandoff {
  schema: typeof LINEAR_CANDIDATE_HANDOFF_SCHEMA;
  source: LinearCandidateHandoffSource;
  policy: LinearCandidateHandoffPolicy;
  candidates: LinearCandidateHandoffCandidate[];
}

class LinearCandidateHandoffYamlReader {
  private readonly lines: string[];
  private index = 0;

  constructor(yaml: string) {
    this.lines = yaml.replace(/\r\n/g, "\n").split("\n");
    while (this.lines.at(-1) === "") {
      this.lines.pop();
    }
  }

  get done(): boolean {
    return this.index >= this.lines.length;
  }

  peek(): string | undefined {
    return this.lines[this.index];
  }

  readField(indent: string, key: string): unknown {
    const line = this.readLine(`${indent}${key}: `);
    return parseLinearCandidateHandoffYamlScalar(
      line.slice(`${indent}${key}: `.length),
      this.index,
      key,
    );
  }

  readSection(indent: string, key: string): void {
    const expected = `${indent}${key}:`;
    const line = this.lines[this.index];
    if (line !== expected) {
      throw new Error(
        `Linear handoff YAML line ${this.index + 1} must be "${expected}".`,
      );
    }
    this.index += 1;
  }

  readStringList(indent: string, key: string): string[] {
    const emptyListLine = `${indent}${key}: []`;
    if (this.peek() === emptyListLine) {
      this.index += 1;
      return [];
    }

    this.readSection(indent, key);
    const itemPrefix = `${indent}  - `;
    const values: string[] = [];
    while (this.peek()?.startsWith(itemPrefix)) {
      const value = parseLinearCandidateHandoffYamlScalar(
        this.lines[this.index].slice(itemPrefix.length),
        this.index + 1,
        key,
      );
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(
          `Linear handoff YAML list "${key}" must contain non-empty strings.`,
        );
      }
      values.push(value);
      this.index += 1;
    }

    return values;
  }

  readCandidateId(): string {
    const idLinePrefix = "  - id: ";
    const idLine = this.peek();
    if (!idLine?.startsWith(idLinePrefix)) {
      throw new Error('Linear handoff YAML candidates must start with "  - id:".');
    }

    const value = parseLinearCandidateHandoffYamlScalar(
      idLine.slice(idLinePrefix.length),
      this.index + 1,
      "id",
    );
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error('Linear handoff YAML field "id" must be a non-empty string.');
    }

    this.index += 1;
    return value;
  }

  private readLine(prefix: string): string {
    const line = this.lines[this.index];
    if (!line?.startsWith(prefix)) {
      throw new Error(
        `Linear handoff YAML line ${this.index + 1} must start with "${prefix}".`,
      );
    }
    this.index += 1;
    return line;
  }
}

function parseLinearCandidateHandoffYamlScalar(
  rawValue: string,
  lineNumber: number,
  key: string,
): unknown {
  if (rawValue === "true") {
    return true;
  }
  if (rawValue === "false") {
    return false;
  }
  if (rawValue === "[]") {
    return [];
  }

  if (!rawValue.startsWith('"')) {
    throw new Error(
      `Linear handoff YAML field "${key}" on line ${lineNumber} must use a JSON-style quoted string, boolean, or empty list.`,
    );
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch (error) {
    throw new Error(
      `Linear handoff YAML field "${key}" on line ${lineNumber} is not a valid quoted scalar: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function readRequiredStringField(
  reader: LinearCandidateHandoffYamlReader,
  indent: string,
  key: string,
): string {
  const value = reader.readField(indent, key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Linear handoff YAML field "${key}" must be a non-empty string.`);
  }

  return value;
}

function readRequiredFalseField(
  reader: LinearCandidateHandoffYamlReader,
  indent: string,
  key: string,
): false {
  const value = reader.readField(indent, key);
  if (value !== false) {
    throw new Error(`Linear handoff YAML field "${key}" must be false.`);
  }

  return false;
}

function readStructuredReviewWorkflow(
  value: string,
  key: string,
): StructuredReviewResult["workflow"] {
  if (value !== "expert" && value !== "vision") {
    throw new Error(`Linear handoff YAML field "${key}" must be "expert" or "vision".`);
  }

  return value;
}

function readStructuredReviewSeverity(
  value: string,
  key: string,
): StructuredReviewSeverity {
  switch (value) {
    case "critical":
    case "high":
    case "medium":
    case "low":
    case "unknown":
      return value;
    default:
      throw new Error(
        `Linear handoff YAML field "${key}" must be one of critical, high, medium, low, or unknown.`,
      );
  }
}

function parseLinearCandidateHandoffCandidate(
  reader: LinearCandidateHandoffYamlReader,
): LinearCandidateHandoffCandidate {
  const id = reader.readCandidateId();
  const title = readRequiredStringField(reader, "    ", "title");
  const severity = readStructuredReviewSeverity(
    readRequiredStringField(reader, "    ", "severity"),
    "severity",
  );
  const summary = readRequiredStringField(reader, "    ", "summary");
  const recommendation = reader.peek()?.startsWith("    recommendation: ")
    ? readRequiredStringField(reader, "    ", "recommendation")
    : undefined;
  const suggestedLabels = reader.readStringList("    ", "suggested_labels");
  if (suggestedLabels.length === 0) {
    throw new Error(
      'Linear handoff YAML field "suggested_labels" must contain at least one label.',
    );
  }
  const evidence = reader.peek()?.startsWith("    evidence:")
    ? reader.readStringList("    ", "evidence")
    : undefined;

  return {
    id,
    title,
    severity,
    summary,
    recommendation,
    suggestedLabels,
    evidence,
  };
}

export function parseLinearCandidateHandoffYaml(
  yaml: string,
): LinearCandidateHandoff {
  const reader = new LinearCandidateHandoffYamlReader(yaml);
  const schema = readRequiredStringField(reader, "", "schema");
  if (schema !== LINEAR_CANDIDATE_HANDOFF_SCHEMA) {
    throw new Error(
      `Linear handoff YAML field "schema" must equal "${LINEAR_CANDIDATE_HANDOFF_SCHEMA}".`,
    );
  }

  reader.readSection("", "source");
  const kind = readRequiredStringField(reader, "  ", "kind");
  if (kind !== "structured_review_result") {
    throw new Error(
      'Linear handoff YAML field "source.kind" must equal "structured_review_result".',
    );
  }
  const source: LinearCandidateHandoffSource = {
    kind,
    label: readRequiredStringField(reader, "  ", "label"),
    workflow: readStructuredReviewWorkflow(
      readRequiredStringField(reader, "  ", "workflow"),
      "workflow",
    ),
    expert: readRequiredStringField(reader, "  ", "expert"),
    model: readRequiredStringField(reader, "  ", "model"),
    overallSeverity: readStructuredReviewSeverity(
      readRequiredStringField(reader, "  ", "overall_severity"),
      "overall_severity",
    ),
    summary: readRequiredStringField(reader, "  ", "summary"),
  };

  reader.readSection("", "policy");
  const policy: LinearCandidateHandoffPolicy = {
    writesToLinear: readRequiredFalseField(reader, "  ", "writes_to_linear"),
    createsIssues: readRequiredFalseField(reader, "  ", "creates_issues"),
    prioritizationOwner: readRequiredStringField(
      reader,
      "  ",
      "prioritization_owner",
    ) as "caller",
    boundary: readRequiredStringField(reader, "  ", "boundary"),
  };
  if (policy.prioritizationOwner !== "caller") {
    throw new Error(
      'Linear handoff YAML field "prioritization_owner" must equal "caller".',
    );
  }

  const candidates: LinearCandidateHandoffCandidate[] = [];
  if (reader.peek() === "candidates: []") {
    reader.readField("", "candidates");
  } else {
    reader.readSection("", "candidates");
    while (!reader.done) {
      candidates.push(parseLinearCandidateHandoffCandidate(reader));
    }
  }

  if (!reader.done) {
    throw new Error("Linear handoff YAML contains unsupported trailing content.");
  }

  return {
    schema,
    source,
    policy,
    candidates,
  };
}

export function validateLinearCandidateHandoffYaml(
  yaml: string,
): JsonContractValidationResult<LinearCandidateHandoff> {
  try {
    return {
      ok: true,
      value: parseLinearCandidateHandoffYaml(yaml),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
