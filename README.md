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

### Manifest-Driven Batch Reviews

Use `batch-review` when you want to run the same expert or vision audit across multiple targets without rebuilding the outer loop in each embedding repo.

`review-manifest.json`

```json
{
  "defaults": {
    "mode": "vision",
    "expert": "UI/UX",
    "outputDir": "./reviews/site-audit",
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
      "outputPath": "./reviews/readme-efficiency.md"
    }
  ]
}
```

```bash
batch-review ./review-manifest.json
```

The manifest is intentionally narrow:

- `defaults` applies shared settings across the run.
- `reviews[]` defines sequential review targets using `target`, `mode`, and optional overrides like `expert`, `model`, `outputPath`, `sections`, `css`, `width`, and `height`.
- `outputDir` is an optional shared convenience. When a review omits `outputPath`, the runner derives a stable Markdown filename inside that directory.
- The first slice is sequential only. Concurrency, scheduling, and repo-specific policy routing stay outside the shared open-source boundary.

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
