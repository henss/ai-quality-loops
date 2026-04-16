# Public-Facing Creative Support Fit Review

This review records the OPS-829 fit decision for using AI Quality Loops to review public-facing creative support surfaces. It intentionally stays synthetic and domain-neutral: no private repositories, customer data, company workflows, real campaign facts, source paths, account details, or brand-specific implementation details are documented here.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks whether reusable review belongs in AIQL while preserving final creative and taste control. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` frames AIQL as a local review package that keeps policy decisions caller-owned.
- `docs/capture-review-adapter-contract.md` already defines a safe split where AIQL reviews generic text, page, or screenshot targets while embedding adapters own target selection, raw artifacts, domain semantics, retention, and action routing.
- `docs/adoption-pressure-matrix.md` suppresses new package surfaces until repeated generic adoption pressure proves the same shape.
- `docs/public-private-utility-boundary-review.md` warns that leakage often enters through examples, manifest names, paths, labels, redaction defaults, and convenience wrappers rather than through core review logic.
- `docs/context-pack-quality-checks-fit-review.md` and `docs/finance-assumption-quality-fit-review.md` show the current pattern for synthetic fit decisions: AIQL can review caller-provided artifacts, while domain facts, authority, thresholds, and downstream decisions remain outside the package.
- `docs/smartseer-safe-shared-review-seam-scout.md` identifies the existing safe seam as generic manifests, review runners, structured outputs, comparison reports, gates, redaction injection, and caller-owned policy.

## Fit Decision

AIQL is a good fit for reviewing sanitized public-facing creative support surfaces for clarity, consistency, evidence discipline, audience fit, accessibility, and authority-boundary issues. It is not a fit for deciding final creative direction, brand taste, publication readiness, legal posture, market positioning, or whether a public surface should ship.

The safe shared role is a generic second-pass reviewer over caller-provided artifacts: text copy, screenshots, rendered pages, structured review results, and before/after comparisons. The embedding system or human reviewer must own source selection, brand context, private audience facts, taste judgment, publication approval, escalation policy, and any action taken from findings.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Sanitized copy or page review target | Keep as caller-provided input | Existing `expert-review`, `vision-review`, and `batch-review` can review public-surface drafts without a new creative-specific package surface. |
| Generic creative-support rubric dimensions | Allow as caller-owned prompt wording or future docs recipe | Reusable dimensions include clarity, unsupported claims, audience mismatch, tone consistency, visual hierarchy, accessibility, and actionability. Caller-owned prompts must provide the actual brand, campaign, audience, and approval policy. |
| Final taste, brand direction, market positioning, publication approval, and escalation thresholds | Keep outside AIQL | These are creative and policy decisions, not generic review utilities. Embedding them would turn AIQL into an authority surface instead of a reviewer. |
| Public-surface examples | Allow only synthetic placeholders | Examples may use made-up pages, neutral copy, placeholder brands, and generic screenshots. They must not include private product launches, real audiences, customer facts, account data, or company-specific claims. |
| New `creative-review` CLI, persona, or helper | Defer | Existing review runners and manifests cover the generic need. A branded helper could encode subjective taste defaults or private publishing policy before repeated adoption proves a missing neutral shape. |
| Ticket creation, launch gating, scheduled checks, or automated publication decisions | Reject for AIQL | These cross into workflow policy, scheduling, routing, or real-world public action. AIQL may emit findings and structured summaries; callers decide what happens next. |

## Suggested Synthetic Review Shape

A safe caller-owned check can be represented as a normal text, page, screenshot, or batch review target. The reviewed artifact should include only sanitized or synthetic content:

- a draft headline, body copy, or page screenshot
- a neutral intended audience description
- explicit placeholder evidence labels for claims
- known constraints such as "do not assess final taste" or "flag clarity and support issues only"
- caller-owned redaction rules for any private labels before the artifact reaches AIQL

The reviewer should look for unclear claims, unsupported promises, audience mismatch, ambiguous call to action, visual or textual hierarchy problems, accessibility concerns, inconsistent tone, missing caveats, and any language that overstates authority. Findings should remain advisory and should not approve, reject, or rewrite the final creative direction.

## Extraction Question

Before moving any public-facing creative support helper into AIQL, require a yes answer to this question:

Can the helper operate only on sanitized caller-provided artifacts and published AIQL review contracts, while all brand context, private audience facts, taste judgment, final wording, publication approval, routing, escalation thresholds, and domain interpretation remain outside AIQL?

If the answer is no or uncertain, keep the helper in the embedding system and call AIQL only as a generic review engine.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral rubric wording for clarity, support, audience fit, accessibility, and authority boundaries. If repeated sanitized usage proves that gap, add a documentation-only recipe or synthetic fixture first; do not add a creative-branded CLI, final-taste persona, launch gate, scheduler, or action-routing helper.

## Next Bounded Slice

Do not add a new public utility from OPS-829 alone. The next useful slice is a synthetic documentation recipe that runs `expert-review`, `vision-review`, or `batch-review` against a placeholder public page or copy sample if downstream adoption repeats the setup. The value would be lower repeated review setup cost while preserving caller-owned creative control; the downside of waiting is low because current AIQL review surfaces already support the check, while premature promotion risks encoding subjective or private publishing policy as open-source defaults.
