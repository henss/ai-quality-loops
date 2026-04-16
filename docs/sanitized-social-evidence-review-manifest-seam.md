# Sanitized Social Evidence Review Manifest Seam

This note records the OPS-903 fit decision for testing social evidence review through the existing AIQL manifest seam. It intentionally uses synthetic placeholders only: no artist assets, account data, campaign details, private strategy defaults, publication plans, upstream pull requests, company-specific source paths, or real customer facts.

## Classification

Packet output: implementation and proposal.

The implementation is documentation and examples only. The build-vs-buy scout was run from `D:/workspace/llm-orchestrator` before adding this public starter surface:

```text
pnpm solution:scout -- --category review --capability "sanitized social evidence review manifest starter" --boundary public
```

The scout returned `evaluate_registry_candidate` with `ai-quality-loops` as the registry candidate and no live npm candidate requested. That supports evaluating and extending the existing AIQL manifest surface rather than adding a new helper package, private wrapper, or external tool.

## Evidence Reviewed

- `README.md` describes `batch-review` as the shared manifest runner for caller-provided text, page, and screenshot targets.
- `examples/README.md` already frames starter manifests as copyable, generic shapes whose project policy stays in the embedding repo.
- `docs/capture-review-adapter-contract.md` keeps selection, raw artifacts, private labels, retention, and action routing caller-owned while AIQL runs generic reviews.
- `docs/public-facing-creative-support-fit-review.md` allows synthetic documentation recipes before any creative-specific public utility.
- `docs/adoption-pressure-matrix.md` suppresses new package surfaces until repeated generic adoption proves the same missing shape.
- `personas/universal.md` currently exposes only broad UI/UX and repository-efficiency personas, so this slice does not add a social-proof persona or encode project-specific review policy.

## Fit Decision

AIQL can safely host a sanitized social evidence manifest starter when the reviewed packet is caller-provided text and the manifest stays within the existing `BatchReviewManifest` contract. The package should not own source gathering, account identity, audience truth, proof thresholds, publication approval, brand positioning, or follow-up routing.

The safe shared role is a neutral review pass over sanitized evidence packets. The embedding repo owns the real evidence collection, redaction rules, domain context, reviewer persona, approval policy, and any actions taken from findings.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Synthetic social evidence context fixture | Allow | It demonstrates the manifest seam without real accounts, private assets, claims, source paths, or publication decisions. |
| Starter `batch-review` manifest | Allow | It reuses the existing manifest contract and output directories with generic names. |
| Social-proof persona, scoring rubric, or approval gate | Defer | Persona choice and proof thresholds can become brand, market, legal, or publication policy. Callers can provide a local prompt library when needed. |
| Evidence collection, account scraping, telemetry import, or scheduling | Reject for AIQL | These require private source access, retention policy, and domain-owned interpretation. |
| Automated publication, ticket creation, or business routing | Reject for AIQL | AIQL may emit review findings; callers decide what happens next. |

## Suggested Caller-Owned Use

Copy `examples/sanitized-social-evidence-review.manifest.json` into the embedding repo, replace the synthetic target with a redacted evidence packet, and set `expert` or `promptLibraryPath` to a caller-owned reviewer if the default UI/UX persona is too broad. Keep real account data, raw screenshots, audience assumptions, claim thresholds, publication approvals, and routing decisions outside AIQL.

The reviewer should check whether social proof claims are understandable, proportionate to the support shown, caveated when samples are small or qualitative, and separated from stronger claims such as revenue, conversion, endorsement, or broad market validation.

## Extraction Question

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral rubric wording for social evidence proportionality, caveat visibility, source traceability, and authority boundaries. If yes, add a documentation-only recipe or synthetic fixture first. If the missing piece is audience strategy, account-specific proof, publication approval, business thresholds, or action routing, keep it in the embedding repo.

## Next Bounded Slice

Use the new synthetic manifest in one caller-owned downstream adoption and record whether copied examples were enough. The value is lower repeated setup cost for review-loop work; the downside of waiting on a CLI/helper is low because `batch-review`, structured outputs, and caller-owned prompt libraries already cover the safe seam.
