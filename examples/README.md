# Starter Manifests

These starter manifests are intentionally generic. Copy one into your repo, change the `target` values, then keep any repo-specific wrappers or policy logic outside `ai-quality-loops`.

## Capability map

The example files cover the repeatable workflow surfaces. The package also supports single-run and low-level entrypoints that do not need a copied manifest:

| Need | Start here | Notes |
| --- | --- | --- |
| Review one text file or raw text input | `expert-review ./README.md --expert "UI/UX"` | Use `--json-output` when a wrapper needs structured findings. |
| Review one webpage, local HTML file, or screenshot target | `vision-review https://example.com --expert "UI/UX"` | Use `--json-output` for the same structured review-result contract. |
| List available personas before picking one | `review-preflight --list-personas --json` | Useful when a repo supplies its own prompt library. |
| Check local review prerequisites | `review-preflight --mode both --expert "UI/UX"` | Checks Ollama, browser availability, personas, and optional context files. |
| Find stable page fragments for targeted vision review | `vision-sections https://example.com --json` | Copy the suggested `sections` values into a manifest or direct review call. |
| Preview browser captures before spending model time | `vision-preview --manifest ./examples/webpage-vision-sweep.manifest.json --entry-name "Homepage hero"` | Also works with a direct URL or local HTML file. |
| Compare two structured review-result JSON files | `review-compare ./reviews/previous.json ./reviews/current.json --json` | Use for single-target before/after checks. |
| Run several repeatable reviews from one checked-in plan | `batch-review ./examples/webpage-vision-sweep.manifest.json` | Use the starter manifests below as copy-ready shapes. |
| Rerun only failed or named batch entries | `batch-review ./manifest.json --rerun-summary ./reviews/batch-summary.json --rerun-failed` | Keeps retry selection tied to the prior summary artifact. |
| Gate a local or CI check with explicit budgets | `review-gate --result ./reviews/result.json --max-high 0` | Use `--batch-summary` for a whole manifest run or `--batch-comparison` for explicit comparison-report delta budgets. |
| Compare two batch summary artifacts | `batch-review-compare ./reviews/previous-summary.json ./reviews/current-summary.json --json` | Feed the JSON report into `review-gate --batch-comparison` when CI should fail on caller-owned regression budgets. |
| Probe image-review quality with a synthetic visual target | `vision-preview --manifest ./examples/synthetic-zone-vision-probe.manifest.json --entry-name "Synthetic zone overview"` | Uses generic zones only; keep real capture handling, thresholds, and routing caller-owned. |
| Review a sanitized social evidence packet | `batch-review ./examples/sanitized-social-evidence-review.manifest.json` | Use this as a text-review seam for redacted evidence packets; keep real sources, proof thresholds, and publication routing caller-owned. |
| Validate a synthetic reviewer-contract fixture | `validateStructuredReviewResult(...)` with `./examples/synthetic-reviewer-contract-result.fixture.json` | Use when checking contract consumers against a public-safe fixture with generic evidence labels and caller-owned action boundaries. |
| Validate a sanitized structured-result fixture | `validateStructuredReviewResult(...)` with `./examples/synthetic-apartment-review-result.fixture.json` | Use when checking contract consumers against a fixture that contains no private home data. |
| Compare a synthetic structured-result golden diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-structured-result-golden-diff-before.fixture.json` and `./examples/synthetic-structured-result-golden-diff-after.fixture.json` | Use when checking comparison consumers against a public-safe expected diff fixture. |
| Make lower-level local LLM calls | `generateTextWithOllama(...)` or `callOllamaVision(...)` | Use only when the review workflow is too high-level for the caller. |

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

### `synthetic-zone-vision-probe.manifest.json`

Use when you want a runnable image-review quality probe that exercises browser capture, targeted sections, structured output paths, and `review-gate` compatibility without checking in private screenshots or domain semantics.

```bash
vision-preview --manifest ./examples/synthetic-zone-vision-probe.manifest.json --entry-name "Synthetic zone overview"
batch-review ./examples/synthetic-zone-vision-probe.manifest.json --summary-output ./reviews/synthetic-zone-summary.json
review-gate --batch-summary ./reviews/synthetic-zone-summary.json --max-failed-reviews 0
```

Typical edits:

- keep the target synthetic or replace it with a public-safe fixture owned by your repo
- review only visual quality concerns such as spacing, hierarchy, contrast, and label clarity
- keep real source handling, retention, thresholds, routing, and domain interpretation outside `ai-quality-loops`

### `sanitized-social-evidence-review.manifest.json`

Use when you want a generic text review over a redacted evidence packet before a caller-owned public surface uses social proof, testimonials, usage signals, or qualitative feedback.

```bash
batch-review ./examples/sanitized-social-evidence-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a redacted evidence packet from your repo
- keep or adapt the sanitized context file so review stays focused on claim support, caveats, traceability, and authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned evidence reviewer when project policy needs one
- keep real account data, raw screenshots, source collection, proof thresholds, publication approval, and action routing outside `ai-quality-loops`

### `synthetic-apartment-review-result.fixture.json`

Use when you want a structured review-result fixture for contract tests without checking in real household data.

Typical edits:

- do not replace the synthetic zone labels with real room names, resident details, coordinates, or capture paths
- keep any real screenshots, retention policy, and action routing in the embedding repo
- use it as a consumer fixture for `validateStructuredReviewResult(...)`, not as a runnable `batch-review` target

### `synthetic-reviewer-contract-result.fixture.json`

Use when you want a public-safe reviewer-contract fixture for contract tests without checking in real tracker data, private paths, source names, or domain policy.

Typical edits:

- keep evidence labels synthetic or replace them only with caller-sanitized labels
- keep approval, routing, remediation, publication, and domain interpretation outside `ai-quality-loops`
- use `docs/reviewer-contract.md` as the boundary note before promoting another reviewer-contract example

### `synthetic-structured-result-golden-diff-*.json`

Use when you want a deterministic before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare --json`.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results
- compare the helper output to `synthetic-structured-result-golden-diff.expected.json` when a wrapper needs a stable golden output shape
- keep baseline selection, severity budgets, approval, routing, and remediation policy in the embedding repo

## Boundary notes

- The examples stay open-source-safe on purpose. They do not embed private domains, company personas, or project-specific output routing.
- The synthetic apartment fixture is contract-focused. It intentionally excludes real room names, image paths, coordinates, operator-specific facts, and release or publication instructions.
- The synthetic reviewer-contract fixture is contract-focused. It intentionally excludes real issue keys, source URLs, local paths, account names, approval policy, and routing instructions.
- The synthetic structured-result golden diff is comparison-focused. It intentionally excludes real source labels, tracker identifiers, local paths, account names, private facts, policy thresholds, and routing instructions.
- The synthetic social evidence fixture is seam-focused. It intentionally excludes real account names, audience facts, source identities, brand strategy, publication decisions, and business routing.
- If you need repo-specific naming, redaction rules, or CI budgets, add that in the embedding repo instead of widening the shared package surface.
- If a future workflow needs more than copied starter manifests and the generic CI recipe, the next extraction question is whether a scaffold command would stay generic enough for public maintenance.
