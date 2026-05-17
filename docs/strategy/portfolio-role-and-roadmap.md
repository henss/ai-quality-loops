# AIQL Portfolio Role And Roadmap

Status: current portfolio strategy layer for `ai-quality-loops`.

AIQL is an active build project for local-first structured review and gates. Its job is to turn review targets into durable, public-safe artifacts that caller-owned workflows can validate, compare, gate, and route without scraping Markdown.

## Current Role

AIQL should provide:

- local-first text and visual review
- structured review results
- manifest-driven batch review
- visual review over screenshots, pages, and targeted sections
- explicit `review-gate` checks over published artifacts
- recurring failure harnesses for repeated review-packet failures
- downstream-agent read-efficiency measurement patterns
- public-safe examples and schemas that embedding repos can copy

AIQL should not become:

- a hosted eval dashboard
- a hosted observability platform
- a LangSmith, Braintrust, or Langfuse replacement
- a generic telemetry warehouse
- a workflow scheduler or durable execution runtime
- a tracker policy engine
- the owner of downstream approval, launch, routing, retention, or real-world action

## Build Vs Buy

AIQL should actively evaluate third-party eval and observability tools where they help portfolio goals. Candidate tools are examples until they are actually scouted or trialed.

Keep AIQL's durable value in local artifact contracts, structured review-result schemas, deterministic comparisons, public-safe review gates, and checked synthetic harnesses when hosted observability is too heavy, too external, too private, or not public-safe.

Do not add generic dashboard, trace store, model registry, prompt-management, or hosted experiment-tracking capability without a documented third-party scout or trial. If a third-party tool can own hosted traces, dashboards, experiment history, or broad observability better than this package, AIQL should integrate at the artifact boundary instead of rebuilding it.

## Portfolio Dogfood

Use AIQL to review portfolio artifacts when the packet is sanitized or caller-owned boundaries are explicit:

- WorkLoop outcomes and completion packets
- Agent Atlas context packs and generated context cards
- ContextWeave context packs or source-handle bridge packets
- venture concept briefs and buyer-claim packets
- SMARTSEER beta packets with explicit read-only, IP, legal, and data boundaries

AIQL reviews should stop at evidence quality, caveat preservation, structured findings, and gate compatibility. The embedding repo owns source retrieval, authority, approval, routing, publication, external communication, and tracker writes.

## Near-Term Roadmap

### WorkLoop Completion Review Contract

Define the smallest public-safe review packet shape for a completed WorkLoop slice:

- task objective
- changed artifacts or outcome summary
- verification evidence
- approval or lease notes when present
- known caveats
- caller-owned next action

AIQL should validate whether the packet is reviewable and whether findings cite evidence. WorkLoops should own execution state, lease recovery, approvals, and outcome archive semantics.

### Recurring Agent Failure Harness Usage

Continue using the recurring review-failure harness for repeated agent failure modes before live review runs:

- missing evidence handles
- stale deterministic inputs
- command noise
- verification-wrapper mismatch
- launch-evidence overclaim or omission
- bundle truncation
- unresolved source-audit evidence paths

Keep private packet assembly, tracker state, and domain policy outside AIQL unless a sanitized reusable fixture shape repeats.

### Context-Pack Quality Review Shape

Use AIQL's existing context-pack quality review examples as the generic review shape for Atlas and ContextWeave packs:

- scope fit
- missing or misleading source handles
- over-broad readiness language
- caveat preservation
- source freshness caveats
- saved-read and broad-search fallback evidence

Atlas owns repo navigation metadata. ContextWeave owns task-aware context resolution. AIQL owns only the review artifact contract and local gate shape.

### Third-Party Eval/Observability Scout

Run a focused scout before adding hosted or dashboard-like capability:

- question: which eval/observability platform should complement AIQL for hosted traces, experiment history, dashboards, or model-run analysis?
- candidate examples only: LangSmith, Braintrust, Langfuse, Promptfoo-like tools
- adoption threshold: a tool materially improves portfolio review evidence, traceability, or model comparison without forcing private data into a hosted surface that cannot be approved
- rejection threshold: integration cost, privacy risk, lock-in, or hosted workflow assumptions exceed the value for local-first review and gates
- integration boundary: export or ingest structured artifacts; do not move caller-owned approval policy into AIQL

## Principle Check

AIQL should make local review artifacts reliable enough that other portfolio repos can trust them. It should not become the place where the portfolio hides platform sprawl, hosted observability ambitions, or downstream authority decisions.
