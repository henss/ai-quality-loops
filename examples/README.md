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
| Adjudicate two reviewer outputs for one target | `formatReviewerDisagreementAdjudication(...)` with `adjudicateReviewerDisagreement(...)` | Produces a compact, public-safe tie-break note from two structured review results without deciding approval or routing. |
| Run several repeatable reviews from one checked-in plan | `batch-review ./examples/webpage-vision-sweep.manifest.json` | Use the starter manifests below as copy-ready shapes. |
| Rerun only failed or named batch entries | `batch-review ./manifest.json --rerun-summary ./reviews/batch-summary.json --rerun-failed` | Keeps retry selection tied to the prior summary artifact. |
| Gate a local or CI check with explicit budgets | `review-gate --result ./reviews/result.json --max-high 0` | Use `--batch-summary` for a whole manifest run or `--batch-comparison` for explicit comparison-report delta budgets. |
| Compare two batch summary artifacts | `batch-review-compare ./reviews/previous-summary.json ./reviews/current-summary.json --json` | Feed the JSON report into `review-gate --batch-comparison` when CI should fail on caller-owned regression budgets. |
| Diff two same-fixture run ledgers | `batch-review-compare ./reviews/baseline-ledger.json ./reviews/candidate-ledger.json --run-ledger --json` | Use when repeated fixed-pack experiments need an explicit fixture-identity guard before comparing runs. |
| Summarize launch outcome evidence | `formatLaunchOutcomeEvidenceSummary(comparisonReport, { gate })` | Produces a compact, public-safe Markdown evidence note from sanitized comparison and optional gate results without deciding launch readiness. |
| Format a multi-model disagreement note | `formatMultiModelDisagreementReport(comparisonReport, { baselineLabel, candidateLabel })` | Produces a compact, public-safe Markdown triage template from two comparable batch-summary artifacts without deciding acceptance or routing. |
| Format a source-handle review-bundle digest | `formatSourceHandleReviewBundleDigest(summary, { maxEntryNotes })` with `./examples/synthetic-source-handle-review-bundle-summary.fixture.json` | Produces a compact, public-safe Markdown digest from one published batch-summary artifact without resolving source handles or deciding routing. |
| Probe image-review quality with a synthetic visual target | `vision-preview --manifest ./examples/synthetic-zone-vision-probe.manifest.json --entry-name "Synthetic zone overview"` | Uses generic zones only; keep real capture handling, thresholds, and routing caller-owned. |
| Review a sanitized social evidence packet | `batch-review ./examples/sanitized-social-evidence-review.manifest.json` | Use this as a text-review seam for redacted evidence packets; keep real sources, proof thresholds, and publication routing caller-owned. |
| Review a synthetic creative packet | `batch-review ./examples/synthetic-creative-review-packet.manifest.json` | Use this as a public-safe seam for caller-sanitized creative-review packets; keep asset selection, release approval, and brand authority caller-owned. |
| Review a synthetic reviewer-contract packet | `batch-review ./examples/synthetic-reviewer-contract-review.manifest.json` | Use this as a runnable public-safe contract example before wiring caller-owned target selection, severity budgets, and routing. |
| Review a synthetic venture concept brief | `batch-review ./examples/synthetic-venture-concept-brief-review.manifest.json` | Use this as a text-review seam for concept framing, evidence caveats, and readiness discipline; keep real proof thresholds, prioritization, spend, launch, and follow-up routing caller-owned. |
| Review a synthetic venture-to-buyer bridge packet | `batch-review ./examples/synthetic-venture-buyer-claim-review.manifest.json` | Use this as a document-first bridge seam for translating caveated venture-brief findings into one buyer-claim packet; keep sentence promotion rules, proof thresholds, outreach, and routing caller-owned. |
| Copy a minimal reviewer-contract starter kit | `./examples/reviewer-contract-starter-kit/` | Use this when an external contributor needs the smallest copy-ready manifest, context, and packet shape for a local-Ollama-first reviewer-contract setup. |
| Review a synthetic context pack quality packet | `batch-review ./examples/synthetic-context-pack-quality-review.manifest.json` | Use this as a public-safe seam for checking context-pack scope, evidence labels, caveats, and caller-owned boundaries. |
| Review a synthetic source-handle evidence pack | `batch-review ./examples/synthetic-source-handle-evidence-review.manifest.json` | Use this as a text-review seam for review-output packets that cite source handles without copying private truth; keep retrieval, storage, source interpretation, approval, and routing caller-owned. |
| Review a synthetic finance-signal routing packet | `batch-review ./examples/synthetic-finance-signal-routing-review.manifest.json` | Use this as a text-review seam for finance-sensitive source-backed requests that must preserve source handles and coarse signals only; keep raw records, thresholds, sponsor interpretation, approval, and routing caller-owned. |
| Review a synthetic blocker clarification packet | `batch-review ./examples/synthetic-blocker-clarification-review.manifest.json` | Use this as a text-review seam for caller-sanitized blocker disputes that need clarification questions and caveat discipline without deciding which side is correct or leaking product internals. |
| Review a synthetic private-domain bridge packet | `batch-review ./examples/synthetic-private-domain-bridge-review.manifest.json` | Use this as a text-review seam for one caller-owned bridge packet that exposes only opaque source handles, redacted evidence, and reusable findings; keep source resolution, priority, routing, and private semantics caller-owned. |
| Review a synthetic temporal anomaly packet | `batch-review ./examples/synthetic-temporal-anomaly-review.manifest.json` | Use this as a text-review seam for apartment-agnostic temporal anomaly claims over synthetic frames and generic zones only; keep occupancy inference, household action, and retention caller-owned. |
| Review synthetic buyer-claim caveats | `batch-review ./examples/synthetic-buyer-claim-caveat-review.manifest.json` | Use this as a text-review seam for buyer-interest claims; keep real sources, outreach, spend, account creation, proof thresholds, and routing caller-owned. |
| Review a synthetic recovery-safe finance cadence packet | `batch-review ./examples/synthetic-finance-cadence-review.manifest.json` | Use this as a text-review seam for analysis-only cadence reasoning; keep real records, thresholds, scheduling, approval, and action routing caller-owned. |
| Review synthetic household-inventory safety caveats | `batch-review ./examples/synthetic-grocy-public-safety-review.manifest.json` | Use this as a text-review seam for Grocy-style stock, consume-by, recipe, chore, and reorder artifacts; keep real exports, health interpretation, purchasing, disposal, alerting, and routing caller-owned. |
| Review a synthetic scheduling fallback packet | `batch-review ./examples/synthetic-scheduling-fallback-review.manifest.json` | Use this as a text-review seam for proposal-first fallback planning when one schedule source is unreachable; keep real source checks, writes, retries, approvals, and communications caller-owned. |
| Run a recurring review-failure eval pack | `batch-review ./examples/synthetic-recurring-review-failure-eval.manifest.json` | Use this as a public-safe rehearsal pack for repeated reviewer failures such as missing evidence handles, stale deterministic inputs, command noise, verification-wrapper mismatches, and launch-evidence regressions before another live run. |
| Inspect the sanitized process-failed peer-review corpus | `./examples/synthetic-process-failed-peer-review-regression-corpus.fixture.json` | Use when a consumer needs the reusable public-safe failure catalog, packet targets, and explicit extraction boundary behind the recurring review-failure eval pack. |
| Check source-handle redaction cases | `defineReviewSurfaceRedactions(...)` with `./examples/synthetic-source-handle-redaction-corpus.fixture.json` | Use when a consumer needs public-safe regression cases for caller-owned source-handle redaction across synthetic domains. |
| Check source-handle redaction mutations | `defineReviewSurfaceRedactions(...)` with `./examples/synthetic-source-handle-redaction-mutations.fixture.json` | Use when a consumer needs public-safe mutation coverage for caller-owned source-handle redaction across punctuation, lightweight markup, and structured-text variants. |
| Check caller-owned redaction rules | `defineReviewSurfaceRedactions(...)` with `./examples/synthetic-policy-redactions.fixture.json` | Use when a consumer needs a public-safe fixture for project-local redaction behavior without moving policy names into AIQL. |
| Validate a synthetic reviewer-contract fixture | `validateStructuredReviewResult(...)` with `./examples/synthetic-reviewer-contract-result.fixture.json` | Use when checking contract consumers against a public-safe fixture with generic evidence labels and caller-owned action boundaries. |
| Pilot a sanitized PR review candidate handoff | `renderLinearCandidateHandoffYaml(...)` and `validateLinearCandidateHandoffYaml(...)` with `./examples/synthetic-pr-review-result.fixture.json` | Use when checking a no-write candidate packet before a caller-owned workflow handles pull-request selection, merge policy, and tracker writes. |
| Gate a sponsor packet before backlog-candidate routing | `validateReviewResultSponsorPacketHandoff(...)` with `./examples/synthetic-pr-review-result.fixture.json` | Use when a wrapper needs an explicit decision, actionable candidate recommendations, and evidence labels before handing sponsor-facing review output to downstream triage. |
| Validate a sanitized structured-result fixture | `validateStructuredReviewResult(...)` with `./examples/synthetic-apartment-review-result.fixture.json` | Use when checking contract consumers against a fixture that contains no private home data. |
| Compare a synthetic temporal anomaly diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-temporal-anomaly-diff-before.fixture.json` and `./examples/synthetic-temporal-anomaly-diff-after.fixture.json` | Use when checking comparison consumers against a public-safe temporal anomaly improvement fixture with locked JSON and Markdown outputs. |
| Compare a synthetic structured-result golden diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-structured-result-golden-diff-before.fixture.json` and `./examples/synthetic-structured-result-golden-diff-after.fixture.json` | Use when checking comparison consumers against a public-safe improved diff fixture with locked JSON and Markdown outputs. |
| Compare a synthetic structured-result regression diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-structured-result-golden-regression-before.fixture.json` and `./examples/synthetic-structured-result-golden-regression-after.fixture.json` | Use when checking comparison consumers against a public-safe failing/regressed diff fixture with locked JSON and Markdown outputs. |
| Compare a compact review-output evidence diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-review-output-evidence-diff-before.fixture.json` and `./examples/synthetic-review-output-evidence-diff-after.fixture.json` | Use when checking consumers against an evidence-only delta with locked compact JSON and text outputs. |
| Compare a compact evidence-pack diff | `compareStructuredReviewResults(...)` with `./examples/synthetic-compact-evidence-pack-diff-before.fixture.json` and `./examples/synthetic-compact-evidence-pack-diff-after.fixture.json` | Use when checking public-safe review-contract consumers against a compact evidence-pack delta with locked compact JSON and text outputs. |
| Compare a synthetic multi-review disagreement pack | `batch-review-compare ./examples/synthetic-multi-review-disagreement-before-summary.fixture.json ./examples/synthetic-multi-review-disagreement-after-summary.fixture.json --json` | Use when checking consumers against improved, regressed, unchanged, recovered, added, and removed review entries in one public-safe calibration pack. |
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

