# Reviewer Contract Starter Kit

Copy these templates into your own repository when you want one minimal text-review seam that produces AI Quality Loops' structured review-result contract without moving project policy into this package.

## Files

- `review.manifest.template.json` wires one repeatable `batch-review` run.
- `review-context.template.json` keeps the reviewer focused on evidence support, caveats, contract compatibility, and caller-owned authority boundaries.
- `review-target.template.md` is a starter packet shape that uses generic evidence labels and explicit caveats instead of private or domain-specific facts.

## Suggested Use

1. Copy the three template files into a repo-owned review folder.
2. Replace the placeholder packet text with caller-sanitized content from your workflow.
3. Keep target selection, severity budgets, approval, routing, remediation, publication, retention, and any real-world action outside `ai-quality-loops`.

## Boundary

This starter kit is intentionally local-Ollama-first and analysis-only. It does not add a scaffold command, hosted review service, remote-provider policy, private source schema, tracker adapter, or package-owned workflow automation.
