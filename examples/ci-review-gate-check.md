# CI Review Gate Check

This recipe shows one generic repository check that runs a checked-in `batch-review` manifest, publishes structured artifacts, and gates the CI job with `review-gate`. It is intentionally caller-owned: copy the shape into your repo, replace the placeholder targets, and set budgets that match your project.

## 1. Add a CI manifest

Create a repo-local manifest such as `review-manifest.ci.json`:

```json
{
  "defaults": {
    "expert": "UI/UX",
    "outputDir": "./reviews/ai-quality",
    "structuredOutputDir": "./reviews/ai-quality/json"
  },
  "reviews": [
    {
      "name": "Readme audit",
      "mode": "expert",
      "expert": "Efficiency",
      "target": "./README.md"
    },
    {
      "name": "Homepage visual smoke",
      "mode": "vision",
      "target": "./path/to/local-page.html",
      "sections": ["main"]
    }
  ]
}
```

Replace the targets with files, local pages, screenshots, or URLs that are safe for your repository and CI environment. Keep private domains, secrets, project routing, and organization policy in the embedding repo, not in the shared package.

## 2. Run the check in CI

Add a generic CI step after your package install and after any local page build needed by the manifest:

```bash
set -euo pipefail

npm exec -- batch-review ./review-manifest.ci.json --summary-output ./reviews/ai-quality/batch-summary.json
npm exec -- review-gate \
  --batch-summary ./reviews/ai-quality/batch-summary.json \
  --max-failed-reviews 0 \
  --max-critical 0 \
  --max-high "${AIQL_MAX_HIGH:-0}" \
  --max-medium "${AIQL_MAX_MEDIUM:-5}" \
  --json
```

`batch-review` writes Markdown notes and structured JSON companions because the manifest sets `outputDir` and `structuredOutputDir`. `review-gate --batch-summary` then reads the summary rollups and returns the process status CI needs. The example budgets are placeholders, not package defaults.

## 3. Archive artifacts

If your CI provider supports artifacts, archive `./reviews/ai-quality/` after the step runs. The package does not upload or schedule anything on its own, so artifact retention remains a repository decision.

## Boundary notes

- Use `npm exec -- <command>` when `ai-quality-loops` is installed in the repo. Adapt only the package-manager wrapper if you use a different tool.
- Provision the same local prerequisites your reviews need, such as Ollama models, browser binaries, and any built pages referenced by the manifest.
- Keep `review-gate` thresholds explicit in the CI step or in repo-owned environment variables; the shared package should not infer organization policy.
- If the manifest only uses direct structured result files, gate them with repeated `--result ./reviews/ai-quality/json/<file>.json` flags instead of `--batch-summary`.
