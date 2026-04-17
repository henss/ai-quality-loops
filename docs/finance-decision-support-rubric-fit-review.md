# Finance Decision-Support Rubric Fit Review

This review records the OPS-928 fit decision for using AI Quality Loops to review sanitized finance-like decision-support analysis. It uses only synthetic examples and generic boundary language. It does not include live account data, portfolio reads, tax guidance, trading instructions, money movement, private repositories, company workflows, source paths, or customer details.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks whether the existing high-stakes analysis rubric is fit for sanitized finance-like decision-support review before outputs influence planning. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` frames AIQL as a local review package that keeps policy decisions caller-owned.
- `docs/public-private-utility-boundary-review.md` says domain-specific high-stakes review injections should split: AIQL can own synthetic contract shape and validation, while domain facts, thresholds, approval authority, and execution policy remain caller-owned.
- `docs/smartseer-safe-review-utility-boundary-inventory.md` identifies `HIGH_STAKES_ANALYSIS_REVIEW_RUBRIC_CONTRACT` as the public surface for authority boundaries, evidence chains, uncertainty handling, scenario coverage, recommendation traceability, adversarial review, and output discipline.
- `docs/finance-assumption-quality-fit-review.md` already records that AIQL can review assumption quality in sanitized finance-analysis artifacts, but must not provide financial advice, select trades, move money, interpret tax obligations, handle real account data, or decide whether finance action should happen.
- `src/contracts/high-stakes-analysis-review-rubric-contract.test.ts` asserts that finance-domain policy terms do not enter the shared rubric contract and that private domain rules can be layered as caller-owned injections.

## Fit Decision

AIQL is a good fit for reviewing sanitized finance-like decision-support text for caveat quality, source traceability, uncertainty, scenario balance, recommendation discipline, and authority-boundary language. It is not a fit for making financial decisions, selecting investments, approving trades, moving money, reading live portfolios, interpreting tax or compliance obligations, or setting private risk thresholds.

The existing high-stakes rubric is sufficient for OPS-928 without adding a finance-specific public helper. The reusable part is the review shape: ask whether material claims are evidence-backed, caveats are visible, conclusions remain conditional, adverse cases are represented, and recommendations do not cross from analysis into execution. The embedding system must own all real finance facts, account context, source authority, approval gates, policy thresholds, compliance posture, and downstream action.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Sanitized finance-like decision-support artifact | Allow as caller-provided input | Synthetic or sanitized text can exercise the generic high-stakes rubric without encoding real finance policy. |
| Caveat and source-traceability review | Keep public through the existing rubric | `evidence-chain`, `uncertainty-handling`, `recommendation-traceability`, and `output-discipline` already cover the reusable review questions. |
| Finance decision, trade, tax, or money-movement policy | Keep outside AIQL | These are caller-owned and can create real-world impact if embedded as package behavior. |
| Live portfolio, account, customer, or company-specific examples | Reject from AIQL | Public examples must not teach private data shapes, source paths, operational policy, or real entity semantics. |
| New finance decision-support CLI, persona, or helper | Defer | Current `expert-review`, `batch-review`, structured results, and `review-gate` can run sanitized checks without a finance-branded package surface. |

## Suggested Synthetic Review Shape

A safe review target can be a short Markdown artifact with made-up sources and no real entities:

- a synthetic decision-support summary with explicitly labeled evidence snippets
- one or more missing, stale, or contradictory source notes
- adverse, neutral, and favorable scenario statements
- a proposed planning conclusion phrased as analysis-only
- reviewer instructions to assess caveats, traceability, uncertainty, and authority boundaries, not to recommend trades, tax treatment, or money movement
- a caller-owned note that any real-world action requires approval outside AIQL

The reviewer should flag unsupported claims, hidden assumptions, stale or absent evidence, single-scenario reasoning, overconfident or action-like language, weak caveats, and recommendations that outrun the supplied evidence.

## Extraction Question

Before moving any finance decision-support helper into AIQL, require a yes answer to this question:

Can the helper operate only on synthetic or sanitized caller-provided artifacts and generic high-stakes review contracts, while all finance facts, live portfolio access, approval gates, tax posture, account context, risk thresholds, trading decisions, money movement, compliance interpretation, and downstream planning authority remain outside AIQL?

If the answer is no or uncertain, keep the helper in the embedding system and call AIQL only as the generic review engine.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral review wording for high-stakes decision-support caveats and source traceability beyond finance. If repeated sanitized usage proves that gap, add a domain-neutral recipe or synthetic fixture first; do not add a finance-branded helper, persona, action threshold, or execution policy.

## Next Bounded Slice

Do not add a new public utility from OPS-928 alone. The next useful slice is a synthetic example manifest for a generic high-stakes decision-support review if a downstream adopter repeats the setup. The value would be faster private experimentation with explicit caveat and traceability checks; the downside of waiting is low because current AIQL text review surfaces already support the workflow, while premature promotion risks turning finance policy into public package behavior.