### `synthetic-creative-review-packet.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized creative packet before a caller-owned workflow decides whether the creative direction is ready for a deeper review.

```bash
batch-review ./examples/synthetic-creative-review-packet.manifest.json
```

Typical edits:

- replace the synthetic target with a caller-owned packet that uses only sanitized evidence labels, qualitative reviewer notes, explicit caveats, and bounded next-step language
- keep or adapt the context file so review stays focused on claim proportionality, evidence-label clarity, caveat preservation, next-step hygiene, and caller-owned authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned creative reviewer when project policy needs one
- keep real asset files, private mood boards, release timing, brand approval, budget, and channel strategy outside `ai-quality-loops`

See `docs/sanitized-creative-review-rubric-pass-pilot.md` for the generic rubric-pass boundary and extraction test.

### `synthetic-reviewer-contract-review.manifest.json`

Use when you want a runnable text review over a synthetic packet that demonstrates the structured reviewer-contract boundary.

```bash
batch-review ./examples/synthetic-reviewer-contract-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a caller-sanitized packet that uses generic evidence labels
- keep or adapt the context file so review stays focused on claim support, caveats, structured-result compatibility, and authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real sources, tracker routing, severity budgets, approval, remediation ownership, publication, deployment, retention, and real-world action outside `ai-quality-loops`

### `synthetic-venture-concept-brief-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized venture concept brief before a caller-owned workflow decides whether the brief is fit for more evidence gathering or tighter caveats.

