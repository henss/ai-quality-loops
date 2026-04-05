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
- Review metadata such as source URLs, local paths, and capture labels is summarized before it is embedded in prompts or review logs, so private directory layouts, query strings, and raw section identifiers are not echoed by default.
- Saved-review log messages also summarize output artifact paths instead of echoing absolute local filesystem locations.
- Review and screenshot error logs also summarize embedded local paths and remote URLs before they are emitted, keeping failure diagnostics generic without exposing raw directory layout or query-string detail.
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
import { runExpertReview } from 'ai-quality-loops';

await runExpertReview({
  expert: 'UI/UX', // Name of the persona in your library
  content: 'Path to file or raw text to review',
  modelId: 'llama3.2',
  outputPath: './reviews/ux-review.md'
});
```

### Visual Audit (Vision Review)

```typescript
import { runVisionReview } from 'ai-quality-loops';

await runVisionReview({
  urlOrPath: 'https://example.com',
  expert: 'UI/UX',
  outputPath: './reviews/vision-ux.md',
  width: 1280,
  height: 720
});
```

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
