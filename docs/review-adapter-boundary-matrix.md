# Review Adapter Boundary Matrix

This proposal records the OPS-975 boundary matrix for caller-owned review adapters that need to support private, company, household, and finance contexts without moving those domains into AIQL. It uses only generic labels, synthetic examples, and published AIQL surfaces. It does not document private workflows, company implementation details, household facts, account data, source paths, tracker semantics, or action policies.

## Classification

Packet output: proposal and artifact update.

No implementation path was chosen. The safe deliverable is a reusable read/emit/retain matrix for adapter reviews; it stops before implementing adapters, changing domain policies, adding workflow automation, or widening the public package surface. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Existing Public Surface

AIQL already exposes the generic pieces needed for safe adapter composition:

- `BatchReviewManifest` lets an embedding adapter describe review targets, output paths, personas, and optional context without inventing a wrapper format.
- `expert-review`, `vision-review`, and `batch-review` run caller-selected reviews over text, pages, or image targets.
- Structured review results, batch summaries, comparison reports, and `review-gate` provide generic findings and budget checks without deciding domain actions.
- Review-surface sanitizers and caller-provided `extraRedactions` summarize paths, URLs, contact links, data URIs, labels, and error details before they reach prompts, logs, or artifacts.
- `docs/capture-review-adapter-contract.md` keeps capture selection, raw artifacts, retention policy, private labels, domain semantics, and action routing in the embedding repo.
- The high-stakes analysis rubric covers generic authority-boundary, evidence, uncertainty, scenario, recommendation-traceability, adversarial-review, and output-discipline checks.

## Adapter Matrix

| Context | Adapter may read | Adapter may emit into AIQL | Adapter should retain outside AIQL | AIQL must not infer or own |
| --- | --- | --- | --- | --- |
| Private personal artifacts | Caller-selected sanitized text, screenshots, local files, or URLs that are safe for a generic reviewer. | Manifest entries with neutral names, sanitized target references, optional prompt-safe context, and structured review outputs. | Raw source files, private identifiers, notes, personal facts, collection rules, retention policy, and follow-up decisions. | Personal truth, identity semantics, approvals, scheduling, escalation, or whether any real-world action should happen. |
| Company or product artifacts | Caller-approved excerpts, UI captures, docs, review summaries, or synthetic fixtures that omit internal names and implementation details. | Generic text or vision review entries, sanitized provenance, severity rollups, comparison reports, and explicit caller-owned gate inputs. | Internal source paths, customer data, roadmap context, policy thresholds, product-specific routing, reviewer aliases, and issue or incident creation. | Company policy, customer impact, release readiness, legal posture, operational ownership, or private implementation shape. |
| Household or home artifacts | Synthetic zones or caller-sanitized captures where room names, resident details, coordinates, and private household facts are removed. | Zone-neutral manifest entries, generic findings, sanitized provenance descriptors, and contract fixtures that avoid real home data. | Raw photos, room maps, resident information, location data, household routines, retention or deletion choices, and action planning. | Household recommendations, safety decisions, resident behavior, real layout facts, or anything that routes work into a private home context. |
| Finance-like analysis | Sanitized or synthetic analysis text with made-up evidence labels, explicit caveats, and no live account or portfolio data. | Generic high-stakes review findings about evidence, assumptions, caveats, uncertainty, scenario balance, and authority-boundary language. | Account context, portfolio data, tax posture, compliance interpretation, source authority, risk thresholds, approval gates, and planning decisions. | Financial advice, trades, tax guidance, money movement, suitability, live data interpretation, or whether finance action should happen. |

## Boundary Rules

The embedding adapter owns read selection. It decides which artifacts are safe to inspect, sanitizes domain context before handoff, and supplies any project-local redaction rules. AIQL can then read the caller-provided target during the review run, but the package should not discover targets, crawl private systems, or collect domain evidence.

AIQL owns only the generic emit shape. The shared layer can emit review Markdown, structured findings, sanitized provenance, batch summaries, comparisons, and gate reports. It should not emit tickets, approval decisions, private labels, domain state transitions, retention records, or action plans.

The embedding adapter owns retention. Raw artifacts, domain context, redaction literals, private source names, policy thresholds, and decision records stay outside AIQL. Shared artifacts should remain review outputs, not a shadow inventory of private entities.

## Promotion Test

Before promoting any adapter helper into AIQL, require a yes answer to all of these questions:

- Can the helper operate on the existing manifest, review-result, summary, comparison, gate, and redaction contracts without a new domain wrapper?
- Are target selection, raw artifact handling, private naming, retention, policy thresholds, and action routing entirely caller-owned?
- Can examples use synthetic zones, placeholder sources, and neutral labels without teaching a private workflow?
- Would two unrelated adopters need the same behavior without sharing company, household, finance, or personal policy?
- Does the helper stop at review execution and reporting, without approving actions or interpreting findings as domain decisions?

If any answer is no or uncertain, keep the adapter in the embedding repo and use AIQL only as the generic review engine.

## Recommendation

Do not add a public adapter implementation for OPS-975. The current shared surface is enough for a caller-owned adapter to read safe inputs, emit manifest-shaped review work, and retain private or domain-specific material outside the package.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral documentation recipe for adapter review handoff, or whether the missing value is domain-specific target selection, retention, policy, and routing. The downside of waiting on code is low because current AIQL review contracts already support the safe composition; premature implementation risks turning one private boundary into public package behavior.
