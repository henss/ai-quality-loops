import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { validateStructuredReviewResult } from "../contracts/json-contracts.js";
import { defineReviewSurfaceRedactions } from "../shared/review-surface.js";
import {
  LINEAR_CANDIDATE_HANDOFF_SCHEMA,
  renderLinearCandidateHandoffYaml,
} from "./review-result-linear-handoff.js";
import {
  parseLinearCandidateHandoffYaml,
  validateLinearCandidateHandoffYaml,
} from "./review-result-linear-handoff-quality-gate.js";

function createStructuredResult(
  findings: StructuredReviewResult["findings"],
): StructuredReviewResult {
  return {
    schemaVersion: "1",
    workflow: "expert",
    expert: "Evidence Reviewer",
    model: "synthetic-reviewer-contract-fixture",
    summary: "Synthetic reviewer-contract fixture with generic evidence labels.",
    overallSeverity: "medium",
    findings,
    provenance: [
      {
        label: "Content source",
        value: "Synthetic review packet",
      },
    ],
    markdown: "# Summary\nSynthetic fixture.",
  };
}

describe("review result Linear candidate handoff renderer", () => {
  it("renders candidate-worthy review findings into deterministic YAML", () => {
    const yaml = renderLinearCandidateHandoffYaml(
      createStructuredResult([
        {
          key: "evidence-label-support",
          title: "Evidence label needs clearer support",
          summary: "The packet uses generic evidence labels instead of real source names.",
          severity: "medium",
          recommendation: "Ask the caller-owned workflow for a sanitized evidence summary.",
          evidence: ["Evidence label A", "Synthetic claim note"],
        },
        {
          title: "Action boundary stays caller-owned",
          summary: "Routing and remediation are outside the shared contract.",
          severity: "low",
        },
      ]),
      {
        sourceLabel: "Synthetic reviewer fixture",
      },
    );

    expect(yaml).toContain(`schema: "${LINEAR_CANDIDATE_HANDOFF_SCHEMA}"`);
    expect(yaml).toContain('label: "Synthetic reviewer fixture"');
    expect(yaml).toContain("writes_to_linear: false");
    expect(yaml).toContain("creates_issues: false");
    expect(yaml).toContain('prioritization_owner: "caller"');
    expect(yaml).toContain('id: "evidence-label-support"');
    expect(yaml).toContain('title: "Evidence label needs clearer support"');
    expect(yaml).toContain('severity: "medium"');
    expect(yaml).toContain('recommendation: "Ask the caller-owned workflow for a sanitized evidence summary."');
    expect(yaml).toContain('  - "Evidence label A"');
    expect(yaml).not.toContain("Action boundary stays caller-owned");
  });

  it("keeps low severity findings only when the caller opts into that handoff scope", () => {
    const yaml = renderLinearCandidateHandoffYaml(
      createStructuredResult([
        {
          title: "Action boundary stays caller-owned",
          summary: "Routing and remediation are outside the shared contract.",
          severity: "low",
        },
      ]),
      {
        includeSeverities: ["low"],
        defaultLabels: ["review-follow-up", "review-follow-up"],
      },
    );

    expect(yaml).toContain('id: "action-boundary-stays-caller-owned"');
    expect(yaml).toContain('  - "review-follow-up"');
    expect(yaml).toContain('  - "severity:low"');
    expect(yaml.match(/review-follow-up/g)).toHaveLength(1);
  });

  it("deduplicates generated candidate ids and applies caller redactions", () => {
    const yaml = renderLinearCandidateHandoffYaml(
      createStructuredResult([
        {
          title: "Private tracker reference",
          summary: "Escalate policy-alpha-42 to reviewer@example.com.",
          severity: "high",
        },
        {
          title: "Private tracker reference",
          summary: "Confirm policy-alpha-42 does not leak.",
          severity: "high",
        },
      ]),
      {
        extraRedactions: defineReviewSurfaceRedactions([
          {
            pattern: /policy-alpha-42/g,
            replacement: "[Policy identifier redacted]",
          },
        ]),
      },
    );

    expect(yaml).toContain('id: "private-tracker-reference"');
    expect(yaml).toContain('id: "private-tracker-reference-2"');
    expect(yaml).toContain("[Policy identifier redacted]");
    expect(yaml).toContain("Email address");
    expect(yaml).not.toContain("policy-alpha-42");
    expect(yaml).not.toContain("reviewer@example.com");
  });

  it("renders the synthetic PR review adapter pilot handoff fixture", async () => {
    const fixture = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "examples/synthetic-pr-review-result.fixture.json"),
        "utf-8",
      ),
    ) as unknown;
    const expected = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-pr-review-candidate-handoff.expected.yaml",
      ),
      "utf-8",
    );

    const validation = validateStructuredReviewResult(fixture);
    if (!validation.ok) {
      throw validation.error;
    }

    const yaml = renderLinearCandidateHandoffYaml(validation.value, {
      sourceLabel: "Synthetic PR review adapter pilot",
    });

    expect(yaml).toBe(expected);
    expect(yaml).toContain("writes_to_linear: false");
    expect(yaml).not.toContain("Low-severity wording cleanup");
  });

  it("validates the rendered handoff YAML as a strict no-write candidate packet", () => {
    const yaml = renderLinearCandidateHandoffYaml(
      createStructuredResult([
        {
          key: "handoff-contract",
          title: "Handoff contract is explicit",
          summary: "The candidate packet keeps routing and tracker writes caller-owned.",
          severity: "high",
          recommendation: "Validate the packet before downstream handoff.",
          evidence: ["Synthetic evidence label"],
        },
      ]),
      {
        sourceLabel: "Synthetic YAML gate fixture",
      },
    );

    const validation = validateLinearCandidateHandoffYaml(yaml);

    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      throw validation.error;
    }
    expect(validation.value.policy).toEqual({
      writesToLinear: false,
      createsIssues: false,
      prioritizationOwner: "caller",
      boundary:
        "Candidate handoff only; downstream tracker writes and priority decisions stay caller-owned.",
    });
    expect(validation.value.candidates).toEqual([
      {
        id: "handoff-contract",
        title: "Handoff contract is explicit",
        severity: "high",
        summary: "The candidate packet keeps routing and tracker writes caller-owned.",
        recommendation: "Validate the packet before downstream handoff.",
        suggestedLabels: ["review-finding", "severity:high"],
        evidence: ["Synthetic evidence label"],
      },
    ]);
  });

  it("rejects Linear handoff YAML that would perform tracker writes", () => {
    const yaml = renderLinearCandidateHandoffYaml(
      createStructuredResult([
        {
          title: "Tracker writes stay out of scope",
          summary: "A candidate handoff must not mutate downstream trackers.",
          severity: "high",
        },
      ]),
    ).replace("writes_to_linear: false", "writes_to_linear: true");

    const validation = validateLinearCandidateHandoffYaml(yaml);

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      throw new Error("Expected the write-enabled handoff to fail validation.");
    }
    expect(validation.error.message).toContain(
      'Linear handoff YAML field "writes_to_linear" must be false.',
    );
  });

  it("rejects malformed candidate labels before downstream handoff", () => {
    const validation = validateLinearCandidateHandoffYaml(`schema: "${LINEAR_CANDIDATE_HANDOFF_SCHEMA}"
source:
  kind: "structured_review_result"
  label: "Synthetic malformed handoff"
  workflow: "expert"
  expert: "Evidence Reviewer"
  model: "synthetic-reviewer-contract-fixture"
  overall_severity: "medium"
  summary: "Synthetic reviewer-contract fixture with generic evidence labels."
policy:
  writes_to_linear: false
  creates_issues: false
  prioritization_owner: "caller"
  boundary: "Candidate handoff only; downstream tracker writes and priority decisions stay caller-owned."
candidates:
  - id: "missing-labels"
    title: "Labels are missing"
    severity: "medium"
    summary: "The candidate omits required labels."
    suggested_labels: []
`);

    expect(validation.ok).toBe(false);
    if (validation.ok) {
      throw new Error("Expected the malformed handoff to fail validation.");
    }
    expect(validation.error.message).toContain(
      'Linear handoff YAML field "suggested_labels" must contain at least one label.',
    );
  });

  it("parses the public fixture into the quality-gate contract", async () => {
    const expected = await fs.readFile(
      path.join(
        process.cwd(),
        "examples/synthetic-pr-review-candidate-handoff.expected.yaml",
      ),
      "utf-8",
    );

    const handoff = parseLinearCandidateHandoffYaml(expected);

    expect(handoff.schema).toBe(LINEAR_CANDIDATE_HANDOFF_SCHEMA);
    expect(handoff.source.label).toBe("Synthetic PR review adapter pilot");
    expect(handoff.policy.writesToLinear).toBe(false);
    expect(handoff.policy.createsIssues).toBe(false);
    expect(handoff.candidates.map((candidate) => candidate.id)).toEqual([
      "missing-validation-evidence",
      "merge-authority-boundary",
    ]);
  });
});
