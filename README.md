# AI Quality Loops

A collection of core LLM utilities and visual review tools for automated quality control.

## Components

- **Ollama Client**: Robust streaming and vision model support for local LLMs (Ollama).
- **Screenshot Tool**: Headless browser wrapper (Edge/Chrome) for visual analysis and regression.
- **Expert Review Engine**: Persona-driven analysis of text and code using specialized prompts.
- **Vision Review**: Multi-persona visual audits for UI/UX consistency using vision-capable LLMs.

## Installation

```bash
npm install ai-quality-loops
```

## Starter Examples

The package publishes copy-ready starter manifests under `examples/` so embedding repos can begin with a narrow checked-in surface instead of rebuilding command shapes from README prose:

- `examples/text-expert-audit.manifest.json` for one text/persona audit
- `examples/webpage-vision-sweep.manifest.json` for one webpage review sweep with targeted section captures
- `examples/screenshot-batch-run.manifest.json` for one screenshot-backed batch run over existing image files

Use the companion notes in `examples/README.md` to decide which example to copy, which targets must be replaced, and when to use `vision-sections`, `vision-preview --manifest`, `batch-review`, and `review-gate` together.

## Configuration

The library works out-of-the-box with default example personas in `personas/universal.md`, but you can customize it with your own paths:

