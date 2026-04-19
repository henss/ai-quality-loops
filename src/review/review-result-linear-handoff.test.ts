import { describe, expect, it } from "vitest";
import type { StructuredReviewResult } from "../contracts/json-contracts.js";
import { defineReviewSurfaceRedactions } from "../shared/review-surface.js";
import {
  LINEAR_CANDIDATE_HANDOFF_SCHEMA,
  renderLinearCandidateHandoffYaml,
} from "./review-result-linear-handoff.js";

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
});
