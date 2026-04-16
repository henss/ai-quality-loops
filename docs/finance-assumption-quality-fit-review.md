# Finance Assumption-Quality Fit Review

This review records the OPS-846 fit decision for using AI Quality Loops as a reviewer of finance assumption quality over synthetic artifacts. It intentionally uses generic finance-analysis examples only. It does not include real account data, tax guidance, trading instructions, money movement, private repositories, company workflows, source paths, or customer details.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks whether AIQL can assess assumption quality in finance-like analysis while preserving analysis-only authority and caller-owned decisions. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` frames AIQL as a local review package that keeps policy decisions caller-owned.
- `docs/public-private-utility-boundary-review.md` warns that leakage often enters through examples, manifest names, paths, labels, redaction defaults, and convenience wrappers.
- `docs/context-pack-quality-checks-fit-review.md` keeps source selection, authority, freshness rules, and truth reconciliation outside AIQL.
- `docs/smartseer-safe-review-utility-boundary-inventory.md` identifies the existing high-stakes analysis rubric as the shared surface for evidence, uncertainty, authority-boundary, scenario, and recommendation-quality review.
- `HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT` already includes authority boundary, evidence chain, uncertainty handling, scenario coverage, recommendation traceability, adversarial review, and output discipline dimensions with synthetic fixtures.

## Fit Decision

AIQL is a good fit for reviewing the quality of assumptions in sanitized finance-analysis artifacts. It is not a fit for giving financial advice, selecting trades, moving money, interpreting tax obligations, handling real account data, or deciding whether a finance action should happen.

The safe shared role is a generic review layer over caller-provided text: identify unsupported assumptions, stale or missing evidence, single-scenario reasoning, overconfident conclusions, ambiguous authority, and recommendation steps that outrun supplied facts. The embedding system must own the domain policy, evidence sourcing, account context, approval thresholds, compliance posture, tax review, execution authority, and any downstream action.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Synthetic finance assumption-quality fixture | Allow as caller-provided input or docs recipe | The artifact can be fully synthetic and exercise existing high-stakes review dimensions without encoding real finance policy. |
| Finance-specific reviewer persona | Split | A private or embedding repo may provide domain wording and exclusions, but AIQL should not publish advice-like finance personas or default action thresholds. |
| High-stakes assumption rubric dimensions | Keep public as-is | The existing dimensions already cover the reusable review questions: evidence, uncertainty, scenarios, authority, traceability, adversarial checks, and output discipline. |
| Advice, tax, trading, liquidity, or execution policy | Keep outside AIQL | These are regulated or caller-specific decisions and can convert review findings into real-world impact. |
| Account, portfolio, customer, or company-specific examples | Reject from AIQL | Public examples must stay synthetic and must not teach private data shapes or operational decision rules. |
| New `finance-review` CLI or helper | Defer | Current `expert-review`, `batch-review`, structured results, and `review-gate` can run the check without a finance-branded public command. |

## Suggested Synthetic Review Shape

A safe fixture can be a short Markdown artifact with made-up evidence labels and no real entities:

- a synthetic finance-analysis summary with a stated assumption set
- evidence labels such as `Synthetic source A` and `Synthetic scenario table B`
- explicit missing facts, stale facts, or contradictory assumptions
- a reviewer instruction to assess assumption quality, not to recommend trades, tax treatment, or money movement
- a caller-owned note that any real-world action requires external approval outside AIQL

The reviewer should look for unsupported assumptions, hidden liquidity constraints, stale or absent evidence, scenario imbalance, overconfident language, and action-like phrasing that crosses from analysis into advice or execution.

## Extraction Question

Before moving any finance assumption-quality helper into AIQL, require a yes answer to this question:

Can the helper operate only on synthetic or sanitized caller-provided artifacts and generic high-stakes review contracts, while all finance facts, approval gates, tax posture, account context, risk thresholds, trading decisions, money movement, and compliance interpretation remain outside AIQL?

If the answer is no or uncertain, keep the helper in the embedding system and call AIQL only as the generic review engine.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral assumption-quality fixture wording for high-stakes analysis beyond finance. If repeated sanitized usage proves that gap, add a generic assumption-quality docs recipe or synthetic fixture first; do not add a finance-branded helper or action policy.

## Next Bounded Slice

Do not add a new public utility from OPS-846 alone. The next useful slice is a synthetic example manifest that runs `expert-review` or `batch-review` against a finance-like assumption-quality fixture if a downstream adopter repeats the setup. The value would be faster private experimentation with explicit analysis-only boundaries; the downside of waiting is low because current AIQL text review surfaces already support the check, while premature promotion risks turning finance policy into public package behavior.
