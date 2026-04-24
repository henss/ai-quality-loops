# Reviewer Contract Starter Kit

Copy these templates into your own repository when you want one minimal text-review seam that produces AI Quality Loops' structured review-result contract without moving project policy into this package.

## Files

- `review.manifest.template.json` wires one repeatable `batch-review` run with an explicit structured JSON output path.
- `review-context.template.json` keeps the reviewer focused on evidence support, caveats, contract compatibility, and caller-owned authority boundaries.
- `review-target.template.md` is a starter packet shape that uses generic evidence labels and explicit caveats instead of private or domain-specific facts.
- `validate-review-result.template.mjs` is an optional copy-ready validation step that checks the emitted JSON against AIQL's structured review-result contract and points to the published schema file.

## Suggested Use

1. Copy the four template files into a repo-owned review folder.
2. Replace the placeholder packet text with caller-sanitized content from your workflow.
3. Run `batch-review` against the copied manifest to emit both Markdown and `./reviews/reviewer-contract/json/starter-review-result.json`.
4. Run `node ./validate-review-result.template.mjs ./reviews/reviewer-contract/json/starter-review-result.json` if you want a minimal contract check in the embedding repo before wiring a larger JSON Schema validator.
5. Keep target selection, severity budgets, approval, routing, remediation, publication, retention, and any real-world action outside `ai-quality-loops`.

## Validation Boundary

The validation script uses AIQL's built-in `validateStructuredReviewResult(...)` helper and prints the published `schemas/structured-review-result.schema.json` path for callers that also want a schema-level check in non-TypeScript tooling.

## Boundary

This starter kit is intentionally local-Ollama-first and analysis-only. It does not add a scaffold command, hosted review service, remote-provider policy, private source schema, tracker adapter, or package-owned workflow automation.