```bash
batch-review ./examples/synthetic-venture-concept-brief-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a sanitized concept brief from your repo
- keep or adapt the context file so review stays focused on support gaps, caveat preservation, concept-versus-readiness separation, and caller-owned authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real market claims, buyer records, prioritization, spend, launch timing, fundraising posture, publication approval, and follow-up routing outside `ai-quality-loops`

### `synthetic-venture-buyer-claim-review.manifest.json`

Use when you want one synthetic bridge packet that demonstrates how a caller may carry caveated venture-brief findings into a buyer-claim review without moving acceptance policy into the package.

```bash
batch-review ./examples/synthetic-venture-buyer-claim-review.manifest.json
```

Typical edits:

- replace the synthetic context target only in an embedding repo with a caller-sanitized bridge packet that keeps upstream findings, translation rules, and downstream claims explicit
- keep or adapt the context file so review stays focused on evidence-class preservation, rejected-claim carry-forward risk, caveat survival, and caller-owned authority boundaries
- switch `expert` or `promptLibraryPath` only if the embedding repo owns a more specific evidence reviewer persona
- keep source verification, buyer records, proof thresholds, outreach, spend, publication approval, and venture-specific routing outside `ai-quality-loops`

### `reviewer-contract-starter-kit/`

Use when you want the smallest copy-ready starter kit for a caller-owned reviewer-contract setup in another repo.

Typical edits:

- copy the four template files into your repo and rename them as needed
- replace the starter packet with caller-sanitized review content that uses generic evidence labels
- keep the validation script only if you want a minimal contract check before wiring a larger schema-validation stack
- keep repo-specific routing, approval, severity budgets, remediation ownership, retention, and real-world action outside `ai-quality-loops`
- prefer this starter kit before adding repo-local wrappers or automation

### `synthetic-context-pack-quality-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized context pack before a downstream reviewer consumes it.