- `PROMPT_LIBRARY_PATH`: Path to your personas Markdown file (defaults to `personas.md` in your project, then falls back to the library's `universal.md`).
- `CONTEXT_PATH`: Path to your brand/project context JSON (defaults to `context.json`). Review prompts sanitize this context before injection by redacting common secret-bearing keys, summarizing URL/path-like metadata, and truncating oversized plain-text values.
- For project-local identifiers that should not become default open-source heuristics, the shared review entrypoints and sanitizers accept caller-provided `extraRedactions` rules so private labels can be redacted by the embedding project without widening the library's built-in pattern set.
- If you want to reuse the same literal rule array across multiple entrypoints, the package root now exports `defineReviewSurfaceRedactions(...)`, the `ReviewSurfaceRedactions` bundle type, and the `ReviewSurfaceRedactionRule` item type. `defineReviewSurfaceRedactions(...)` returns an immutable reusable bundle so downstream code can treat project-local redactions as a stable package-edge contract without turning them into library policy.
- Review metadata such as source URLs, local paths, and capture labels is summarized before it is embedded in prompts or review logs, so private directory layouts, query strings, and raw section identifiers are not echoed by default.
- Prompt and error sanitization also summarizes embedded email addresses and `mailto:` links so reviewer contacts or escalation aliases are not echoed verbatim in shared review artifacts.
- Prompt and error sanitization also summarizes inline `data:` URLs so embedded image or text payloads are not copied verbatim into prompts, logs, or saved review notes.
- Saved-review log messages also summarize output artifact paths instead of echoing absolute local filesystem locations.
- Review and screenshot error logs also summarize embedded local paths and remote URLs before they are emitted, including quoted or space-containing file paths, keeping failure diagnostics generic without exposing raw directory layout or query-string detail.
- Screenshot capture utilities also accept caller-provided `extraRedactions` rules, so embedding projects can redact private structured identifiers from browser-command logs or launch failures without expanding the library's built-in heuristic set.
- CLI failure output also emits only sanitized error summaries instead of raw stacks, so command-line review runs do not re-expose private paths or URL query details during failures.
- Review flows also attach prompt-safe provenance bullets such as `Content source` or `Capture mode`, using sanitized descriptors instead of raw local paths or sensitive URL details.
- Targeted vision-review provenance preserves the planned capture label together with the sanitized requested section id, using values such as `section-1 (hero)` instead of collapsing everything to anonymous section counters.
- Expert and vision review entrypoints can also emit one narrow structured review-result contract with summary, severity rollup, finding list, sanitized provenance descriptors, and the original Markdown, so downstream automation can route findings without maintaining brittle Markdown parsers.
- The package also publishes JSON Schema artifacts for the batch-review manifest, batch-review summary, and structured review-result contracts under `schemas/`, alongside thin `parse...` and `validate...` helpers exported from the package root for callers that want contract checks without adding a schema runtime first.
- `CHROME_PATH`: (Optional) Path to your browser executable (defaults to Edge on Windows).
- `OLLAMA_URL`: (Optional) URL to your Ollama instance (defaults to http://127.0.0.1:11434).

### Custom Logging

You can override the default `console` logging by providing your own `Logger`:

```typescript
import { setLogger, silentLogger } from 'ai-quality-loops';

// Disable all logs
setLogger(silentLogger);

// Or provide a custom implementation
setLogger({
  info: (msg) => myCustomLog.info(msg),
  warn: (msg) => myCustomLog.warn(msg),
  error: (msg) => myCustomLog.error(msg),
  debug: (msg) => myCustomLog.debug(msg)
});
```

## Usage

### Expert Text Review

```typescript
import {
  defineReviewSurfaceRedactions,
  runExpertReview
} from 'ai-quality-loops';

const extraRedactions = defineReviewSurfaceRedactions([
  {
    pattern: /\bacme-internal-\d+\b/g,
    replacement: '[Project identifier redacted]'
  }
]);

await runExpertReview({
  expert: 'UI/UX', // Name of the persona in your library
  content: 'Path to file or raw text to review',
  modelId: 'llama3.2',
  outputPath: './reviews/ux-review.md',
  extraRedactions
});
```

If a caller needs structured findings instead of only Markdown, request the additive review-result contract:

```typescript
const result = await runExpertReview({
  expert: 'UI/UX',
  content: './README.md',
  resultFormat: 'structured',
  structuredOutputPath: './reviews/ux-review.json'
});

console.log(result.summary);
console.log(result.findings[0]?.severity);
```

If a wrapper wants to validate JSON payloads against the published contract surface before it wires in a full JSON Schema toolchain, use the package helpers and the schema files together:

```typescript
import {
  JSON_CONTRACT_SCHEMA_FILES,
  validateBatchReviewManifest,
  validateStructuredReviewResult
} from 'ai-quality-loops';

const manifestValidation = validateBatchReviewManifest(manifestJson);
if (!manifestValidation.ok) {
  throw manifestValidation.error;
}

const resultValidation = validateStructuredReviewResult(reviewResultJson);
if (!resultValidation.ok) {
  throw resultValidation.error;
}

console.log(JSON_CONTRACT_SCHEMA_FILES.batchReviewManifest);
console.log(JSON_CONTRACT_SCHEMA_FILES.structuredReviewResult);
```

### Visual Audit (Vision Review)

```typescript
import {
  defineReviewSurfaceRedactions,
  runVisionReview
} from 'ai-quality-loops';

const extraRedactions = defineReviewSurfaceRedactions([
  {
    pattern: /\bacme-internal-\d+\b/g,
    replacement: '[Project identifier redacted]'
  }
]);

await runVisionReview({
  urlOrPath: 'https://example.com',
  expert: 'UI/UX',
  outputPath: './reviews/vision-ux.md',
  width: 1280,
  height: 720,
  extraRedactions
});
```

The same contract is available for screenshot-backed reviews:

```typescript
const result = await runVisionReview({
  urlOrPath: 'https://example.com',
  expert: 'UI/UX',
  resultFormat: 'structured',
  structuredOutputPath: './reviews/vision-ux.json'
});

console.log(result.provenance);
```

When two structured review runs need a deterministic regression summary, compare them directly instead of diffing Markdown:

```typescript
import {
  compareStructuredReviewResults,
  parseStructuredReviewResult
} from 'ai-quality-loops';

const previous = parseStructuredReviewResult(previousJson);
const current = parseStructuredReviewResult(currentJson);
const comparison = compareStructuredReviewResults({
  before: previous,
  after: current
});

console.log(comparison.overallSeverityChange.direction);
console.log(comparison.counts);
console.log(comparison.changed.map((finding) => finding.key));
```

The comparison helper stays intentionally narrow:

- it compares exactly two published structured review-result artifacts
- it groups findings by a stable normalized key derived from title or summary text
- it reports added, removed, changed, and unchanged findings plus per-finding and overall severity movement
- it does not add scoring, approval heuristics, or model-based equivalence judgments

### Review Compare CLI

Use `review-compare` when a shell-first wrapper needs the same deterministic comparison without writing TypeScript glue.

```bash
review-compare ./reviews/previous.json ./reviews/current.json
review-compare ./reviews/previous.json ./reviews/current.json --json
```

The command stays intentionally narrow:

- it reads exactly two published structured review-result JSON artifacts
- it emits either a deterministic human-readable summary or machine-readable JSON
- it sanitizes file-path labels in CLI output instead of echoing raw local filesystem locations
- it does not add approval policy, fuzzy matching, or multi-run trend analysis

### Section Discovery For Targeted Vision Captures

Use `vision-sections` before `vision-review --sections ...` or before authoring a batch-review manifest when you need to discover fragment-compatible DOM ids from a rendered page.

```bash
vision-sections https://example.com
vision-sections ./site/index.html --json
```

The command stays generic on purpose:

- It renders the page with the same browser-based capture stack used by screenshot-backed reviews.
- It lists valid `#id` fragment targets and prints a manifest-ready `sections` array suggestion.
- It does not guess which sections you should review or add project-specific selector heuristics to the shared package surface.

### Capture Preview For Targeted Vision Runs

Use `vision-preview` when you want the exact screenshots a `vision-review` run would capture, without spending model time first.

```bash
vision-preview https://example.com --sections hero,pricing
vision-preview ./site/index.html --css ".debug-outline { outline: 2px solid red; }" --output-dir ./artifacts/preview
vision-preview --manifest ./review-manifest.json --entry-name "Homepage hero" --json
```

The command stays intentionally narrow:

- It uses the same capture planning and browser screenshot path as `vision-review`.
- It shows whether requested custom CSS was actually injected, which matters when the target is not a local HTML file.
- It can preview one vision entry from a batch-review manifest without widening into browser-debugging or auto-fixing behavior.

### Manifest-Driven Batch Reviews

Use `batch-review` when you want to run the same expert or vision audit across multiple targets without rebuilding the outer loop in each embedding repo.

`review-manifest.json`

```json
{
  "defaults": {
    "mode": "vision",
    "expert": "UI/UX",
    "outputDir": "./reviews/site-audit",
    "structuredOutputDir": "./reviews/site-audit/json",
    "width": 1440,
    "height": 900
  },
  "reviews": [
    {
      "name": "Homepage hero",
      "target": "https://example.com",
      "sections": ["hero"]
    },
    {
      "name": "Pricing page",
      "target": "https://example.com/pricing"
    },
    {
      "mode": "expert",
      "expert": "Efficiency",
      "target": "./README.md",
      "outputPath": "./reviews/readme-efficiency.md",
      "structuredOutputPath": "./reviews/json/readme-efficiency.json"
    }
  ]
}
```

```bash
expert-review ./README.md --expert "UI/UX" --json
expert-review --list-personas
expert-review --list-personas --prompt-library ./personas.md --json
expert-review ./README.md --expert "UI/UX" --output ./reviews/readme.md --json-output ./reviews/readme.json
vision-review https://example.com --expert "UI/UX" --json
vision-review https://example.com --list-personas

batch-review ./review-manifest.json
batch-review ./review-manifest.json --summary-output ./reviews/batch-summary.json
batch-review ./review-manifest.json --rerun-summary ./reviews/batch-summary.json --rerun-failed
batch-review ./review-manifest.json --rerun-summary ./reviews/batch-summary.json --entry-name "Homepage hero,Readme audit"

review-gate --result ./reviews/json/homepage-hero-vision-review.json --fail-on-severity critical
review-gate --result ./reviews/json/homepage-hero-vision-review.json --result ./reviews/json/pricing-vision-review.json --max-high 0 --max-medium 2
review-gate --batch-summary ./reviews/batch-summary.json --max-failed-reviews 0 --json
batch-review-compare ./reviews/previous-batch-summary.json ./reviews/current-batch-summary.json
batch-review-compare ./reviews/previous-batch-summary.json ./reviews/current-batch-summary.json --json
```

The CLI now runs the shared review-preflight checks against the manifest's combined prerequisites before the first review starts, so mixed expert and vision batches fail fast on missing personas, models, browser dependencies, or unreadable optional context files.

If an embedding repo needs a read-only manifest preview before deciding whether to execute, use the programmatic planning seam instead of parsing CLI text:

```typescript
import {
  formatBatchReviewExecutionPlan,
  loadBatchReviewExecutionPlan
} from 'ai-quality-loops';

const plan = await loadBatchReviewExecutionPlan({
  manifestPath: './review-manifest.json'
});

console.log(formatBatchReviewExecutionPlan(plan));
console.log(plan.entries[0]?.outputPath);
console.log(plan.preflight.personaRequirements);
```

That preview surface stays intentionally narrow:

- it resolves the manifest through the same normalization path the runner uses
- it exposes merged per-entry review settings, derived output paths, sanitized target summaries, and combined preflight requirements
- it does not add a second public CLI preview command yet, which keeps the next extraction decision separate from the existing Ready output seams

The manifest is intentionally narrow:

- `defaults` applies shared settings across the run.
- `reviews[]` defines sequential review targets using `target`, `mode`, and optional overrides like `expert`, `model`, `outputPath`, `structuredOutputPath`, `sections`, `css`, `width`, and `height`.
- `outputDir` and `structuredOutputDir` are optional shared conveniences. When a review omits `outputPath` or `structuredOutputPath`, the runner derives stable Markdown and structured-result filenames inside those directories.
- `--summary-output` writes one sanitized JSON artifact with batch totals, stable per-entry `resultKey` values, per-target status, sanitized target descriptors, sanitized Markdown and structured-result output locations, additive structured-result severity/count rollups when JSON companions exist, and failure summaries so downstream automation can ingest the run without parsing the human console summary.
- `--rerun-summary` reuses one prior summary artifact to select a bounded rerun set from the current manifest without widening into resumable orchestration state.
- `--rerun-failed` reruns only entries that failed in that prior summary, while `--entry-name` reruns one or more named entries recorded in the summary artifact. Matching stays on summary result indexes and manifest review names, so duplicate names should be avoided when rerunning by name.
- The first slice is sequential only. Concurrency, scheduling, and repo-specific policy routing stay outside the shared open-source boundary.

When a vision review needs targeted captures, run `vision-sections <target>` first and copy the suggested ids into the manifest's `sections` array.

### Review Gate CLI

Use `review-gate` when CI or a repo-local script needs one explicit pass/fail decision from published machine-readable artifacts.

- `--result` reads one or more structured review-result JSON files and applies severity or finding-count budgets.
- `--batch-summary` reads one or more batch summary JSON files and applies failed-review budgets, plus severity or finding-count budgets when entries include structured-result rollups.
- `--fail-on-severity`, `--max-critical`, `--max-high`, `--max-medium`, `--max-low`, `--max-unknown`, and `--max-failed-reviews` keep policy explicit instead of hiding repo-specific heuristics in the package.
- `--json` emits a machine-readable report with counts, thresholds, violations, and sanitized input labels.

The surface stays explicit: `review-gate --batch-summary` consumes only published per-entry `structuredResult` rollups and never infers repo-specific policy defaults. If a summary entry does not include a rollup, severity budgets report that missing rollup instead of silently treating the entry as clean.

### Batch Review Compare CLI

Use `batch-review-compare` when a repeated manifest run needs a deterministic two-summary overview without diffing console text or reading per-entry result files.

- It compares exactly two published batch-review summary JSON artifacts.
- It matches entries by the summary `resultKey` and reports added, removed, status-changed, and unchanged entries.
- It reports aggregate severity movement and finding-count deltas only from the per-entry `structuredResult` rollups already present in the summaries.
- It does not infer baselines, read structured output paths, add approval policy, or route results through `review-gate`.

### Review Preflight CLI

Use `review-preflight` to catch missing local prerequisites before a costly expert or vision run.

```bash
review-preflight --mode both --expert "UI/UX"
review-preflight --mode vision --vision-model qwen3-vl:30b --json
```

The command stays read-only and checks:

- Ollama reachability plus whether the requested expert and/or vision model is installed.
- Browser executable availability for screenshot-backed review flows.
- Persona-library resolution for the requested persona.
- Optional context JSON readability when a context file is configured.

It exits with code `0` on success and `1` on failure. Use `--json` when a wrapper script needs structured pass/fail details.

When a wrapper or operator needs discovery instead of validation, use the same entrypoints to list the active prompt-library surface before running a review:

```bash
review-preflight --list-personas
review-preflight --list-personas --prompt-library ./personas.md --json
```

The persona catalog surface stays intentionally narrow:

- It lists the personas found in the active prompt library plus the built-in alias mappings that resolve to them.
- It flags aliases that do not currently resolve to a persona in that library, which keeps generic-vs-project-local gaps explicit instead of failing later in a review run.
- It does not recommend personas, score them, or add project-specific defaults beyond the existing shared alias map.

### Direct Ollama Calls

```typescript
import { generateTextWithOllama, callOllamaVision } from 'ai-quality-loops';

// Text generation
const response = await generateTextWithOllama({
  ollamaUrl: 'http://localhost:11434',
  model: 'llama3.2',
  prompt: 'Hello, how are you?'
});

// Vision analysis
const analysis = await callOllamaVision({
  ollamaUrl: 'http://localhost:11434',
  model: 'llama3.2-vision',
  prompt: 'Describe this image',
  imagesBase64: [base64String]
});
```

## Persona Library Format

The library expects a Markdown file where personas are defined using `### LLM COMMITTEE PERSONA: 1. NAME` headers.

```markdown
### LLM COMMITTEE PERSONA: 1. SKEPTICAL UI/UX CRITIC
You are a senior UI/UX critic...
```

## License

MIT
