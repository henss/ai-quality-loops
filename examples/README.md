# Starter Manifests

These starter manifests are intentionally generic. Copy one into your repo, change the `target` values, then keep any repo-specific wrappers or policy logic outside `ai-quality-loops`.

## Included examples

### `ci-review-gate-check.md`

Use when you want a generic CI job shape that runs `batch-review`, saves structured artifacts, and gates the repository check with `review-gate` without adding a hosted service, scheduler, or package-owned policy layer.

```bash
npm exec -- batch-review ./review-manifest.ci.json --summary-output ./reviews/ai-quality/batch-summary.json
npm exec -- review-gate --batch-summary ./reviews/ai-quality/batch-summary.json --max-failed-reviews 0 --max-critical 0
```

Typical edits:

- copy the recipe into your CI provider's script syntax
- replace the manifest targets with repo-safe local files, pages, screenshots, or URLs
- set `review-gate` budgets in the embedding repo so project policy stays outside `ai-quality-loops`

### `text-expert-audit.manifest.json`

Use when you want one bounded text review without inventing a repo-local manifest shape first.

```bash
batch-review ./examples/text-expert-audit.manifest.json
```

Typical edits:

- replace `target` with a local file path or raw-text input path that exists in your repo
- change `expert` to a persona available in your prompt library
- change the output directories if you want the artifacts somewhere other than `./reviews/...`

### `webpage-vision-sweep.manifest.json`

Use when you want one or more webpage reviews that share the same viewport, expert, and output policy.

```bash
vision-sections https://example.com
vision-preview --manifest ./examples/webpage-vision-sweep.manifest.json --entry-name "Homepage hero"
batch-review ./examples/webpage-vision-sweep.manifest.json
```

Typical edits:

- replace the example URLs with your real page URLs or local HTML file paths
- update the `sections` arrays after running `vision-sections` against the target page
- keep optional `css` overrides narrow and local to the specific entry that needs them

### `screenshot-batch-run.manifest.json`

Use when you already have screenshots or exported mockups and want a repeatable batch review run without adding browser capture to the workflow.

```bash
batch-review ./examples/screenshot-batch-run.manifest.json --summary-output ./reviews/screenshot-batch-summary.json
batch-review ./examples/screenshot-batch-run.manifest.json --rerun-summary ./reviews/screenshot-batch-summary.json --rerun-failed
review-gate --batch-summary ./reviews/screenshot-batch-summary.json --max-failed-reviews 0
```

Typical edits:

- replace the example `.png` paths with screenshot files that already exist in your repo or CI workspace
- keep review names unique so reruns by `--entry-name` stay unambiguous
- prefer checked-in manifests over ad hoc shell aliases when the same batch will run again

## Boundary notes

- The examples stay open-source-safe on purpose. They do not embed private domains, company personas, or project-specific output routing.
- If you need repo-specific naming, redaction rules, or CI budgets, add that in the embedding repo instead of widening the shared package surface.
- If a future workflow needs more than copied starter manifests and the generic CI recipe, the next extraction question is whether a scaffold command would stay generic enough for public maintenance.