```bash
batch-review ./examples/synthetic-context-pack-quality-review.manifest.json
```

Typical edits:

- replace the synthetic target with a caller-owned pack that uses only sanitized source handles, generic evidence labels, scoped claims, caveats, and continuation boundaries
- keep or adapt the context file so review stays focused on pack scope, evidence traceability, copied-truth risk, unsupported readiness claims, and caller-owned authority boundaries
- treat the omitted research-source audit and public-source list as fixture scope, not as proof that freshness, retrieval coverage, public-source selection, or approval already passed
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real source retrieval, source contents, private facts, source freshness, approval, retention, prioritization, routing, and domain interpretation outside `ai-quality-loops`

### `synthetic-source-handle-evidence-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized review-output evidence pack that references source handles instead of copying source contents.

```bash
batch-review ./examples/synthetic-source-handle-evidence-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a caller-owned packet that contains only source handles, sanitized labels, proposed downstream uses, and caveats
- keep or adapt the context file so review stays focused on source-handle traceability, copied-truth risk, shadow-storage risk, caveats, and authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned evidence reviewer when project policy needs one
- treat source handles as opaque caller-owned retrieval hints, not proof, package-owned storage keys, or a portable resolution schema
- keep real source retrieval, source contents, private facts, domain interpretation, retention policy, approval, implementation priority, and routing outside `ai-quality-loops`

### `synthetic-finance-signal-routing-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized finance-sensitive request packet before a caller-owned workflow decides whether to continue with a review, proposal, evidence summary, or blocker.

```bash
batch-review ./examples/synthetic-finance-signal-routing-review.manifest.json
```

Typical edits:

- replace the synthetic context target only in an embedding repo with a caller-sanitized packet that keeps finance evidence at bounded signal level
- keep or adapt the context file so review stays focused on source-handle semantics, bounded signal discipline, freshness caveats, and caller-owned routing boundaries
- if a downstream workflow later formats a sponsor memo or runs the sponsor-packet handoff gate, feed those helpers only the sanitized structured review result, not the raw finance packet or source handles as proof
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer only when the embedding repo owns that routing policy
- keep real balances, account identifiers, transaction detail, thresholds, sponsor policy, approval, scheduling, escalation, and routing outside `ai-quality-loops`

### `synthetic-source-handle-redaction-corpus.fixture.json`

Use when you want public-safe regression cases for caller-owned source-handle redaction before review-output packets leave a private boundary.

Typical edits:

- keep the corpus synthetic or replace it only inside an embedding repo with caller-sanitized handles
- use the fixture with `defineReviewSurfaceRedactions(...)` to check that source handles redact consistently in prose, Markdown rows, JSON-like snippets, and bracketed references
- keep real source names, source contents, source resolution, approval, retention, domain interpretation, and routing outside `ai-quality-loops`

### `synthetic-source-handle-redaction-mutations.fixture.json`

Use when you want public-safe mutation coverage for caller-owned source-handle redaction before review-output packets leave a private boundary.

Typical edits:

- keep the fixture synthetic or replace it only inside an embedding repo with caller-sanitized handles
- use the fixture with `defineReviewSurfaceRedactions(...)` to check that source handles still redact after punctuation, checklist, quote, blockquote, table, code, yaml-like, and shorthand mutations
- keep real source names, source contents, source resolution, approval, retention, domain interpretation, and routing outside `ai-quality-loops`

### `synthetic-buyer-claim-caveat-review.manifest.json`

Use when you want a generic text review over synthetic or caller-sanitized buyer-interest claims before a caller-owned workflow uses them in research notes, positioning drafts, or decision support.

```bash
batch-review ./examples/synthetic-buyer-claim-caveat-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a sanitized buyer-claim packet from your repo
- keep or adapt the context file so review stays focused on proportional claims, caveats, evidence traceability, and authority boundaries
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real buyer identities, company names, raw research notes, outreach, spend, account creation, proof thresholds, publication approval, and action routing outside `ai-quality-loops`

### `synthetic-finance-cadence-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized finance cadence packet before a caller-owned workflow decides whether to continue, slow, or pause a recurring review rhythm.

```bash
batch-review ./examples/synthetic-finance-cadence-review.manifest.json
```

Typical edits:

- replace the synthetic context target only in an embedding repo with a caller-sanitized cadence packet
- keep or adapt the context file so review stays focused on authority boundaries, evidence traceability, recovery caveats, adverse scenarios, and reversible next steps
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real financial records, entity names, threshold policy, approval, scheduling, alerts, spend decisions, and routing outside `ai-quality-loops`

### `synthetic-blocker-clarification-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized blocker dispute packet before a caller-owned workflow decides whether a concern remains a blocker, becomes a caveat, or needs deeper evidence.

```bash
batch-review ./examples/synthetic-blocker-clarification-review.manifest.json
```

Typical edits:

- replace the synthetic context target only in an embedding repo with a caller-sanitized packet that uses opaque source handles, bounded dispute notes, and explicit clarification questions
- keep or adapt the context file so review stays focused on scope compression, blocker-threshold overclaim, evidence-classification gaps, private-detail leak risk, and caller-owned authority boundaries
- switch `expert` or `promptLibraryPath` only if the embedding repo owns a more specific blocker-clarification reviewer persona
- keep source resolution, roadmap priority, release approval, escalation policy, outbound messaging, and any domain-specific dispute semantics outside `ai-quality-loops`

### `synthetic-private-domain-bridge-review.manifest.json`

Use when you want a generic text review over a synthetic or caller-sanitized bridge packet before a caller-owned adapter forwards reusable findings into a private workflow.

```bash
batch-review ./examples/synthetic-private-domain-bridge-review.manifest.json
```

Typical edits:

- replace the synthetic target only in an embedding repo with a caller-sanitized bridge packet that contains opaque source handles, bounded redacted evidence, and generic reusable findings
- keep or adapt the context file so review stays focused on source-handle opacity, redaction sufficiency, reusable-finding discipline, stable generic finding keys, and caller-owned authority boundaries
- switch `expert` or `promptLibraryPath` only if the embedding repo owns a more specific bridge-review persona
- keep real source resolution, private labels, priority, routing, approval, and adapter orchestration outside `ai-quality-loops`

### `synthetic-temporal-anomaly-review.manifest.json`

Use when you want a public-safe text review over a synthetic temporal anomaly packet before a caller-owned workflow decides whether a before/after anomaly lane deserves more evidence or a deeper local-Ollama pass.

```bash
batch-review ./examples/synthetic-temporal-anomaly-review.manifest.json
```

Typical edits:

- replace the synthetic target only inside an embedding repo with a caller-sanitized packet that uses generic frame labels, generic zone labels, and bounded follow-up language
- keep or adapt the context file so review stays focused on anomaly wording, evidence proportionality, occupancy-boundary discipline, and caller-owned action boundaries
- switch `expert` or `promptLibraryPath` only if the embedding repo owns a more specific anomaly reviewer persona
- keep raw images, room identities, resident inference, alerting, retention, and household action outside `ai-quality-loops`

### `synthetic-grocy-public-safety-review.manifest.json`

Use when you want a generic text review over synthetic household stock, consume-by, recipe, chore, and shopping-list artifacts before a caller-owned workflow uses similar records for public-safety-sensitive summaries.

```bash
batch-review ./examples/synthetic-grocy-public-safety-review.manifest.json
```

Typical edits:

- replace the synthetic context target only in an embedding repo with a caller-sanitized packet
- keep or adapt the context file so review stays focused on authority boundaries, evidence traceability, uncertainty, adverse scenarios, and reversible recommendations
- switch `expert` or `promptLibraryPath` to a caller-owned reviewer when project policy needs one
- keep real household members, addresses, product identifiers, device integrations, source freshness, food-safety interpretation, health decisions, purchasing, disposal, alerting, and routing outside `ai-quality-loops`

### `synthetic-scheduling-fallback-review.manifest.json`

Use when you want a generic text review over a proposal-first fallback packet before a caller-owned workflow decides whether to retry reads, draft recovery blocks, or touch a real scheduling surface.

```bash
batch-review ./examples/synthetic-scheduling-fallback-review.manifest.json
```

Typical edits:

- replace the synthetic context target with a sanitized fallback-planning packet from your repo
- keep the review focused on reachability claims, health uncertainty, caveat preservation, and no-write continuation boundaries
- switch `expert` or `promptLibraryPath` only if your embedding repo owns a scheduling reviewer persona
- keep real calendar data, planner health checks, retries, writes, notifications, approvals, and routing outside `ai-quality-loops`

### `synthetic-recurring-review-failure-eval.manifest.json`

Use when you want one public-safe recurring-failure rehearsal pack before another live packet run.

```bash
batch-review ./examples/synthetic-recurring-review-failure-eval.manifest.json --summary-output ./reviews/recurring-review-failure-eval/batch-summary.json
review-gate --batch-summary ./reviews/recurring-review-failure-eval/batch-summary.json --max-failed-reviews 0
```

Typical edits:

- keep the checked-in pack synthetic, or replace targets only inside an embedding repo with caller-sanitized recurring failure packets
- use `evaluateRecurringReviewFailureHarness(...)` with structured review-result artifacts when a wrapper needs a deterministic coverage check over recurring failure modes
- keep real tracker routing, command policy, source retrieval, approval, and execution authority outside `ai-quality-loops`

### `synthetic-process-failed-peer-review-regression-corpus.fixture.json`

Use when you want the curated public-safe catalog behind the recurring review-failure eval pack without inferring the reusable patterns from TypeScript or from private packet history.

Typical edits:

- keep the checked-in corpus synthetic, or replace packet paths only in an embedding repo with caller-sanitized recurrent failure packets
- use the corpus when a wrapper needs the case list, expected finding keys, signal groups, next-step actions, and minimum severity in one reviewable artifact
- keep bundle-specific packet assembly, tracker context, private evidence routing, approval thresholds, and real-world action outside `ai-quality-loops`

### `synthetic-policy-redactions.fixture.json`

Use when you want a public-safe fixture for caller-provided `extraRedactions` behavior without checking in private identifiers or project policy.

Typical edits:

- replace the synthetic policy identifiers only in your embedding repo, not in this package
- keep real policy names, thresholds, approval, routing, and domain interpretation outside `ai-quality-loops`
- use the fixture to validate that caller-provided redaction rules are threaded through prompts, logs, provenance, and structured results

### `synthetic-source-handle-review-bundle-summary.fixture.json`

Use when you want a public-safe summary artifact for consumers of `formatSourceHandleReviewBundleDigest(...)`.

Typical edits:

- keep the summary synthetic, or replace it only with a caller-sanitized published batch-review summary in an embedding repo
- compare the helper output to `synthetic-source-handle-review-bundle-digest.md` when a wrapper needs a stable compact digest shape
- rely on the digest's sanitized manifest artifact line and human entry names for compact audit reads instead of reopening the full summary JSON when the published artifact already exists
- keep packet assembly, source-handle resolution, source verification, thresholds, tracker context, and routing outside `ai-quality-loops`

### `synthetic-apartment-review-result.fixture.json`

Use when you want a structured review-result fixture for contract tests without checking in real household data.

Typical edits:

- do not replace the synthetic zone labels with real room names, resident details, coordinates, or capture paths
- keep any real screenshots, retention policy, and action routing in the embedding repo
- use it as a consumer fixture for `validateStructuredReviewResult(...)`, not as a runnable `batch-review` target

### `synthetic-temporal-anomaly-diff-*`

Use when you want a deterministic before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare` over an apartment-agnostic temporal anomaly lane.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results that refer to generic frames and generic zones
- compare the helper output to the `comparison` block in `synthetic-temporal-anomaly-diff.expected.json` or to `synthetic-temporal-anomaly-diff.expected.md` when a wrapper needs a stable anomaly-focused golden output shape with checked fixture provenance
- keep raw imagery, room identity, occupancy inference, alerting, retention, thresholds, approval, routing, and remediation policy in the embedding repo

### `synthetic-reviewer-contract-result.fixture.json`

Use when you want a public-safe reviewer-contract fixture for contract tests without checking in real tracker data, private paths, source names, or domain policy.

Typical edits:

- keep evidence labels synthetic or replace them only with caller-sanitized labels
- keep approval, routing, remediation, publication, and domain interpretation outside `ai-quality-loops`
- use `docs/reviewer-contract.md` as the boundary note before promoting another reviewer-contract example

### `synthetic-pr-review-result.fixture.json`

Use when you want a public-safe structured-result fixture for piloting a pull-request review candidate handoff without checking in real repository data, issue keys, branch names, source paths, account names, hostnames, reviewer assignments, or merge policy.

Typical edits:

- keep evidence labels synthetic or replace them only with caller-sanitized labels
- compare `renderLinearCandidateHandoffYaml(...)` output to `synthetic-pr-review-candidate-handoff.expected.yaml` when a wrapper needs a stable no-write candidate packet
- run `validateReviewResultSponsorPacketHandoff(...)` before rendering sponsor-facing packets when a wrapper needs a stricter source-quality gate over structured review results
- run `validateLinearCandidateHandoffYaml(...)` before downstream handoff when a wrapper needs a strict quality gate for the YAML contract
- keep pull-request selection, source retrieval, inline placement, reviewer assignment, merge authority, priority, tracker writes, and repository policy in the embedding repo

### `synthetic-structured-result-golden-diff-*.json`

Use when you want a deterministic before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare --json`.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results
- compare the helper output to the `comparison` block in `synthetic-structured-result-golden-diff.expected.json` or to `synthetic-structured-result-golden-diff.expected.md` when a wrapper needs a stable golden output shape with checked fixture provenance
- keep baseline selection, severity budgets, approval, routing, and remediation policy in the embedding repo

### `synthetic-structured-result-golden-regression-*.json`

Use when you want a deterministic failing/regressed before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare`.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results
- compare the helper output to the `comparison` block in `synthetic-structured-result-golden-regression.expected.json` or to `synthetic-structured-result-golden-regression.expected.md` when a wrapper needs a stable failing comparison shape with checked fixture provenance
- keep baseline selection, severity budgets, approval, routing, and remediation policy in the embedding repo

### `synthetic-review-output-evidence-diff-*`

Use when you want a deterministic evidence-only before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare`.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results that differ only in evidence labels
- compare the helper output to the `comparison` block in `synthetic-review-output-evidence-diff.expected.json` or to `synthetic-review-output-evidence-diff.expected.md` when a wrapper needs a stable compact diff shape with checked fixture provenance
- keep source-handle resolution, evidence ranking, approval thresholds, routing, and remediation policy in the embedding repo

### `synthetic-compact-evidence-pack-diff-*`

Use when you want a deterministic evidence-pack before/after fixture for consumers of `compareStructuredReviewResults(...)` or `review-compare`.

Typical edits:

- keep the before and after inputs synthetic, or replace them only with caller-sanitized structured review results that differ only in evidence labels
- compare the helper output to the `comparison` block in `synthetic-compact-evidence-pack-diff.expected.json` or to `synthetic-compact-evidence-pack-diff.expected.md` when a wrapper needs a stable compact diff shape with checked fixture provenance
- keep packet assembly, source-handle resolution, evidence ranking, approval thresholds, routing, and remediation policy in the embedding repo

### `synthetic-reviewer-disagreement-*.fixture.json`

Use when you want a deterministic two-reviewer fixture pair for consumers of `adjudicateReviewerDisagreement(...)` and `formatReviewerDisagreementAdjudication(...)`.

Typical edits:

- keep the reviewer labels synthetic, or replace them only with caller-sanitized labels in an embedding repo
- compare the helper output to `synthetic-reviewer-disagreement-adjudication.md` when a wrapper needs a stable sponsor-facing tie-break note
- keep reviewer assignment, same-run orchestration, thresholds, approval, routing, and remediation policy outside `ai-quality-loops`

Use `docs/reviewer-disagreement-explainer.md` when a consumer needs the artifact boundary and the remaining generic-vs-domain-specific extraction question in one place instead of inferring it from the fixture pair alone.

### `synthetic-multi-review-disagreement-*.json`

Use when you want a deterministic batch-summary fixture pair for consumers of `compareBatchReviewArtifactSummaries(...)`, `batch-review-compare --json`, or `review-gate --batch-comparison`.

Typical edits:

- keep the reviewer names and targets synthetic, or replace them only with caller-sanitized labels in an embedding repo
- compare the helper output to the `comparison` block in `synthetic-multi-review-disagreement-comparison.expected.json` when a wrapper needs stable calibration coverage for improved, regressed, unchanged, recovered, added, and removed review entries with checked fixture provenance
- keep real reviewer assignment, source contents, thresholds, approval, routing, and remediation policy outside `ai-quality-loops`

### `synthetic-multi-model-disagreement-report.md`

Use when you want a public-safe markdown example for consumers of `formatMultiModelDisagreementReport(...)`.

Typical edits:

- keep the baseline and candidate labels generic, or replace them only with caller-sanitized cohort labels
- use the template only when disagreement is already represented by two comparable published batch summaries
- keep same-run arbitration, reviewer clustering, acceptance policy, thresholds, tracker writes, and remediation routing outside `ai-quality-loops`

## Boundary notes

- The examples stay open-source-safe on purpose. They do not embed private domains, company personas, or project-specific output routing.
- The synthetic apartment fixture is contract-focused. It intentionally excludes real room names, image paths, coordinates, operator-specific facts, and release or publication instructions.
- The synthetic reviewer-contract fixture is contract-focused. It intentionally excludes real issue keys, source URLs, local paths, account names, approval policy, and routing instructions.
- The synthetic venture concept brief fixture is seam-focused. It intentionally excludes real founder identities, organization labels, buyer records, market-sizing claims, spend policy, launch timing, fundraising posture, approval, and routing instructions.
- The synthetic venture-to-buyer bridge fixture is seam-focused. It intentionally excludes real buyer identities, organization labels, source notes, proof thresholds, outreach policy, spend decisions, account creation, and venture-specific routing.
- The reviewer-contract starter kit is onboarding-focused. It intentionally excludes scaffold commands, hosted services, remote-provider policy, tracker adapters, issue keys, source URLs, local paths, account names, approval policy, and routing instructions.
- The synthetic PR review fixture is adapter-pilot focused. It intentionally excludes real repository names, issue keys, branch names, source paths, hostnames, account names, reviewer assignments, merge policy, priority, and tracker writes.
- The synthetic reviewer-contract manifest is runnable and intentionally excludes real target selection, issue keys, source URLs, local paths, account names, approval policy, routing, and retention decisions.
- The synthetic context-pack quality manifest is seam-focused. It intentionally excludes real source names, source contents, tracker keys, private paths, source freshness, domain facts, approval state, retention policy, implementation priority, and routing instructions.
- The synthetic context-pack quality manifest also leaves the research-source audit and any public-source list empty on purpose because the fixture uses opaque evidence labels only; callers must still own source freshness, retrieval coverage, public-source selection, and approval checks.
- The synthetic structured-result golden diff is comparison-focused. It intentionally excludes real source labels, tracker identifiers, local paths, account names, private facts, policy thresholds, and routing instructions.
- The synthetic structured-result golden regression diff is comparison-focused. It intentionally excludes real source labels, tracker identifiers, local paths, account names, private facts, policy thresholds, and routing instructions.
- The synthetic review-output evidence diff is comparison-focused. It intentionally excludes real source handles, source contents, tracker identifiers, local paths, approval thresholds, and routing instructions.
- The synthetic compact evidence-pack diff is comparison-focused. It intentionally excludes real source handles, source contents, tracker identifiers, local paths, approval thresholds, and routing instructions.
- The synthetic reviewer-disagreement fixtures are adjudication-focused. They intentionally exclude real reviewer identities, project names, source contents, approval thresholds, routing, and remediation policy.
- The synthetic multi-review disagreement fixtures are comparison-focused. They intentionally exclude real reviewer identities, project names, source contents, thresholds, approval, routing, and remediation policy.
- The synthetic multi-model disagreement report is template-focused. It intentionally excludes real model-routing policy, approval thresholds, tracker writes, reviewer identities, project names, and same-run arbitration logic.
- The synthetic social evidence fixture is seam-focused. It intentionally excludes real account names, audience facts, source identities, brand strategy, publication decisions, and business routing.
- The synthetic source-handle evidence fixture is seam-focused. It intentionally excludes real source names, source contents, tracker keys, private paths, domain facts, retention policy, approval status, implementation priority, and routing instructions.
- The synthetic source-handle redaction corpus is regression-focused. It intentionally excludes real source names, source contents, tracker keys, private paths, domain facts, retention policy, approval status, implementation priority, and routing instructions.
- The synthetic source-handle redaction mutation fixture is mutation-focused. It intentionally excludes real source names, source contents, tracker keys, private paths, domain facts, retention policy, approval status, implementation priority, and routing instructions.
- The synthetic source-handle review-bundle summary and digest are digest-focused. They intentionally exclude real source handles, source contents, tracker identifiers, local paths, thresholds, and routing instructions.
- The synthetic recurring review-failure eval pack is rehearsal-focused. It intentionally excludes real repo names, tracker identifiers, private verification policy, launch approval semantics, command authority, and live operator context.
- The synthetic buyer-claim caveat fixture is seam-focused. It intentionally excludes real buyer identities, company names, source notes, outreach plans, spend decisions, account creation, proof thresholds, and venture-specific routing.
- The synthetic finance cadence fixture is seam-focused. It intentionally excludes real financial records, entity names, threshold values, approval ownership, schedule state, alerting policy, spend decisions, and routing instructions.
- The synthetic blocker clarification fixture is seam-focused. It intentionally excludes real product names, repository state, issue keys, customer identities, implementation details, launch timing, approval owners, and domain-specific dispute policy.
- The synthetic private-domain bridge fixture is seam-focused. It intentionally excludes real source contents, repository names, tracker identifiers, account names, private implementation notes, project-specific priority, routing, and approval instructions.
- The synthetic Grocy public-safety fixture is seam-focused. It intentionally excludes real household members, addresses, product identifiers, device integrations, source freshness, food-safety interpretation, health decisions, purchasing, disposal, alerting, and routing.
- The synthetic policy redactions fixture is boundary-focused. It intentionally excludes real policy names, project identifiers, thresholds, approval, routing, and domain interpretation.
- If you need repo-specific naming, redaction rules, or CI budgets, add that in the embedding repo instead of widening the shared package surface.
- If a future workflow needs more than copied starter manifests and the generic CI recipe, the next extraction question is whether a scaffold command would stay generic enough for public maintenance.
